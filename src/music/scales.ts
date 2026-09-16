import type { ScaleMode } from '../domain/types';

const INTERVALS: Record<ScaleMode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  'natural-minor': [0, 2, 3, 5, 7, 8, 10],
  'major-pentatonic': [0, 2, 4, 7, 9],
  'minor-pentatonic': [0, 3, 5, 7, 10],
};

export function degreeToMidi(
  degree: number,
  tonic: number,
  scale: ScaleMode,
  octave: number,
): number {
  const intervals = INTERVALS[scale];
  const wrapped = ((degree % intervals.length) + intervals.length) % intervals.length;
  const octaveShift = Math.floor(degree / intervals.length);
  return 12 * (octave + 1 + octaveShift) + tonic + intervals[wrapped];
}

export function isPitchInScale(midi: number, tonic: number, scale: ScaleMode): boolean {
  const pitchClass = ((midi - tonic) % 12 + 12) % 12;
  return INTERVALS[scale].includes(pitchClass);
}

export function fitMidiRange(midi: number, minimum: number, maximum: number): number {
  let fitted = midi;
  while (fitted < minimum) fitted += 12;
  while (fitted > maximum) fitted -= 12;
  return fitted;
}
