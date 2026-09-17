import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import {
  isRunning,
  parsePreviewPort,
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

test('validates preview port overrides', () => {
  assert.equal(parsePreviewPort(undefined), 4174);
  assert.equal(parsePreviewPort('4175'), 4175);
  for (const value of ['', '0', '65536', '4.5', 'port']) {
    assert.throws(() => parsePreviewPort(value), /PREVIEW_PORT must be an integer/u);
  }
});

test('terminates a spawned process tree', async (t) => {
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
  t.after(async () => {
    if (isRunning(child)) await terminateProcessTree(child, 'SIGTERM', exitPromise);
  });

  const descendantPid = await new Promise((resolve, reject) => {
    let stdout = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      const newline = stdout.indexOf('\n');
      if (newline >= 0) resolve(Number(stdout.slice(0, newline).trim()));
    });
    child.once('error', reject);
  });

  await terminateProcessTree(child, 'SIGTERM', exitPromise);
  assert.equal(isProcessAlive(child.pid), false);
  assert.equal(isProcessAlive(descendantPid), false);
});
