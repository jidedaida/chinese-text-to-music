import type { NoteEvent } from '../domain/types';
import type { InstrumentBank, Voice } from './instruments';

export type ScheduleCallback = (seconds: number, callback: (audioTime: number) => void) => void;

function voiceFor(event: NoteEvent, bank: InstrumentBank): Voice {
  if (event.trackId === 'harmony') return bank.harmony;
  if (event.trackId === 'bass') return bank.bass;
  if (event.trackId === 'percussion') return bank.percussion;
  return bank.melody;
}

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function scheduleScoreEvents(
  events: NoteEvent[],
  bpm: number,
  bank: InstrumentBank,
  schedule: ScheduleCallback,
  onToken?: (tokenId: string, seconds: number, audioTime: number) => void,
): void {
  for (const event of events) {
    const startSeconds = event.startBeat * 60 / bpm;
    const durationSeconds = event.durationBeats * 60 / bpm;
    schedule(startSeconds, (audioTime) => {
      voiceFor(event, bank).triggerAttackRelease(
        midiToFrequency(event.midi),
        durationSeconds,
        audioTime,
        event.velocity,
      );
      if (event.trackId === 'melody' && event.tokenId) {
        onToken?.(event.tokenId, startSeconds, audioTime);
      }
    });
  }
}
