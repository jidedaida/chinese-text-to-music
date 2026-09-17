import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const server = await createServer({
  logLevel: 'warn',
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
});

await server.listen();
const cli = resolve('node_modules/@playwright/test/cli.js');
const child = spawn(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
  cwd: resolve('.'),
  stdio: 'inherit',
  windowsHide: true,
});

try {
  const exitCode = await new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) reject(new Error(`Playwright exited after signal ${signal}`));
      else resolveExit(code ?? 1);
    });
  });
  process.exitCode = exitCode;
} finally {
  await server.close();
}
