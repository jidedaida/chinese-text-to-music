import type { GenerationSettings, ResolvedMood, ResolvedSettings } from './types';

export const DEFAULT_SETTINGS: GenerationSettings = {
  tonic: 0,
  scale: 'major-pentatonic',
  bpm: 84,
  mood: 'auto',
  timbre: 'chamber-piano',
};

export function resolveSettings(
  settings: GenerationSettings,
  inferredMood: ResolvedMood,
): ResolvedSettings {
  return {
    ...settings,
    tonic: ((Math.round(settings.tonic) % 12) + 12) % 12,
    bpm: Math.min(140, Math.max(60, Math.round(settings.bpm))),
    mood: settings.mood === 'auto' ? inferredMood : settings.mood,
    requestedMood: settings.mood,
  };
}
