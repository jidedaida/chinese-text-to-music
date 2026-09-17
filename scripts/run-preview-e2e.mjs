import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { preview } from 'vite';

const host = '127.0.0.1';
const port = 4174;
const base = '/chinese-text-to-music/';
const server = await preview({
  base,
  logLevel: 'warn',
  mode: 'preview',
  preview: {
    host,
    port,
    strictPort: true,
  },
});

try {
  const cli = resolve('node_modules/@playwright/test/cli.js');
  const child = spawn(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
    cwd: resolve('.'),
    env: {
      ...process.env,
      EXPECT_PREVIEW_BADGE: '1',
      PLAYWRIGHT_BASE_URL: `http://${host}:${port}${base}`,
    },
    stdio: 'inherit',
    windowsHide: true,
  });

  const exitCode = await new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) reject(new Error(`Playwright exited after signal ${signal}`));
      else resolveExit(code ?? 1);
    });
  });
  process.exitCode = exitCode;
} finally {
  await new Promise((resolveClose, rejectClose) => {
    server.httpServer.close((error) => {
      if (error) rejectClose(error);
      else resolveClose();
    });
  });
}
