import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';

const audio = vi.hoisted(() => ({
  play: vi.fn().mockResolvedValue(false),
  pause: vi.fn(() => 0),
  stop: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('../audio/engine', () => ({
  AudioEngine: class {
    play = audio.play;
    pause = audio.pause;
    stop = audio.stop;
    seek = audio.seek;
    setVolume = audio.setVolume;
    dispose = audio.dispose;
  },
}));

describe('workstation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates input, generates once, and marks later edits dirty', async () => {
    render(<App />);
    const input = screen.getByLabelText('中文原文');
    const generate = screen.getByRole('button', { name: '生成音乐' });
    expect(generate).toBeDisabled();
    fireEvent.change(input, { target: { value: '春风吹过山谷星光落在河面' } });
    expect(generate).toBeEnabled();
    fireEvent.click(generate);
    await waitFor(() => expect(screen.getByText('曲目已生成')).toBeInTheDocument());
    fireEvent.change(input, { target: { value: '春风吹过山谷星光落在河面清晨' } });
    expect(screen.getByText('文字或参数已变化，请重新生成')).toBeInTheDocument();
  });

  it('exposes the approved mood choices without tension', () => {
    render(<App />);
    const mood = screen.getByLabelText('情绪');
    expect(mood).toHaveTextContent('自动');
    expect(mood).toHaveTextContent('明亮');
    expect(mood).toHaveTextContent('平静');
    expect(mood).toHaveTextContent('忧郁');
    expect(mood).not.toHaveTextContent('紧张');
  });

  it('auditions from the first melody event when a generated word is clicked', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('中文原文'), {
      target: { value: '春风吹过山谷星光落在河面' },
    });
    fireEvent.click(screen.getByRole('button', { name: '生成音乐' }));
    await waitFor(() => expect(screen.getByText('曲目已生成')).toBeInTheDocument());

    const firstWord = screen.getByLabelText('分词与播放位置').querySelector('button:not(:disabled)');
    expect(firstWord).not.toBeNull();
    fireEvent.click(firstWord!);

    await waitFor(() => expect(audio.play).toHaveBeenCalledOnce());
    expect(audio.play.mock.calls[0][1]).toBeGreaterThanOrEqual(0);
    expect(screen.getByRole('button', { name: '暂停' })).toBeEnabled();
  });
});
