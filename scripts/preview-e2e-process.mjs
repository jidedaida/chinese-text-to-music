import { spawn } from 'node:child_process';

const commandTimeoutMs = 2_000;
const finalExitTimeoutMs = 2_000;
const gracefulExitTimeoutMs = 5_000;
const processSnapshotTimeoutMs = 10_000;
const windowsTreeCleanupTimeoutMs = processSnapshotTimeoutMs * 2 + finalExitTimeoutMs;
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

export function findSingleAddedListener(before, after, label = 'added') {
  const unmatchedBefore = [...before];
  const added = [];
  for (const listener of after) {
    const existingIndex = unmatchedBefore.indexOf(listener);
    if (existingIndex >= 0) unmatchedBefore.splice(existingIndex, 1);
    else added.push(listener);
  }
  if (added.length !== 1) {
    throw new Error(`Expected exactly one ${label} listener; found ${added.length}`);
  }
  return added[0];
}

export function removeViteExitListeners({
  isCI,
  processTarget,
  sigtermBefore,
  stdinEndBefore,
  stdinTarget,
}) {
  const sigtermListener = findSingleAddedListener(
    sigtermBefore,
    processTarget.listeners('SIGTERM'),
    'Vite SIGTERM',
  );
  let stdinEndListener;
  if (!isCI) {
    stdinEndListener = findSingleAddedListener(
      stdinEndBefore,
      stdinTarget.listeners('end'),
      'Vite stdin end',
    );
    if (stdinEndListener !== sigtermListener) {
      throw new Error('Expected Vite SIGTERM and stdin end listeners to be the same callback');
    }
  }

  processTarget.off('SIGTERM', sigtermListener);
  if (stdinEndListener) stdinTarget.off('end', stdinEndListener);
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
  } catch (error) {
    return error?.code === 'EPERM';
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

async function waitForCommand(child, label, timeoutMs = commandTimeoutMs) {
  const exitPromise = waitForExit(child);
  try {
    return await withTimeout(exitPromise, timeoutMs, label);
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

export async function snapshotWindowsProcesses({ timeoutMs = processSnapshotTimeoutMs } = {}) {
  const command = [
    "$samples = (Get-Counter '\\Process(*)\\ID Process','\\Process(*)\\Creating Process ID' -ErrorAction SilentlyContinue).CounterSamples",
    '$groups = $samples | Group-Object InstanceName',
    'foreach ($group in $groups) {',
    "  $pidSample = $group.Group | Where-Object { $_.Path -like '*\\ID Process' } | Select-Object -First 1",
    "  $parentSample = $group.Group | Where-Object { $_.Path -like '*\\Creating Process ID' } | Select-Object -First 1",
    '  if ($null -ne $pidSample -and $null -ne $parentSample) {',
    '    Write-Output "$([int]$pidSample.CookedValue),$([int]$parentSample.CookedValue)"',
    '  }',
    '}',
  ].join('; ');
  const systemRoot = process.env.SystemRoot ?? process.env.SYSTEMROOT;
  const powershell = spawn(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', command],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env: systemRoot
        ? {
            ...process.env,
            PSModulePath: `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\Modules`,
          }
        : process.env,
    },
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
  const outcome = await waitForCommand(
    powershell,
    'PowerShell Get-Counter process enumeration',
    timeoutMs,
  );
  if (outcome.signal || outcome.code !== 0) {
    throw new Error(
      `PowerShell Get-Counter process enumeration failed (${outcome.signal ?? outcome.code}): ${stderr.trim()}`,
    );
  }
  const relationships = stdout
    .split(/\r?\n/u)
    .map((line) => line.trim().split(',').map(Number))
    .filter(
      ([pid, parentPid]) =>
        Number.isInteger(pid) && pid > 0 && Number.isInteger(parentPid) && parentPid > 0,
    )
    .map(([pid, parentPid]) => ({ parentPid, pid }));
  if (relationships.length === 0) {
    throw new Error('PowerShell Get-Counter process enumeration returned zero relationships');
  }
  return relationships;
}

async function runTaskkillCommand(rootPid) {
  const taskkill = spawn('taskkill.exe', ['/pid', String(rootPid), '/T', '/F'], {
    stdio: 'ignore',
    windowsHide: true,
  });
  const outcome = await waitForCommand(taskkill, 'taskkill');
  if (outcome.signal || outcome.code !== 0) {
    throw new Error(`taskkill failed with ${outcome.signal ?? `exit code ${outcome.code}`}`);
  }
}

function descendantsOfCaptured(processes, captured) {
  const descendants = [];
  const queue = [...captured.values()];
  const seen = new Set(queue.map(({ pid }) => pid));
  while (queue.length > 0) {
    const parent = queue.shift();
    for (const processInfo of processes) {
      if (processInfo.parentPid === parent.pid && !seen.has(processInfo.pid)) {
        const descendant = { depth: parent.depth + 1, pid: processInfo.pid };
        descendants.push(descendant);
        seen.add(descendant.pid);
        queue.push(descendant);
      }
    }
  }
  return descendants;
}

function mergeCapturedDescendants(captured, descendants) {
  for (const descendant of descendants) {
    const existing = captured.get(descendant.pid);
    if (!existing || descendant.depth < existing.depth) {
      captured.set(descendant.pid, descendant);
    }
  }
}

async function terminateCapturedWindowsTree(
  child,
  exitPromise,
  taskkillFailure,
  initialDescendants,
  snapshotProcesses,
) {
  const captured = new Map([[child.pid, { depth: 0, pid: child.pid }]]);
  mergeCapturedDescendants(captured, initialDescendants);
  const terminationErrors = [];
  const cleanupDeadline = Date.now() + windowsTreeCleanupTimeoutMs;

  const refresh = async () => {
    const remainingMs = cleanupDeadline - Date.now();
    if (remainingMs <= 0) {
      throw new Error(`Timed out refreshing Playwright process tree ${child.pid}`);
    }
    const processes = await withTimeout(
      snapshotProcesses({ timeoutMs: Math.min(processSnapshotTimeoutMs, remainingMs) }),
      remainingMs,
      `Windows process refresh for Playwright process tree ${child.pid}`,
    );
    mergeCapturedDescendants(captured, descendantsOfCaptured(processes, captured));
  };

  const killCaptured = () => {
    const killErrors = [];
    for (const { pid } of [...captured.values()].toSorted(
      (left, right) => right.depth - left.depth,
    )) {
      if (!isProcessAlive(pid)) continue;
      try {
        process.kill(pid, 'SIGKILL');
      } catch (error) {
        if (error?.code !== 'ESRCH') killErrors.push(error);
      }
    }
    return killErrors;
  };

  try {
    await refresh();
    while (Date.now() < cleanupDeadline) {
      terminationErrors.push(...killCaptured());
      const capturedPids = [...captured.keys()];
      if (capturedPids.every((pid) => !isProcessAlive(pid))) {
        await withTimeout(
          exitPromise,
          Math.min(finalExitTimeoutMs, Math.max(1, cleanupDeadline - Date.now())),
          `Playwright root process ${child.pid} exit after direct termination`,
        );
        break;
      }
      await refresh();
    }
    const remainingPids = [...captured.keys()].filter(isProcessAlive);
    if (remainingPids.length > 0) {
      throw new Error(
        `Timed out terminating Playwright process tree ${child.pid}; processes still alive: ${remainingPids.join(', ')}`,
      );
    }
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

export async function terminateProcessTree(
  child,
  signal,
  exitPromise,
  { runTaskkill = runTaskkillCommand, snapshotProcesses = snapshotWindowsProcesses } = {},
) {
  if (!isRunning(child)) return;

  if (process.platform === 'win32') {
    const initialProcesses = await snapshotProcesses();
    const initialCaptured = new Map([[child.pid, { depth: 0, pid: child.pid }]]);
    const initialDescendants = descendantsOfCaptured(initialProcesses, initialCaptured);
    const capturedPids = [
      ...initialDescendants.map(({ pid }) => pid),
      child.pid,
    ];
    let taskkillFailure;
    try {
      await runTaskkill(child.pid);
    } catch (error) {
      taskkillFailure = error;
    }
    if (taskkillFailure) {
      await terminateCapturedWindowsTree(
        child,
        exitPromise,
        taskkillFailure,
        initialDescendants,
        snapshotProcesses,
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
