import type { Score } from '../domain/types';

export interface AudioEnginePort {
  play(
    score: Score,
    fromSeconds: number,
    onUpdate: (seconds: number, tokenId: string | null) => void,
    onEnded?: () => void,
  ): Promise<boolean | undefined>;
  pause(): number;
  stop(): void;
  setVolume(volume: number): void;
  dispose(): void;
}

type Factory = () => Promise<AudioEnginePort>;

const defaultFactory: Factory = async () => {
  const { AudioEngine } = await import('./engine');
  return new AudioEngine();
};

export class LazyAudioEngine {
  private instance: AudioEnginePort | null = null;
  private pending: Promise<AudioEnginePort> | null = null;
  private loadGeneration = 0;
  private requestId = 0;
  private volume = 0.8;

  constructor(private readonly factory: Factory = defaultFactory) {}

  private async get(): Promise<AudioEnginePort> {
    if (this.instance) return this.instance;
    if (!this.pending) {
      const generation = this.loadGeneration;
      const loading = this.factory()
        .then((instance) => {
          if (generation !== this.loadGeneration || this.pending !== loading) {
            instance.dispose();
            return instance;
          }
          this.instance = instance;
          instance.setVolume(this.volume);
          return instance;
        })
        .catch((error) => {
          if (this.pending === loading) this.pending = null;
          throw error;
        });
      this.pending = loading;
    }
    return this.pending;
  }

  async play(
    score: Score,
    fromSeconds: number,
    onUpdate: (seconds: number, tokenId: string | null) => void,
    onEnded: () => void = () => undefined,
  ): Promise<boolean | undefined> {
    const requestId = ++this.requestId;
    let instance: AudioEnginePort;
    try {
      instance = await this.get();
    } catch (error) {
      if (requestId !== this.requestId) return undefined;
      throw error;
    }
    if (requestId !== this.requestId) return undefined;
    return instance.play(score, fromSeconds, onUpdate, onEnded);
  }

  pause(): number {
    this.requestId += 1;
    return this.instance?.pause() ?? 0;
  }

  stop(): void {
    this.requestId += 1;
    this.instance?.stop();
  }

  setVolume(volume: number): void {
    this.volume = volume;
    this.instance?.setVolume(volume);
  }

  dispose(): void {
    this.requestId += 1;
    this.loadGeneration += 1;
    this.instance?.dispose();
    this.instance = null;
    this.pending = null;
  }
}
