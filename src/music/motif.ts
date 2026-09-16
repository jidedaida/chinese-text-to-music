import type { Articulation, MotifNote, MotifSpec, Token } from '../domain/types';
import { sha256Bytes } from './hash';

const RHYTHMS = [
  [1, 1],
  [0.5, 0.5, 1],
  [1.5, 0.5],
  [0.5, 1, 0.5],
] as const;
const ARTICULATIONS: Articulation[] = ['legato', 'normal', 'staccato', 'accent'];

function contourForTone(tone: number, index: number): number {
  if (tone === 2) return index;
  if (tone === 3) return index === 0 ? 0 : index === 1 ? -1 : 1;
  if (tone === 4) return -index;
  if (tone === 5) return index === 0 ? 0 : -1;
  return index % 2;
}

export async function mapTokenToMotif(token: Token): Promise<MotifSpec> {
  const digest = await sha256Bytes(`mapping-v1|${token.normalized}`);
  const rhythmId = digest[1] % RHYTHMS.length;
  const rhythm = RHYTHMS[rhythmId];
  const noteCount = Math.max(1, Math.min(4, token.tones.length || 1));
  let cursor = 0;
  const notes: MotifNote[] = Array.from({ length: noteCount }, (_, index) => {
    const durationBeats = rhythm[index % rhythm.length];
    const note = {
      degreeOffset: contourForTone(token.tones[index] ?? 0, index),
      startBeat: cursor,
      durationBeats,
      velocity: 0.55 + (digest[4] / 255) * 0.3,
    };
    cursor += durationBeats;
    return note;
  });
  return {
    tokenId: token.id,
    rhythmId,
    baseDegree: digest[0] % 5,
    octave: 3 + (digest[3] % 3),
    articulation: ARTICULATIONS[digest[5] % ARTICULATIONS.length],
    notes,
  };
}
