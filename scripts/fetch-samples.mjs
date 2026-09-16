import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const revision = '622c2f1c32c8cfce4158ddc3eb26e518ddef37e5';
const root = `https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/${revision}`;
const selections = {
  piano: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
  violin: ['A3', 'A4', 'A5', 'A6', 'C4', 'C5', 'C6', 'G3', 'G4', 'G5', 'G6'],
  cello: ['C2', 'C3', 'C4', 'C5'],
};

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return {
    path: destination.replaceAll('\\', '/').replace(`${resolve('.').replaceAll('\\', '/')}/`, ''),
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

const files = [];
for (const [instrument, notes] of Object.entries(selections)) {
  for (const note of notes) {
    files.push(await download(
      `${root}/samples/${instrument}/${note}.mp3`,
      resolve(`public/audio/${instrument}/${note}.mp3`),
    ));
  }
}
files.push(await download(`${root}/LICENSE.md`, resolve('public/audio/upstream/LICENSE.md')));
files.push(await download(
  `${root}/sample-source-info.txt`,
  resolve('public/audio/upstream/sample-source-info.txt'),
));
await writeFile(
  resolve('public/audio/manifest.json'),
  `${JSON.stringify({ revision, license: 'CC-BY-3.0', files }, null, 2)}\n`,
  'utf8',
);
console.log(`Downloaded ${files.length} licensed files from ${revision}.`);
