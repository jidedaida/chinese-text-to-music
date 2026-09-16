import { countEffectiveCharacters } from '../domain/input';
import { resolveSettings } from '../domain/settings';
import type {
  GenerationSettings, NoteEvent, ResolvedSettings, Score, Token, Track,
} from '../domain/types';
import { sha256Hex, stableStringify } from './hash';
import { mapTokenToMotif } from './motif';
import { inferMood } from './mood';
import { calculateMusicHash } from './score';
import { degreeToMidi, fitMidiRange } from './scales';

const TRACKS: Track[] = [
  { id: 'melody', kind: 'melody', label: '主旋律' },
  { id: 'harmony', kind: 'harmony', label: '和弦' },
  { id: 'bass', kind: 'bass', label: '贝斯' },
  { id: 'percussion', kind: 'percussion', label: '轻打击乐' },
];

export function targetDurationSeconds(count: number): number {
  const clamped = Math.min(300, Math.max(10, count));
  return Math.round(30 + (270 * (clamped - 10)) / 290);
}

function punctuationPause(token: Token | undefined): number {
  if (!token || token.kind !== 'punctuation') return 0;
  if (/[.!?]/u.test(token.normalized)) return 1;
  if (/[,;:]/u.test(token.normalized)) return 0.5;
  return token.normalized === '\n' ? 2 : 0;
}

function accompaniment(totalBeats: number, settings: ResolvedSettings): NoteEvent[] {
  const events: NoteEvent[] = [];
  let eventIndex = 0;
  for (let beat = 0; beat < totalBeats; beat += 4) {
    const phrase = Math.floor(beat / 4);
    const rootDegree = [0, 3, 4, 0][phrase % 4];
    for (const chordDegree of [rootDegree, rootDegree + 2, rootDegree + 4]) {
      events.push({
        id: `harmony-${eventIndex++}`,
        tokenId: null,
        trackId: 'harmony',
        startBeat: beat,
        durationBeats: Math.min(4, totalBeats - beat),
        midi: degreeToMidi(chordDegree, settings.tonic, settings.scale, 3),
        velocity: settings.mood === 'melancholic' ? 0.42 : settings.mood === 'bright' ? 0.56 : 0.5,
      });
    }
    events.push({
      id: `bass-${phrase}`,
      tokenId: null,
      trackId: 'bass',
      startBeat: beat,
      durationBeats: Math.min(2, totalBeats - beat),
      midi: degreeToMidi(rootDegree, settings.tonic, settings.scale, 2),
      velocity: 0.58,
    });
  }
  const percussionStep = settings.mood === 'bright' ? 0.5 : 1;
  for (let beat = 0; beat < totalBeats; beat += percussionStep) {
    const strongBeat = Number.isInteger(beat);
    events.push({
      id: `percussion-${Math.round(beat * 2)}`,
      tokenId: null,
      trackId: 'percussion',
      startBeat: beat,
      durationBeats: 0.1,
      midi: strongBeat && beat % 4 === 0 ? 36 : 42,
      velocity: settings.mood === 'melancholic' ? 0.2 : strongBeat ? 0.4 : 0.24,
    });
  }
  return events;
}

export async function composeScore(
  tokens: Token[],
  requestedSettings: GenerationSettings,
): Promise<Score> {
  const settings = resolveSettings(requestedSettings, inferMood(tokens));
  const words = tokens.filter((token) => token.kind === 'word');
  const effectiveCount = countEffectiveCharacters(words.map((token) => token.normalized).join(''));
  const durationSeconds = targetDurationSeconds(effectiveCount);
  const targetBeats = (durationSeconds * settings.bpm) / 60;
  const motifs = await Promise.all(words.map(mapTokenToMotif));
  const rawBeats = motifs.reduce((sum, motif, index) => {
    const motifBeats = Math.max(...motif.notes.map((note) => note.startBeat + note.durationBeats));
    const sourceIndex = tokens.findIndex((token) => token.id === words[index].id);
    return sum + motifBeats + punctuationPause(tokens[sourceIndex + 1]);
  }, 0);
  const timeScale = targetBeats / Math.max(1, rawBeats);
  const melody: NoteEvent[] = [];
  let cursor = 0;
  let previousWord = '';
  for (let index = 0; index < words.length; index += 1) {
    const token = words[index];
    const motif = motifs[index];
    const repeatScale = token.normalized === previousWord ? 0.75 : 1;
    const articulationScale = motif.articulation === 'staccato'
      ? 0.62
      : motif.articulation === 'legato'
        ? 1.08
        : 0.92;
    for (let noteIndex = 0; noteIndex < motif.notes.length; noteIndex += 1) {
      const note = motif.notes[noteIndex];
      melody.push({
        id: `melody-${index}-${noteIndex}`,
        tokenId: token.id,
        trackId: 'melody',
        startBeat: cursor + note.startBeat * timeScale * repeatScale,
        durationBeats: Math.max(
          0.125,
          note.durationBeats * timeScale * repeatScale * articulationScale,
        ),
        midi: fitMidiRange(
          degreeToMidi(
            motif.baseDegree + note.degreeOffset,
            settings.tonic,
            settings.scale,
            motif.octave,
          ),
          48,
          96,
        ),
        velocity: motif.articulation === 'accent'
          ? Math.min(1, note.velocity * 1.12)
          : note.velocity,
      });
    }
    const motifEnd = Math.max(...motif.notes.map((note) => note.startBeat + note.durationBeats));
    const sourceIndex = tokens.findIndex((item) => item.id === token.id);
    cursor += (motifEnd * repeatScale + punctuationPause(tokens[sourceIndex + 1])) * timeScale;
    previousWord = token.normalized;
  }
  const noteEvents = [...melody, ...accompaniment(targetBeats, settings)]
    .sort((left, right) => left.startBeat - right.startBeat || left.id.localeCompare(right.id));
  const soundSettings = {
    tonic: settings.tonic,
    scale: settings.scale,
    bpm: settings.bpm,
    mood: settings.mood,
    timbre: settings.timbre,
  };
  const seed = await sha256Hex(
    `composer-v1|${tokens.map((token) => token.normalized).join('')}|${stableStringify(soundSettings)}`,
  );
  const score: Score = {
    schemaVersion: 'score-v1',
    mappingVersion: 'mapping-v1',
    composerVersion: 'composer-v1',
    seed,
    musicHash: '',
    settings,
    durationSeconds,
    tokens,
    tracks: TRACKS,
    noteEvents,
  };
  score.musicHash = await calculateMusicHash(score);
  return score;
}
