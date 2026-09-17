import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import {
  createSignalController,
  findSingleAddedListener,
  isRunning,
  parsePreviewPort,
  removeViteExitListeners,
  snapshotWindowsProcesses,
  terminateProcessTree,
  waitForExit,
} from './preview-e2e-process.mjs';

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForProcessExit(pid, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (isProcessAlive(pid)) {
    if (Date.now() >= deadline) throw new Error(`Process ${pid} did not exit within ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

test('validates preview port overrides', () => {
  assert.equal(parsePreviewPort(undefined), 4174);
  assert.equal(parsePreviewPort('4175'), 4175);
  for (const value of ['', '0', '65536', '4.5', 'port']) {
    assert.throws(() => parsePreviewPort(value), /PREVIEW_PORT must be an integer/u);
  }
});

test('keeps signal handlers installed while ignoring duplicate signals', async () => {
  const target = new EventEmitter();
  const cleanupSignals = [];
  const controller = createSignalController({
    onFirstSignal: (signal) => cleanupSignals.push(signal),
    target,
  });
  controller.install();

  target.emit('SIGTERM');
  target.emit('SIGINT');

  assert.deepEqual(cleanupSignals, ['SIGTERM']);
  assert.equal(await controller.signalPromise, 'SIGTERM');
  assert.equal(target.listenerCount('SIGINT'), 1);
  assert.equal(target.listenerCount('SIGTERM'), 1);

  controller.remove();
  assert.equal(target.listenerCount('SIGINT'), 0);
  assert.equal(target.listenerCount('SIGTERM'), 0);
});

test('removes only the paired Vite process and stdin exit listeners', () => {
  const processTarget = new EventEmitter();
  const stdinTarget = new EventEmitter();
  let existingCalls = 0;
  let viteCalls = 0;
  const existingListener = () => {
    existingCalls += 1;
  };
  const viteListener = () => {
    viteCalls += 1;
  };
  processTarget.on('SIGTERM', existingListener);
  stdinTarget.on('end', existingListener);
  const sigtermBefore = processTarget.listeners('SIGTERM');
  const stdinEndBefore = stdinTarget.listeners('end');
  processTarget.on('SIGTERM', viteListener);
  stdinTarget.on('end', viteListener);

  removeViteExitListeners({
    isCI: false,
    processTarget,
    sigtermBefore,
    stdinEndBefore,
    stdinTarget,
  });

  processTarget.emit('SIGTERM');
  stdinTarget.emit('end');
  assert.equal(existingCalls, 2);
  assert.equal(viteCalls, 0);
  assert.deepEqual(processTarget.listeners('SIGTERM'), [existingListener]);
  assert.deepEqual(stdinTarget.listeners('end'), [existingListener]);
  assert.throws(
    () => findSingleAddedListener(sigtermBefore, [...sigtermBefore, viteListener, () => {}], 'test'),
    /exactly one test listener/u,
  );
});

test('CI listener cleanup removes only the Vite SIGTERM listener', () => {
  const processTarget = new EventEmitter();
  const stdinTarget = new EventEmitter();
  const existingSigterm = () => {};
  const existingEnd = () => {};
  const viteListener = () => {};
  processTarget.on('SIGTERM', existingSigterm);
  stdinTarget.on('end', existingEnd);
  const sigtermBefore = processTarget.listeners('SIGTERM');
  const stdinEndBefore = stdinTarget.listeners('end');
  processTarget.on('SIGTERM', viteListener);

  removeViteExitListeners({
    isCI: true,
    processTarget,
    sigtermBefore,
    stdinEndBefore,
    stdinTarget,
  });

  assert.deepEqual(processTarget.listeners('SIGTERM'), [existingSigterm]);
  assert.deepEqual(stdinTarget.listeners('end'), [existingEnd]);
});

test('uses the real Windows snapshot when taskkill fails', { timeout: 25_000 }, async (t) => {
  const childSource = [
    "const { spawn } = require('node:child_process');",
    "const descendant = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });",
    'console.log(descendant.pid);',
    'setInterval(() => {}, 1000);',
  ].join(' ');
  const child = spawn(process.execPath, ['-e', childSource], {
    detached: process.platform !== 'win32',
    windowsHide: true,
  });
  const exitPromise = waitForExit(child);
  let descendantPid;
  t.after(async () => {
    const cleanupErrors = [];
    for (const pid of [descendantPid, child.pid]) {
      if (!pid || !isProcessAlive(pid)) continue;
      try {
        process.kill(pid, 'SIGKILL');
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    for (const pid of [descendantPid, child.pid]) {
      if (!pid) continue;
      try {
        await waitForProcessExit(pid);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length > 0) {
      throw new AggregateError(cleanupErrors, 'Could not clean up preview process test descendants');
    }
  });

  descendantPid = await new Promise((resolve, reject) => {
    let stdout = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      const newline = stdout.indexOf('\n');
      if (newline >= 0) resolve(Number(stdout.slice(0, newline).trim()));
    });
    child.once('error', reject);
  });

  if (process.platform === 'win32') {
    const snapshot = await snapshotWindowsProcesses();
    assert.ok(snapshot.length > 0, 'Windows process snapshot must contain relationships');
    assert.ok(
      snapshot.some(
        ({ parentPid, pid }) => parentPid === child.pid && pid === descendantPid,
      ),
      `Windows process snapshot omitted ${child.pid}->${descendantPid}`,
    );
  }

  await terminateProcessTree(child, 'SIGTERM', exitPromise, {
    runTaskkill:
      process.platform === 'win32'
        ? async () => {
            throw new Error('forced taskkill failure');
          }
        : undefined,
  });
  assert.equal(isProcessAlive(child.pid), false);
  assert.equal(isProcessAlive(descendantPid), false);
});
