import * as Tone from 'tone';
import type { Score } from '../domain/types';
import { createInstrumentBank, type InstrumentBank } from './instruments';
import { scheduleScoreEvents } from './schedule';

export interface TransportPort {
  unlock(): Promise<void>;
  cancel(): void;
  schedule(callback: (time: number) => void, seconds: number): void;
  start(seconds: number): void;
  pause(): void;
  stop(): void;
  seconds: number;
}

const tonePort: TransportPort = {
  unlock: () => Tone.start(),
  cancel: () => Tone.getTransport().cancel(),
  schedule: (callback, seconds) => { Tone.getTransport().schedule(callback, seconds); },
  start: (seconds) => {
    Tone.getTransport().seconds = seconds;
    Tone.getTransport().start();
  },
  pause: () => Tone.getTransport().pause(),
  stop: () => { Tone.getTransport().stop(); Tone.getTransport().seconds = 0; },
  get seconds() { return Tone.getTransport().seconds; },
  set seconds(value: number) { Tone.getTransport().seconds = value; },
};

export class AudioEngine {
  private bank: InstrumentBank | null = null;
  private bankPreset: Score['settings']['timbre'] | null = null;
  private timer: number | null = null;
  private transportActive = false;
  private playRequestId = 0;

  constructor(
    private readonly loadBank: (preset: Score['settings']['timbre']) => Promise<InstrumentBank>
      = (preset) => createInstrumentBank(preset),
    private readonly transport: TransportPort = tonePort,
  ) {}

  async play(
    score: Score,
    fromSeconds: number,
    onUpdate: (seconds: number, tokenId: string | null) => void,
    onEnded: () => void = () => undefined,
  ): Promise<boolean | undefined> {
    const requestId = ++this.playRequestId;
    await this.transport.unlock();
    if (requestId !== this.playRequestId) return undefined;
    if (!this.bank || this.bankPreset !== score.settings.timbre) {
      let loadedBank: InstrumentBank;
      try {
        loadedBank = await this.loadBank(score.settings.timbre);
      } catch (error) {
        if (requestId !== this.playRequestId) return undefined;
        throw error;
      }
      if (requestId !== this.playRequestId) {
        loadedBank.dispose();
        return undefined;
      }
      this.bank?.dispose();
      this.bank = loadedBank;
      this.bankPreset = score.settings.timbre;
    }
    if (requestId !== this.playRequestId) return undefined;
    this.transport.cancel();
    scheduleScoreEvents(
      score.noteEvents,
      score.settings.bpm,
      this.bank,
      (seconds, callback) => this.transport.schedule(callback, seconds),
      (tokenId, seconds, audioTime) => {
        Tone.getDraw().schedule(() => onUpdate(seconds, tokenId), audioTime);
      },
    );
    this.transport.start(fromSeconds);
    this.transportActive = true;
    this.stopTimer();
    this.timer = window.setInterval(() => {
      const seconds = this.transport.seconds;
      onUpdate(seconds, null);
      if (seconds >= score.durationSeconds) {
        this.stop();
        onEnded();
      }
    }, 25);
    return this.bank.fallback;
  }

  pause(): number {
    this.playRequestId += 1;
    if (this.transportActive) this.transport.pause();
    this.stopTimer();
    return this.transport.seconds;
  }

  stop(): void {
    this.playRequestId += 1;
    if (this.transportActive) {
      this.transport.stop();
      this.transport.cancel();
      this.transportActive = false;
    }
    this.stopTimer();
  }

  seek(seconds: number): void {
    if (this.transportActive) this.transport.seconds = Math.max(0, seconds);
  }

  setVolume(volume: number): void {
    const linear = Math.min(1, Math.max(0.0001, volume));
    Tone.getDestination().volume.rampTo(Tone.gainToDb(linear), 0.05);
  }

  dispose(): void {
    this.stop();
    this.bank?.dispose();
    this.bank = null;
    this.bankPreset = null;
  }

  private stopTimer(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }
}
