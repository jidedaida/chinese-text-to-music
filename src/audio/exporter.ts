import * as Tone from 'tone';
import type { Score } from '../domain/types';
import { createInstrumentBank } from './instruments';
import { scheduleScoreEvents } from './schedule';
import { encodeWav } from './wav';

export interface RenderedPcm {
  sampleRate: number;
  channels: Float32Array[];
}

export type OfflineRenderer = (score: Score) => Promise<RenderedPcm>;

export const renderScoreOffline: OfflineRenderer = async (score) => {
  const rendered = await Tone.Offline(async ({ transport }) => {
    const bank = await createInstrumentBank(score.settings.timbre);
    scheduleScoreEvents(
      score.noteEvents,
      score.settings.bpm,
      bank,
      (seconds, callback) => { transport.schedule(callback, seconds); },
    );
    transport.start(0);
  }, score.durationSeconds + 2, 2, 44_100);
  return {
    sampleRate: 44_100,
    channels: [rendered.getChannelData(0), rendered.getChannelData(1)],
  };
};

export async function exportScoreWav(
  score: Score,
  render: OfflineRenderer = renderScoreOffline,
): Promise<Blob> {
  const rendered = await render(score);
  return new Blob([encodeWav(rendered.channels, rendered.sampleRate)], { type: 'audio/wav' });
}
