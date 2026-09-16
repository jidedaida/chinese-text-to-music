import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, resolveSettings } from './settings';

describe('resolveSettings', () => {
  it('uses the approved defaults', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      tonic: 0,
      scale: 'major-pentatonic',
      bpm: 84,
      mood: 'auto',
      timbre: 'chamber-piano',
    });
  });

  it('clamps BPM and preserves explicit user values', () => {
    expect(resolveSettings({ ...DEFAULT_SETTINGS, bpm: 999 }, 'calm').bpm).toBe(140);
    expect(resolveSettings({ ...DEFAULT_SETTINGS, bpm: 60, mood: 'bright' }, 'calm')).toMatchObject({
      bpm: 60,
      mood: 'bright',
      requestedMood: 'bright',
    });
  });
});
