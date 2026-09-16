import { describe, expect, it, vi } from 'vitest';
import type { InstrumentBank } from './instruments';
import { scheduleScoreEvents } from './schedule';

describe('scheduleScoreEvents', () => {
  it('converts beats to seconds and routes tracks to their voices', () => {
    const triggerAttackRelease = vi.fn();
    const bank = {
      melody: { triggerAttackRelease }, harmony: { triggerAttackRelease },
      bass: { triggerAttackRelease }, percussion: { triggerAttackRelease },
    } as unknown as InstrumentBank;
    const events = [{
      id: 'melody-0', tokenId: 'token-0', trackId: 'melody',
      startBeat: 2, durationBeats: 1, midi: 60, velocity: 0.7,
    }];
    scheduleScoreEvents(events, 120, bank, (seconds, callback) => callback(seconds));
    expect(triggerAttackRelease).toHaveBeenCalledWith(60, 0.5, 1, 0.7);
  });
});
