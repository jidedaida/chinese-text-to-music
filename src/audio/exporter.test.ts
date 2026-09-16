import { describe, expect, it, vi } from 'vitest';
import type { Score } from '../domain/types';
import { exportScoreWav } from './exporter';

describe('exportScoreWav', () => {
  it('passes the canonical score to the renderer and returns an audio Blob', async () => {
    const score: Score = {
      schemaVersion: 'score-v1',
      mappingVersion: 'mapping-v1',
      composerVersion: 'composer-v1',
      seed: 'seed',
      musicHash: 'abc',
      settings: {
        tonic: 0,
        scale: 'major-pentatonic',
        bpm: 84,
        mood: 'calm',
        requestedMood: 'auto',
        timbre: 'chamber-piano',
      },
      durationSeconds: 30,
      tokens: [],
      tracks: [],
      noteEvents: [],
    };
    const renderer = vi.fn().mockResolvedValue({
      sampleRate: 44_100,
      channels: [new Float32Array(100), new Float32Array(100)],
    });
    const blob = await exportScoreWav(score, renderer);
    expect(renderer).toHaveBeenCalledWith(score);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBeGreaterThan(44);
  });
});
