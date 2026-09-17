import { fireEvent, render, screen } from '@testing-library/react';
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
    const { getByLabelText } = render(
      <SequencerCanvas score={score} playheadSeconds={0} activeTokenId="token-0" onSeekToken={onSeekToken} />,
    );
    expect(screen.getByText(/当前词语“春风”.*声部“主旋律”/u)).toBeInTheDocument();
    expect(screen.queryByText('token-0')).not.toBeInTheDocument();
    fireEvent.click(getByLabelText('二维音序器'), { clientX: 5, clientY: 194 });
    expect(onSeekToken).toHaveBeenCalledWith('token-0');
  });
});
