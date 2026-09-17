import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../domain/settings';
import { analyzeText, initializeTextAnalyzer } from '../text/analyze';
import longScore from '../../tests/fixtures/long.score.json';
import mixedScore from '../../tests/fixtures/mixed.score.json';
import shortPoem from '../../tests/fixtures/short-poem.score.json';
import traditionalScore from '../../tests/fixtures/traditional.score.json';
import { composeScore } from './compose';

beforeAll(async () => initializeTextAnalyzer());

function generatedText(length: number): string {
  const alphabet = Array.from('春风山谷星光河面清晨远方归来');
  return Array.from({ length }, (_, index) => alphabet[(index * 7) % alphabet.length]).join('');
}

describe('score invariants', () => {
  it('keeps all generated values finite and within track ranges', async () => {
    for (const length of [10, 37, 120, 300]) {
      const score = await composeScore(analyzeText(generatedText(length)), DEFAULT_SETTINGS);
      expect(score.durationSeconds).toBeGreaterThanOrEqual(30);
      expect(score.durationSeconds).toBeLessThanOrEqual(300);
      for (const event of score.noteEvents) {
        expect(Number.isFinite(event.startBeat)).toBe(true);
        expect(Number.isFinite(event.durationBeats)).toBe(true);
        expect(event.startBeat).toBeGreaterThanOrEqual(0);
        expect(event.durationBeats).toBeGreaterThan(0);
        expect(event.velocity).toBeGreaterThanOrEqual(0);
        expect(event.velocity).toBeLessThanOrEqual(1);
        const [minimum, maximum] = event.trackId === 'bass'
          ? [28, 55]
          : event.trackId === 'percussion'
            ? [35, 81]
            : [48, 96];
        expect(event.midi).toBeGreaterThanOrEqual(minimum);
        expect(event.midi).toBeLessThanOrEqual(maximum);
      }
    }
  });

  it('returns the same music hash in repeated runs', async () => {
    const text = generatedText(80);
    const hashes = await Promise.all(
      Array.from({ length: 5 }, async () =>
        (await composeScore(analyzeText(text), DEFAULT_SETTINGS)).musicHash,
      ),
    );
    expect(new Set(hashes).size).toBe(1);
  });

  it('matches every checked-in mapping-v1 golden score', async () => {
    const cases = [
      ['春风吹过山谷，星光落在河面。', shortPoem.musicHash],
      ['春風吹過山谷，星光落在河面。', traditionalScore.musicHash],
      ['春风AI2026，落在河面。', mixedScore.musicHash],
      ['春风山谷星光河面清晨远方归来'.repeat(24).slice(0, 300), longScore.musicHash],
    ] as const;
    for (const [text, expectedHash] of cases) {
      const score = await composeScore(analyzeText(text), DEFAULT_SETTINGS);
      expect(score.musicHash).toBe(expectedHash);
    }
  });
});
