import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../domain/settings';
import { analyzeText, initializeTextAnalyzer } from '../text/analyze';
import { composeScore, targetDurationSeconds } from './compose';
import { isPitchInScale } from './scales';

beforeAll(async () => initializeTextAnalyzer());

describe('targetDurationSeconds', () => {
  it('maps 10 to 300 effective characters onto 30 to 300 seconds', () => {
    expect(targetDurationSeconds(10)).toBe(30);
    expect(targetDurationSeconds(300)).toBe(300);
    expect(targetDurationSeconds(155)).toBe(165);
  });
});

describe('composeScore', () => {
  it('creates four tracks and keeps every word traceable', async () => {
    const tokens = analyzeText('春风吹过山谷，星光落在河面。');
    const score = await composeScore(tokens, DEFAULT_SETTINGS);
    expect(score.tracks.map((track) => track.kind)).toEqual([
      'melody',
      'harmony',
      'bass',
      'percussion',
    ]);
    for (const track of score.tracks) {
      expect(score.noteEvents.some((event) => event.trackId === track.id)).toBe(true);
    }
    for (const token of tokens.filter((item) => item.kind === 'word')) {
      expect(score.noteEvents.some((event) => event.tokenId === token.id)).toBe(true);
    }
  });

  it('keeps melody notes inside the selected scale', async () => {
    const score = await composeScore(
      analyzeText('春风吹过山谷，星光落在河面。'),
      DEFAULT_SETTINGS,
    );
    const melody = score.noteEvents.filter((event) => event.trackId === 'melody');
    expect(melody.every((event) =>
      isPitchInScale(event.midi, score.settings.tonic, score.settings.scale),
    )).toBe(true);
  });

  it('returns identical music for equivalent Simplified and Traditional input', async () => {
    const first = await composeScore(analyzeText('春风吹过山谷。'), DEFAULT_SETTINGS);
    const second = await composeScore(analyzeText('春風吹過山谷。'), DEFAULT_SETTINGS);
    expect(first.musicHash).toBe(second.musicHash);
    expect(first.noteEvents).toEqual(second.noteEvents);
  });

  it('resolves automatic mood locally before writing the score', async () => {
    const score = await composeScore(analyzeText('阳光希望快乐，春风吹过山谷。'), DEFAULT_SETTINGS);
    expect(score.settings.mood).toBe('bright');
    expect(score.settings.requestedMood).toBe('auto');
  });
});
