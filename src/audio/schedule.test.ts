import { describe, expect, it, vi } from 'vitest';
import type { InstrumentBank } from './instruments';
import { scheduleScoreEvents } from './schedule';

describe('scheduleScoreEvents', () => {
  it('converts beats to seconds and routes tracks to their voices', () => {
    const voices = {
      melody: vi.fn(), harmony: vi.fn(), bass: vi.fn(), percussion: vi.fn(),
    };
    const bank = {
      melody: { triggerAttackRelease: voices.melody },
      harmony: { triggerAttackRelease: voices.harmony },
      bass: { triggerAttackRelease: voices.bass },
      percussion: { triggerAttackRelease: voices.percussion },
    } as unknown as InstrumentBank;
    const events = ['melody', 'harmony', 'bass', 'percussion'].map((trackId, index) => ({
      id: `${trackId}-0`, tokenId: trackId === 'melody' ? 'token-0' : null, trackId,
      startBeat: 2 + index, durationBeats: 1, midi: 60 + index, velocity: 0.7,
    }));
    scheduleScoreEvents(events, 120, bank, (seconds, callback) => callback(seconds));
    expect(voices.melody).toHaveBeenCalledWith(
      expect.closeTo(261.625565, 5),
      0.5,
      1,
      0.7,
    );
    expect(voices.harmony).toHaveBeenCalledOnce();
    expect(voices.bass).toHaveBeenCalledOnce();
    expect(voices.percussion).toHaveBeenCalledOnce();
  });
});
