import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifest = JSON.parse(await readFile(resolve('public/audio/manifest.json'), 'utf8'));
for (const entry of manifest.files) {
  const bytes = await readFile(resolve(entry.path));
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== entry.sha256) {
    throw new Error(`Sample checksum mismatch: ${entry.path}`);
  }
}
console.log(`Verified ${manifest.files.length} licensed files.`);
