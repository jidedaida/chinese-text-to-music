import { describe, expect, it } from 'vitest';
import type { NoteEvent } from '../domain/types';
import { eventRectangle, eventUnderPoint } from './sequencer-geometry';

const event: NoteEvent = {
  id: 'melody-0', tokenId: 'token-0', trackId: 'melody',
  startBeat: 4, durationBeats: 2, midi: 60, velocity: 0.7,
};

describe('sequencer geometry', () => {
  it('maps beat and MIDI values into a rectangle', () => {
    expect(eventRectangle(event, { pixelsPerBeat: 20, rowHeight: 8, maxMidi: 84 })).toEqual({
      x: 80, y: 192, width: 40, height: 6,
    });
  });

  it('hit tests visible note rectangles', () => {
    expect(eventUnderPoint([event], 90, 194, {
      pixelsPerBeat: 20, rowHeight: 8, maxMidi: 84,
    })?.id).toBe('melody-0');
  });
});
