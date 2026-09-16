import { describe, expect, it } from 'vitest';
import { degreeToMidi, fitMidiRange, isPitchInScale } from './scales';

describe('scale helpers', () => {
  it('maps pentatonic degrees into the selected tonic', () => {
    expect(degreeToMidi(0, 0, 'major-pentatonic', 4)).toBe(60);
    expect(degreeToMidi(1, 0, 'major-pentatonic', 4)).toBe(62);
    expect(isPitchInScale(67, 0, 'major-pentatonic')).toBe(true);
    expect(isPitchInScale(66, 0, 'major-pentatonic')).toBe(false);
    expect(fitMidiRange(40, 48, 96)).toBe(52);
    expect(fitMidiRange(100, 48, 96)).toBe(88);
  });
});
