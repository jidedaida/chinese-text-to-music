import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DEFAULT_SETTINGS } from '../src/domain/settings.ts';
import { analyzeText, initializeTextAnalyzer } from '../src/text/analyze.ts';
import { composeScore } from '../src/music/compose.ts';

const cases = {
  'short-poem': '春风吹过山谷，星光落在河面。',
  traditional: '春風吹過山谷，星光落在河面。',
  mixed: '春风AI2026，落在河面。',
  long: '春风山谷星光河面清晨远方归来'.repeat(24).slice(0, 300),
};

await initializeTextAnalyzer();
const directory = resolve('tests/fixtures');
await mkdir(directory, { recursive: true });
for (const [name, text] of Object.entries(cases)) {
  const score = await composeScore(analyzeText(text), DEFAULT_SETTINGS);
  await writeFile(
    resolve(directory, `${name}.score.json`),
    `${JSON.stringify(score, null, 2)}\n`,
    'utf8',
  );
}
