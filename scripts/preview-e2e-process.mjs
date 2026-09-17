import { spawn } from 'node:child_process';

const commandTimeoutMs = 2_000;
const finalExitTimeoutMs = 2_000;
const gracefulExitTimeoutMs = 5_000;
const processPollIntervalMs = 20;

function withTimeout(promise, timeoutMs, label) {
  let timeout;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    }),
  ]).finally(() => clearTimeout(timeout));
}

export function createSignalController({ onFirstSignal = () => {}, target = process } = {}) {
  let installed = false;
  let firstSignal;
  let resolveSignal;
  const signalPromise = new Promise((resolve) => {
    resolveSignal = resolve;
  });
  const handleSignal = (signal) => {
    if (firstSignal) return;
    firstSignal = signal;
    try {
      onFirstSignal(signal);
    } finally {
      resolveSignal(signal);
    }
  };
  const handleSigint = () => handleSignal('SIGINT');
  const handleSigterm = () => handleSignal('SIGTERM');

  return {
    install() {
      if (installed) return;
      installed = true;
      target.on('SIGINT', handleSigint);
      target.on('SIGTERM', handleSigterm);
    },
    remove() {
      if (!installed) return;
      installed = false;
      target.off('SIGINT', handleSigint);
      target.off('SIGTERM', handleSigterm);
    },
    get signal() {
      return firstSignal;
    },
    signalPromise,
  };
}

export function findSingleAddedListener(before, after) {
  const unmatchedBefore = [...before];
  const added = [];
  for (const listener of after) {
    const existingIndex = unmatchedBefore.indexOf(listener);
    if (existingIndex >= 0) unmatchedBefore.splice(existingIndex, 1);
    else added.push(listener);
  }
  if (added.length !== 1) {
    throw new Error(`Expected Vite preview to add exactly one SIGTERM listener; found ${added.length}`);
  }
  return added[0];
}

export function parsePreviewPort(value) {
  if (value === undefined) return 4174;
  const port = Number(value);
  if (!/^\d+$/u.test(value) || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`PREVIEW_PORT must be an integer from 1 to 65535; received ${JSON.stringify(value)}`);
  }
  return port;
}

export function waitForExit(child) {
  return new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolveExit({ code, signal }));
  });
}

export function isRunning(child) {
  return child.pid !== undefined && child.exitCode === null && child.signalCode === null;
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForPidsToExit(pids, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  let remaining = pids.filter(isProcessAlive);
  while (remaining.length > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, processPollIntervalMs));
    remaining = pids.filter(isProcessAlive);
  }
  if (remaining.length > 0) {
    throw new Error(`${label}; processes still alive: ${remaining.join(', ')}`);
  }
}

async function waitForCommand(child, label) {
  const exitPromise = waitForExit(child);
  try {
    return await withTimeout(exitPromise, commandTimeoutMs, label);
  } catch (error) {
    if (isRunning(child)) child.kill('SIGKILL');
    try {
      await withTimeout(exitPromise, finalExitTimeoutMs, `${label} after SIGKILL`);
    } catch (killError) {
      throw new AggregateError([error, killError], `${label} failed and could not be stopped`);
    }
    throw error;
  }
}

async function snapshotWindowsProcesses() {
  const command = [
    '$ErrorActionPreference = "Stop"',
    'Get-Process | ForEach-Object {',
    '  try {',
    '    $parentProcess = $_.Parent',
    '    if ($null -ne $parentProcess) { Write-Output "$($_.Id),$($parentProcess.Id)" }',
    '  } catch {}',
    '}',
  ].join('; ');
  const powershell = spawn(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', command],
    { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
  );
  let stdout = '';
  let stderr = '';
  powershell.stdout.setEncoding('utf8');
  powershell.stderr.setEncoding('utf8');
  powershell.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  powershell.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const outcome = await waitForCommand(powershell, 'PowerShell process enumeration');
  if (outcome.signal || outcome.code !== 0) {
    throw new Error(
      `PowerShell process enumeration failed (${outcome.signal ?? outcome.code}): ${stderr.trim()}`,
    );
  }
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim().split(',').map(Number))
    .filter(
      ([pid, parentPid]) =>
        Number.isInteger(pid) && pid > 0 && Number.isInteger(parentPid) && parentPid > 0,
    )
    .map(([pid, parentPid]) => ({ parentPid, pid }));
}

