import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { preview } from 'vite';
import {
  createSignalController,
  isRunning,
  parsePreviewPort,
  removeViteExitListeners,
  terminateProcessTree,
  waitForExit,
} from './preview-e2e-process.mjs';

const host = '127.0.0.1';
const signalExitCodes = { SIGINT: 130, SIGTERM: 143 };

function reportSecondaryFailure(label, error) {
  console.error(`[preview-e2e] ${label}:`, error);
}

const port = parsePreviewPort(process.env.PREVIEW_PORT);
const signalController = createSignalController({
  onFirstSignal(signal) {
    process.exitCode = signalExitCodes[signal];
  },
});
signalController.install();

const sigtermListenersBeforePreview = process.listeners('SIGTERM');
const stdinEndListenersBeforePreview = process.stdin.listeners('end');
let server;
let child;
let childExitPromise;
let primaryError;

try {
  server = await preview({
    logLevel: 'warn',
    mode: 'preview',
    preview: {
      host,
      port,
      strictPort: true,
    },
  });
  // Vite 8 preview installs the same exit callback on SIGTERM and, outside CI, stdin end.
  // Remove precisely that pair so this runner owns awaited cleanup; server.close() still
  // unregisters the callback from Vite's internal set and runs closePreviewServer hooks.
  removeViteExitListeners({
    isCI: process.env.CI === 'true',
    processTarget: process,
    sigtermBefore: sigtermListenersBeforePreview,
    stdinEndBefore: stdinEndListenersBeforePreview,
    stdinTarget: process.stdin,
  });

  const baseURL = new URL(server.config.base, `http://${host}:${port}/`).href;
  const cli = resolve('node_modules/@playwright/test/cli.js');
  child = spawn(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
    cwd: resolve('.'),
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      EXPECT_PREVIEW_BADGE: '1',
      PLAYWRIGHT_BASE_URL: baseURL,
    },
    stdio: 'inherit',
    windowsHide: true,
  });
  childExitPromise = waitForExit(child);

  const outcome = await Promise.race([
    childExitPromise.then((result) => ({ type: 'exit', result })),
    signalController.signalPromise.then((signal) => ({ type: 'signal', signal })),
  ]);
  if (outcome.type === 'signal') {
    await terminateProcessTree(child, outcome.signal, childExitPromise);
  } else if (outcome.result.signal) {
    throw new Error(`Playwright exited after signal ${outcome.result.signal}`);
  } else {
    process.exitCode = outcome.result.code ?? 1;
  }
} catch (error) {
  primaryError = error;
  process.exitCode ||= 1;
} finally {
  if (child && childExitPromise && isRunning(child)) {
    try {
      await terminateProcessTree(child, signalController.signal ?? 'SIGTERM', childExitPromise);
    } catch (error) {
      if (primaryError || process.exitCode) reportSecondaryFailure('failed to stop Playwright', error);
      else {
        primaryError = error;
        process.exitCode = 1;
      }
    }
  }

  if (server) {
    try {
      await server.close();
    } catch (error) {
      if (primaryError || process.exitCode) reportSecondaryFailure('failed to close Vite preview', error);
      else {
        primaryError = error;
        process.exitCode = 1;
      }
    }
  }

  signalController.remove();
}

if (primaryError) throw primaryError;
