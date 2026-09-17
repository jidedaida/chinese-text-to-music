import { writeFile } from 'node:fs/promises';
import { DEFAULT_SETTINGS } from '../src/domain/settings.ts';
import { composeScore } from '../src/music/compose.ts';
import { analyzeText, initializeTextAnalyzer } from '../src/text/analyze.ts';

const text = '春风山谷星光河面清晨远方归来'.repeat(24).slice(0, 300);
await initializeTextAnalyzer();
const samples: number[] = [];
for (let index = 0; index < 10; index += 1) {
  const started = performance.now();
  await composeScore(analyzeText(text), DEFAULT_SETTINGS);
  samples.push(performance.now() - started);
}
samples.sort((left, right) => left - right);
const median = samples[Math.floor(samples.length / 2)];
const report = `# Composition performance baseline\n\n`
  + `- Date: ${new Date().toISOString()}\n`
  + `- Node: ${process.version}\n`
  + `- Platform: ${process.platform} ${process.arch}\n`
  + `- Input: 300 effective characters\n`
  + `- Runs: 10\n`
  + `- Median: ${median.toFixed(2)} ms\n`
  + `- Samples: ${samples.map((value) => value.toFixed(2)).join(', ')} ms\n`;
if (process.argv.includes('--record')) {
  await writeFile('docs/performance-baseline.md', report, 'utf8');
}
console.log(`Median composition time: ${median.toFixed(2)} ms`);
if (median > 1000) process.exitCode = 1;
