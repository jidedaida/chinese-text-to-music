import { describe, expect, it, vi } from 'vitest';
import type { Score } from '../domain/types';
import { LazyAudioEngine, type AudioEnginePort } from './lazy-engine';

const score = {
  settings: { timbre: 'chamber-piano' },
} as Score;

function engine(): AudioEnginePort {
  return {
    play: vi.fn().mockResolvedValue(false), pause: vi.fn(() => 2), stop: vi.fn(),
    setVolume: vi.fn(), dispose: vi.fn(),
  };
}

describe('LazyAudioEngine', () => {
  it('loads once and reuses the engine', async () => {
    const instance = engine();
    const factory = vi.fn().mockResolvedValue(instance);
    const lazy = new LazyAudioEngine(factory);
    await lazy.play(score, 0, vi.fn());
    await lazy.play(score, 3, vi.fn());
    expect(factory).toHaveBeenCalledOnce();
    expect(instance.play).toHaveBeenCalledTimes(2);
  });

  it('cancels a play request stopped during module loading', async () => {
    const instance = engine();
    let finish!: (engine: AudioEnginePort) => void;
    const factory = vi.fn(() => new Promise<AudioEnginePort>((resolve) => { finish = resolve; }));
    const lazy = new LazyAudioEngine(factory);
    const play = lazy.play(score, 0, vi.fn());
    lazy.stop();
    finish(instance);
    await expect(play).resolves.toBeUndefined();
    expect(instance.play).not.toHaveBeenCalled();
  });

  it('disposes a stale engine resolved after disposal and loads a fresh engine', async () => {
    const stale = engine();
    const fresh = engine();
    let finishStale!: (engine: AudioEnginePort) => void;
    const factory = vi.fn()
      .mockImplementationOnce(() => new Promise<AudioEnginePort>((resolve) => {
        finishStale = resolve;
      }))
      .mockResolvedValueOnce(fresh);
    const lazy = new LazyAudioEngine(factory);

    const canceledPlay = lazy.play(score, 0, vi.fn());
    lazy.dispose();
    finishStale(stale);

    await expect(canceledPlay).resolves.toBeUndefined();
    expect(stale.dispose).toHaveBeenCalledOnce();
    expect(stale.play).not.toHaveBeenCalled();

    await lazy.play(score, 0, vi.fn());
    expect(factory).toHaveBeenCalledTimes(2);
    expect(fresh.play).toHaveBeenCalledOnce();
  });

  it('resolves a canceled play when the pending factory rejects', async () => {
    let fail!: (error: Error) => void;
    const factory = vi.fn(() => new Promise<AudioEnginePort>((_resolve, reject) => {
      fail = reject;
    }));
    const lazy = new LazyAudioEngine(factory);

    const play = lazy.play(score, 0, vi.fn());
    lazy.stop();
    fail(new Error('offline'));

    await expect(play).resolves.toBeUndefined();
  });

  it('reports a live factory failure and retries the next play', async () => {
    const instance = engine();
    const factory = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(instance);
    const lazy = new LazyAudioEngine(factory);

    await expect(lazy.play(score, 0, vi.fn())).rejects.toThrow('offline');
    await expect(lazy.play(score, 0, vi.fn())).resolves.toBe(false);
    expect(factory).toHaveBeenCalledTimes(2);
  });
});
