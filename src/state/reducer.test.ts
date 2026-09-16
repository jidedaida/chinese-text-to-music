import { describe, expect, it } from 'vitest';
import { initialAppState, reducer } from './reducer';

describe('application reducer', () => {
  it('marks a ready score dirty without deleting it', () => {
    const ready = { ...initialAppState, phase: 'ready' as const, score: { musicHash: 'abc' } as never };
    const next = reducer(ready, { type: 'EDIT_TEXT', text: '新的文字内容足够十个字符' });
    expect(next.phase).toBe('dirty');
    expect(next.score).toBe(ready.score);
  });

  it('keeps the previous score when generation fails', () => {
    const generating = {
      ...initialAppState,
      phase: 'generating' as const,
      score: { musicHash: 'previous' } as never,
    };
    const next = reducer(generating, { type: 'GENERATION_FAILED', message: '生成失败' });
    expect(next.phase).toBe('error');
    expect(next.score).toBe(generating.score);
    expect(next.error).toBe('生成失败');
  });

  it('moves through play, pause, and stop without changing the score', () => {
    const ready = { ...initialAppState, phase: 'ready' as const, score: { musicHash: 'abc' } as never };
    const playing = reducer(ready, { type: 'PLAY' });
    const paused = reducer(playing, { type: 'PAUSE', playheadSeconds: 3 });
    const stopped = reducer(paused, { type: 'STOP' });
    expect([playing.phase, paused.phase, stopped.phase]).toEqual(['playing', 'paused', 'ready']);
    expect(stopped.playheadSeconds).toBe(0);
    expect(stopped.score).toBe(ready.score);
  });

  it('advances the playhead without clearing the active token on timer ticks', () => {
    const playing = {
      ...initialAppState,
      phase: 'playing' as const,
      score: { musicHash: 'abc' } as never,
      activeTokenId: 'token-0',
    };
    const next = reducer(playing, { type: 'PLAYHEAD', playheadSeconds: 2.5, tokenId: null });
    expect(next.playheadSeconds).toBe(2.5);
    expect(next.activeTokenId).toBe('token-0');
  });
});
