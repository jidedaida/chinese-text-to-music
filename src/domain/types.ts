export type ToneNumber = 0 | 1 | 2 | 3 | 4 | 5;
export type Mood = 'auto' | 'bright' | 'calm' | 'melancholic';
export type ResolvedMood = Exclude<Mood, 'auto'>;
export type ScaleMode = 'major' | 'natural-minor' | 'major-pentatonic' | 'minor-pentatonic';
export type TimbrePreset = 'chamber-piano' | 'soft-electronic' | 'minimal-piano';
export type TrackKind = 'melody' | 'harmony' | 'bass' | 'percussion';
export type Articulation = 'legato' | 'normal' | 'staccato' | 'accent';

export interface GenerationSettings {
  tonic: number;
  scale: ScaleMode;
  bpm: number;
  mood: Mood;
  timbre: TimbrePreset;
}

export interface ResolvedSettings extends Omit<GenerationSettings, 'mood'> {
  mood: ResolvedMood;
  requestedMood: Mood;
}

export interface Token {
  id: string;
  raw: string;
  normalized: string;
  sourceStart: number;
  sourceEnd: number;
  pinyin: string[];
  tones: ToneNumber[];
  kind: 'word' | 'punctuation' | 'other';
}

export interface MotifNote {
  degreeOffset: number;
  startBeat: number;
  durationBeats: number;
  velocity: number;
}

export interface MotifSpec {
  tokenId: string;
  rhythmId: number;
  baseDegree: number;
  octave: number;
  articulation: Articulation;
  notes: MotifNote[];
}

export interface Track {
  id: string;
  kind: TrackKind;
  label: string;
}

export interface NoteEvent {
  id: string;
  tokenId: string | null;
  trackId: string;
  startBeat: number;
  durationBeats: number;
  midi: number;
  velocity: number;
}

export interface Score {
  schemaVersion: 'score-v1';
  mappingVersion: 'mapping-v1';
  composerVersion: 'composer-v1';
  seed: string;
  musicHash: string;
  settings: ResolvedSettings;
  durationSeconds: number;
  tokens: Token[];
  tracks: Track[];
  noteEvents: NoteEvent[];
}
