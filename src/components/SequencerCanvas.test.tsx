import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Score } from '../domain/types';
import { SequencerCanvas } from './SequencerCanvas';

describe('SequencerCanvas', () => {
  it('requests token seek when a melody note is clicked', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      scale: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(),
      beginPath: vi.fn(), closePath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), save: vi.fn(), restore: vi.fn(),
      fillStyle: '', strokeStyle: '', globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 640, bottom: 520,
      width: 640, height: 520, toJSON: () => ({}),
    });
    const onSeekToken = vi.fn();
    const score = {
      settings: { bpm: 84 }, durationSeconds: 30,
      tokens: [{ id: 'token-0', raw: '春风', normalized: '春风', sourceStart: 0, sourceEnd: 2,
        pinyin: ['chun1', 'feng1'], tones: [1, 1], kind: 'word' }],
      tracks: [{ id: 'melody', kind: 'melody', label: '主旋律' }],
      noteEvents: [{
        id: 'melody-0', tokenId: 'token-0', trackId: 'melody',
        startBeat: 0, durationBeats: 1, midi: 60, velocity: 0.7,
      }],
    } as Score;
    const { container, getByLabelText } = render(
      <SequencerCanvas score={score} playheadSeconds={0} activeTokenId="token-0" onSeekToken={onSeekToken} />,
    );
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveTextContent(/当前词语“春风”.*声部“主旋律”/u);
    expect(liveRegion).toHaveTextContent('时间 0.0 秒');
    expect(liveRegion?.textContent).not.toContain('token-0');
    fireEvent.click(getByLabelText('二维音序器'), { clientX: 5, clientY: 194 });
    expect(onSeekToken).toHaveBeenCalledWith('token-0');
  });

  it('does not announce an accompaniment track when no token is active', () => {
    const score = {
      settings: { bpm: 84 }, durationSeconds: 30,
      tokens: [],
      tracks: [{ id: 'harmony', kind: 'harmony', label: '和声' }],
      noteEvents: [{
        id: 'harmony-0', tokenId: null, trackId: 'harmony',
        startBeat: 0, durationBeats: 1, midi: 60, velocity: 0.7,
      }],
    } as unknown as Score;
    const { container } = render(
      <SequencerCanvas score={score} playheadSeconds={1.2} activeTokenId={null} onSeekToken={vi.fn()} />,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent('当前词语“无”');
    expect(liveRegion).toHaveTextContent('声部“无”');
  });
});
