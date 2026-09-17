import { readFile, stat } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
if (!entryKey) throw new Error('Vite manifest has no entry chunk');

function collectImports(rootKey) {
  const imports = new Set();
  function visit(key) {
    if (imports.has(key)) return;
    imports.add(key);
    for (const imported of manifest[key]?.imports ?? []) visit(imported);
  }
  visit(rootKey);
  return imports;
}

const eager = collectImports(entryKey);

const forbidden = [...eager].filter((key) =>
  key.includes('@pinyin-pro/data/dist/complete')
  || key === 'src/audio/engine.ts'
  || key === 'src/audio/exporter.ts'
  || key.includes('node_modules/tone'),
);
if (forbidden.length > 0) {
  throw new Error(`Eager build still contains lazy modules: ${forbidden.join(', ')}`);
}

for (const required of [
  'src/audio/engine.ts',
  'src/audio/exporter.ts',
]) {
  if (!manifest[required]) throw new Error(`Missing dynamic entry: ${required}`);
}

const eagerAudioDependencies = new Set();
for (const root of ['src/audio/engine.ts', 'src/audio/exporter.ts']) {
  for (const key of collectImports(root)) {
    if (key !== root && key !== entryKey && eager.has(key)) eagerAudioDependencies.add(key);
  }
}
if (eagerAudioDependencies.size > 0) {
  throw new Error(
    `Eager build still contains audio runtime dependencies: ${[...eagerAudioDependencies].join(', ')}`,
  );
}

const completeDictionary = Object.keys(manifest)
  .find((key) => key.includes('@pinyin-pro/data/dist/complete'));
if (!completeDictionary) throw new Error('Complete dictionary was not emitted as a separate chunk');

const toneRuntimeMarkers = [
  'https://github.com/Tonejs/Tone.js/wiki/Accurate-Timing',
  'ToneAudioNode does not have any internal nodes',
];
const eagerToneMarkers = new Map();
for (const key of eager) {
  const file = manifest[key]?.file;
  if (!file) continue;
  const source = await readFile(`dist/${file}`, 'utf8');
  for (const marker of toneRuntimeMarkers) {
    if (source.includes(marker) && !eagerToneMarkers.has(marker)) {
      eagerToneMarkers.set(marker, key);
    }
  }
  const size = (await stat(`dist/${file}`)).size;
  console.log(`${key}: ${(size / 1024).toFixed(1)} KiB`);
}
if (toneRuntimeMarkers.every((marker) => eagerToneMarkers.has(marker))) {
  const files = [...new Set(eagerToneMarkers.values())];
  throw new Error(`Eager build contains the Tone runtime: ${files.join(', ')}`);
}
console.log('Verified lazy dictionary and audio chunk boundaries.');
