import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Score } from './domain/types';

const dependencies = vi.hoisted(() => ({
  initialize: vi.fn(),
  analyze: vi.fn(),
  compose: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  stop: vi.fn(),
  setVolume: vi.fn(),
  dispose: vi.fn(),
  exportScoreWav: vi.fn(),
}));

vi.mock('./text/analyze', () => ({
  initializeTextAnalyzer: dependencies.initialize,
  analyzeText: dependencies.analyze,
}));

vi.mock('./music/compose', () => ({ composeScore: dependencies.compose }));

vi.mock('./audio/lazy-engine', () => ({
  LazyAudioEngine: class {
    play = dependencies.play;
    pause = dependencies.pause;
    stop = dependencies.stop;
    setVolume = dependencies.setVolume;
    dispose = dependencies.dispose;
  },
}));

vi.mock('./audio/exporter', () => ({ exportScoreWav: dependencies.exportScoreWav }));

import { App } from './App';

const SOURCE_TEXT = '春风吹过山谷星光落在河面';
const score = {
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
} satisfies Score;

async function generateScore() {
  fireEvent.change(screen.getByLabelText('中文原文'), { target: { value: SOURCE_TEXT } });
  fireEvent.click(screen.getByRole('button', { name: '生成音乐' }));
  await screen.findByText('曲目已生成');
}

describe('App lazy runtime errors', () => {
  beforeEach(() => {
    for (const dependency of Object.values(dependencies)) dependency.mockReset();
    dependencies.initialize.mockResolvedValue(undefined);
    dependencies.analyze.mockReturnValue([]);
    dependencies.compose.mockResolvedValue(score);
    dependencies.pause.mockReturnValue(0);
  });

  it('hides playback internals and tells the user how to retry', async () => {
    dependencies.play.mockRejectedValue(new Error('audio engine chunk exploded'));
    render(<App />);
    await generateScore();

    fireEvent.click(screen.getByRole('button', { name: '播放' }));

    expect(await screen.findByText('音频启动失败，请再次点击播放重试')).toBeInTheDocument();
    expect(screen.queryByText('audio engine chunk exploded')).not.toBeInTheDocument();
    expect(screen.getByLabelText('中文原文')).toHaveValue(SOURCE_TEXT);
    expect(screen.getByLabelText('二维音序器')).toBeInTheDocument();
  });

  it('hides exporter internals and tells the user how to retry', async () => {
    dependencies.exportScoreWav.mockRejectedValue(new Error('offline renderer failed'));
    render(<App />);
    await generateScore();

    fireEvent.click(screen.getByRole('button', { name: '下载 WAV' }));

    expect(await screen.findByText('WAV 导出失败，请重试')).toBeInTheDocument();
    expect(screen.queryByText('offline renderer failed')).not.toBeInTheDocument();
    expect(screen.getByLabelText('中文原文')).toHaveValue(SOURCE_TEXT);
    expect(screen.getByLabelText('二维音序器')).toBeInTheDocument();
  });
});
