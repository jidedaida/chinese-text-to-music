import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Score } from '../domain/types';
import { SequencerCanvas } from './SequencerCanvas';

describe('SequencerCanvas', () => {
  it('requests token seek when a melody note is clicked', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      scale: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(),
      fillStyle: '', strokeStyle: '', globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 640, bottom: 520,
      width: 640, height: 520, toJSON: () => ({}),
    });
    const onSeekToken = vi.fn();
    const score = {
      settings: { bpm: 84 }, durationSeconds: 30,
      noteEvents: [{
        id: 'melody-0', tokenId: 'token-0', trackId: 'melody',
        startBeat: 0, durationBeats: 1, midi: 60, velocity: 0.7,
      }],
    } as Score;
    const { getByLabelText } = render(
      <SequencerCanvas score={score} playheadSeconds={0} activeTokenId={null} onSeekToken={onSeekToken} />,
    );
    fireEvent.click(getByLabelText('二维音序器'), { clientX: 5, clientY: 194 });
    expect(onSeekToken).toHaveBeenCalledWith('token-0');
  });
});
