import { describe, expect, it } from 'vitest';
import type { Token } from '../domain/types';
import { mapTokenToMotif } from './motif';

const token: Token = {
  id: 'token-0',
  raw: '春风',
  normalized: '春风',
  sourceStart: 0,
  sourceEnd: 2,
  pinyin: ['chun1', 'feng1'],
  tones: [1, 1],
  kind: 'word',
};

describe('mapTokenToMotif', () => {
  it('is deterministic and traceable to the token', async () => {
    const first = await mapTokenToMotif(token);
    const second = await mapTokenToMotif(token);
    expect(first).toEqual(second);
    expect(first.tokenId).toBe('token-0');
    expect(first.notes.length).toBeGreaterThan(0);
  });

  it('uses a downward contour for a fourth tone', async () => {
    const falling = await mapTokenToMotif({ ...token, normalized: '落', tones: [4] });
    expect(falling.notes.at(-1)!.degreeOffset).toBeLessThanOrEqual(
      falling.notes[0].degreeOffset,
    );
  });
});
