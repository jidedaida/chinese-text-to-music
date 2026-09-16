import * as Tone from 'tone';
import type { TimbrePreset } from '../domain/types';

export interface Voice {
  triggerAttackRelease(note: number, duration: number, time: number, velocity: number): unknown;
  dispose(): unknown;
}

export interface InstrumentBank {
  melody: Voice;
  harmony: Voice;
  bass: Voice;
  percussion: Voice;
  fallback: boolean;
  dispose(): void;
}

const maps = {
  piano: Object.fromEntries(['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map((note) => [note, `${note}.mp3`])),
  violin: Object.fromEntries(['A3', 'A4', 'A5', 'A6', 'C4', 'C5', 'C6', 'G3', 'G4', 'G5', 'G6'].map((note) => [note, `${note}.mp3`])),
  cello: Object.fromEntries(['C2', 'C3', 'C4', 'C5'].map((note) => [note, `${note}.mp3`])),
};

class LayeredVoice implements Voice {
  constructor(private readonly voices: Voice[]) {}
  triggerAttackRelease(note: number, duration: number, time: number, velocity: number) {
    for (const voice of this.voices) voice.triggerAttackRelease(note, duration, time, velocity * 0.72);
  }
  dispose() { for (const voice of this.voices) voice.dispose(); }
}

function createElectronicBank(fallback: boolean): InstrumentBank {
  const limiter = new Tone.Limiter(-1).toDestination();
  const output = new Tone.Gain(0.68).connect(limiter);
  const melody = new Tone.PolySynth(Tone.Synth).connect(output);
  const harmony = new Tone.PolySynth(Tone.AMSynth).connect(output);
  const bass = new Tone.PolySynth(Tone.MonoSynth).connect(output);
  const percussion = new Tone.PolySynth(Tone.MembraneSynth).connect(output);
  return {
    melody, harmony, bass, percussion, fallback,
    dispose() {
      melody.dispose(); harmony.dispose(); bass.dispose(); percussion.dispose();
      output.dispose(); limiter.dispose();
    },
  };
}

export async function loadPresetBank(preset: TimbrePreset): Promise<InstrumentBank> {
  if (preset === 'soft-electronic') return createElectronicBank(false);
  const limiter = new Tone.Limiter(-1).toDestination();
  const output = new Tone.Gain(0.68).connect(limiter);
  const piano = new Tone.Sampler({ urls: maps.piano, baseUrl: '/audio/piano/', release: 1 }).connect(output);
  const violin = new Tone.Sampler({ urls: maps.violin, baseUrl: '/audio/violin/', release: 1.4 }).connect(output);
  const cello = new Tone.Sampler({ urls: maps.cello, baseUrl: '/audio/cello/', release: 1.6 }).connect(output);
  const bass = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.5 },
  }).connect(output);
  const percussion = new Tone.PolySynth(Tone.MembraneSynth).connect(output);
  if (preset === 'minimal-piano') {
    violin.volume.value = -18;
    cello.volume.value = -20;
    percussion.volume.value = -24;
  }
  await Tone.loaded();
  const harmony = new LayeredVoice([violin, cello]);
  return {
    melody: piano, harmony, bass, percussion, fallback: false,
    dispose() {
      piano.dispose(); harmony.dispose(); bass.dispose(); percussion.dispose();
      output.dispose(); limiter.dispose();
    },
  };
}

export function createFallbackBank(): InstrumentBank {
  return createElectronicBank(true);
}

export async function createInstrumentBank(
  preset: TimbrePreset,
  load: () => Promise<InstrumentBank> = () => loadPresetBank(preset),
  fallback: () => InstrumentBank = createFallbackBank,
): Promise<InstrumentBank> {
  try {
    return await load();
  } catch {
    try {
      return await load();
    } catch {
      return fallback();
    }
  }
}