function descendantsOf(processes, rootPid) {
  const descendants = [];
  const queue = [{ depth: 0, pid: rootPid }];
  while (queue.length > 0) {
    const parent = queue.shift();
    for (const processInfo of processes) {
      if (processInfo.parentPid === parent.pid) {
        const descendant = { depth: parent.depth + 1, pid: processInfo.pid };
        descendants.push(descendant);
        queue.push(descendant);
      }
    }
  }
  return descendants;
}

async function terminateCapturedWindowsTree(
  child,
  exitPromise,
  taskkillFailure,
  initialDescendants,
) {
  let descendants = initialDescendants;
  try {
    if (isRunning(child)) {
      const latestDescendants = descendantsOf(await snapshotWindowsProcesses(), child.pid);
      const descendantsByPid = new Map(
        [...initialDescendants, ...latestDescendants].map((processInfo) => [
          processInfo.pid,
          processInfo,
        ]),
      );
      descendants = [...descendantsByPid.values()];
    }
  } catch (error) {
    throw new AggregateError(
      [taskkillFailure, error],
      `Could not enumerate descendants of Playwright process ${child.pid}`,
    );
  }

  const terminationErrors = [];
  for (const { pid } of descendants.toSorted((left, right) => right.depth - left.depth)) {
    if (!isProcessAlive(pid)) continue;
    try {
      process.kill(pid, 'SIGKILL');
    } catch (error) {
      if (error?.code !== 'ESRCH') terminationErrors.push(error);
    }
  }
  if (isProcessAlive(child.pid)) {
    try {
      process.kill(child.pid, 'SIGKILL');
    } catch (error) {
      if (error?.code !== 'ESRCH') terminationErrors.push(error);
    }
  }

  const capturedPids = [...descendants.map(({ pid }) => pid), child.pid];
  try {
    await waitForPidsToExit(
      capturedPids,
      finalExitTimeoutMs,
      `Timed out terminating Playwright process tree ${child.pid}`,
    );
    await withTimeout(
      exitPromise,
      finalExitTimeoutMs,
      `Playwright root process ${child.pid} exit after direct termination`,
    );
  } catch (error) {
    terminationErrors.push(error);
  }
  if (terminationErrors.length > 0) {
    throw new AggregateError(
      [taskkillFailure, ...terminationErrors],
      `Could not guarantee cleanup of Playwright process tree ${child.pid}`,
    );
  }
}

function signalProcessGroup(child, signal) {
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error?.code === 'ESRCH') return;
    if (!child.kill(signal)) throw error;
  }
}

export async function terminateProcessTree(child, signal, exitPromise) {
  if (!isRunning(child)) return;

  if (process.platform === 'win32') {
    const initialProcesses = await snapshotWindowsProcesses();
    const initialDescendants = descendantsOf(initialProcesses, child.pid);
    const capturedPids = [
      ...initialDescendants.map(({ pid }) => pid),
      child.pid,
    ];
    const taskkill = spawn('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    let taskkillFailure;
    try {
      const outcome = await waitForCommand(taskkill, 'taskkill');
      if (outcome.signal || outcome.code !== 0) {
        taskkillFailure = new Error(`taskkill failed with ${outcome.signal ?? `exit code ${outcome.code}`}`);
      }
    } catch (error) {
      taskkillFailure = error;
    }
    if (taskkillFailure) {
      await terminateCapturedWindowsTree(
        child,
        exitPromise,
        taskkillFailure,
        initialDescendants,
      );
      return;
    }
    await waitForPidsToExit(
      capturedPids,
      finalExitTimeoutMs,
      `Timed out waiting for taskkill to stop Playwright process tree ${child.pid}`,
    );
    await withTimeout(
      exitPromise,
      finalExitTimeoutMs,
      `Playwright root process ${child.pid} exit after taskkill`,
    );
    return;
  }

  signalProcessGroup(child, signal);
  try {
    await withTimeout(exitPromise, gracefulExitTimeoutMs, `Playwright process group ${child.pid} exit`);
  } catch (gracefulError) {
    signalProcessGroup(child, 'SIGKILL');
    try {
      await withTimeout(
        exitPromise,
        finalExitTimeoutMs,
        `Playwright process group ${child.pid} exit after SIGKILL`,
      );
    } catch (killError) {
      throw new AggregateError(
        [gracefulError, killError],
        `Could not terminate Playwright process group ${child.pid}`,
      );
    }
  }
}
