import { spawn } from 'node:child_process';

const gracefulExitTimeoutMs = 5_000;

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

async function waitForGracefulExit(exitPromise) {
  let timeout;
  const timedOut = Symbol('timed out');
  try {
    return await Promise.race([
      exitPromise,
      new Promise((resolve) => {
        timeout = setTimeout(() => resolve(timedOut), gracefulExitTimeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
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
    const taskkill = spawn('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    const outcome = await waitForExit(taskkill);
    if (outcome.signal) throw new Error(`taskkill exited after signal ${outcome.signal}`);
    if (outcome.code !== 0 && isRunning(child)) {
      child.kill('SIGKILL');
      await exitPromise;
      throw new Error(`taskkill failed with exit code ${outcome.code}`);
    }
    await exitPromise;
    return;
  }

  signalProcessGroup(child, signal);
  const outcome = await waitForGracefulExit(exitPromise);
  if (typeof outcome === 'symbol') {
    signalProcessGroup(child, 'SIGKILL');
    await exitPromise;
  }
}
