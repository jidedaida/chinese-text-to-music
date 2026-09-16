import { describe, expect, it } from 'vitest';
import type { Score } from '../domain/types';
import { canonicalMusicProjection } from './score';

describe('canonicalMusicProjection', () => {
  it('excludes raw display text and source positions', () => {
    const score = {
      schemaVersion: 'score-v1',
      mappingVersion: 'mapping-v1',
      composerVersion: 'composer-v1',
      seed: 'seed',
      musicHash: '',
      settings: {
        tonic: 0, scale: 'major-pentatonic', bpm: 84,
        mood: 'calm', requestedMood: 'auto', timbre: 'chamber-piano',
      },
      durationSeconds: 30,
      tokens: [{
        id: 'token-0', raw: '風', normalized: '风', sourceStart: 10, sourceEnd: 11,
        pinyin: ['feng1'], tones: [1], kind: 'word',
      }],
      tracks: [{ id: 'melody', kind: 'melody', label: '旋律' }],
      noteEvents: [{
        id: 'melody-0', tokenId: 'token-0', trackId: 'melody',
        startBeat: 0, durationBeats: 1, midi: 60, velocity: 0.7,
      }],
    } satisfies Score;
    const projection = canonicalMusicProjection(score);
    expect(JSON.stringify(projection)).not.toContain('風');
    expect(JSON.stringify(projection)).not.toContain('sourceStart');
    expect(JSON.stringify(projection)).toContain('风');
  });
});
