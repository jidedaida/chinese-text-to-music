import { describe, expect, it, vi } from 'vitest';
import type { Score } from '../domain/types';
import { AudioEngine } from './engine';

describe('AudioEngine', () => {
  it('does not touch the transport when stopped before the first play', () => {
    const port = {
      unlock: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(), schedule: vi.fn(), start: vi.fn(), pause: vi.fn(), stop: vi.fn(),
      seconds: 0,
    };
    const engine = new AudioEngine(vi.fn(), port);
    engine.stop();
    expect(port.stop).not.toHaveBeenCalled();
    expect(port.cancel).not.toHaveBeenCalled();
  });

  it('unlocks audio, schedules a score, and starts at the requested second', async () => {
    const port = {
      unlock: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(), schedule: vi.fn(), start: vi.fn(), pause: vi.fn(), stop: vi.fn(),
      seconds: 0,
    };
    const bank = {
      melody: {}, harmony: {}, bass: {}, percussion: {}, fallback: false, dispose: vi.fn(),
    };
    const engine = new AudioEngine(async () => bank as never, port);
    const score: Score = {
      schemaVersion: 'score-v1',
      mappingVersion: 'mapping-v1',
      composerVersion: 'composer-v1',
      seed: 'seed',
      musicHash: 'hash',
      settings: {
        tonic: 0,
        scale: 'major-pentatonic',
        bpm: 84,
        mood: 'calm',
        requestedMood: 'auto',
        timbre: 'chamber-piano',
      },
      durationSeconds: 30,
      tokens: [],
      tracks: [],
      noteEvents: [],
    };
    await engine.play(score, 3, vi.fn());
    expect(port.unlock).toHaveBeenCalledOnce();
    expect(port.start).toHaveBeenCalledWith(3);
  });

  it('does not start an obsolete score after loading is cancelled', async () => {
    const port = {
      unlock: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(), schedule: vi.fn(), start: vi.fn(), pause: vi.fn(), stop: vi.fn(),
      seconds: 0,
    };
    const bank = {
      melody: {}, harmony: {}, bass: {}, percussion: {}, fallback: false, dispose: vi.fn(),
    };
    let finishLoading!: (value: typeof bank) => void;
    const loading = new Promise<typeof bank>((resolve) => { finishLoading = resolve; });
    const engine = new AudioEngine(async () => loading as never, port);
    const score: Score = {
      schemaVersion: 'score-v1', mappingVersion: 'mapping-v1', composerVersion: 'composer-v1',
      seed: 'seed', musicHash: 'hash', durationSeconds: 30, tokens: [], tracks: [], noteEvents: [],
      settings: {
        tonic: 0, scale: 'major-pentatonic', bpm: 84, mood: 'calm',
        requestedMood: 'auto', timbre: 'chamber-piano',
      },
    };

    const play = engine.play(score, 0, vi.fn());
    await vi.waitFor(() => expect(port.unlock).toHaveBeenCalledOnce());
    engine.stop();
    finishLoading(bank);
    await play;

    expect(port.start).not.toHaveBeenCalled();
    expect(bank.dispose).toHaveBeenCalledOnce();
  });
});
