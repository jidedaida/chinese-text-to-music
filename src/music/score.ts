import type { Score } from '../domain/types';
import { sha256Hex, stableStringify } from './hash';

export function canonicalMusicProjection(score: Score) {
  const { tonic, scale, bpm, mood, timbre } = score.settings;
  return {
    schemaVersion: score.schemaVersion,
    mappingVersion: score.mappingVersion,
    composerVersion: score.composerVersion,
    seed: score.seed,
    settings: { tonic, scale, bpm, mood, timbre },
    durationSeconds: score.durationSeconds,
    tokens: score.tokens.map((token) => ({
      id: token.id,
      normalized: token.normalized,
      pinyin: token.pinyin,
      tones: token.tones,
      kind: token.kind,
    })),
    tracks: score.tracks.map(({ id, kind }) => ({ id, kind })),
    noteEvents: [...score.noteEvents].sort((left, right) =>
      left.startBeat - right.startBeat || left.id.localeCompare(right.id),
    ),
  };
}

export async function calculateMusicHash(score: Score): Promise<string> {
  return sha256Hex(stableStringify(canonicalMusicProjection(score)));
}
