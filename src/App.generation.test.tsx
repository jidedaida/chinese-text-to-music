import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Score } from './domain/types';

const dependencies = vi.hoisted(() => ({
  initialize: vi.fn(),
  analyze: vi.fn(),
  compose: vi.fn(),
}));

vi.mock('./text/analyze', () => ({
  initializeTextAnalyzer: dependencies.initialize,
  analyzeText: dependencies.analyze,
}));

vi.mock('./music/compose', () => ({ composeScore: dependencies.compose }));

import { App } from './App';

const TEXT_A = '春风吹过山谷星光落在河面';
const TEXT_B = '秋雨落在湖面远山渐渐清晰';

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function startGeneration(text = TEXT_A) {
  fireEvent.change(screen.getByLabelText('中文原文'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: '生成音乐' }));
}

describe('App generation lifecycle', () => {
  beforeEach(() => {
    dependencies.initialize.mockReset();
    dependencies.analyze.mockReset().mockReturnValue([]);
    dependencies.compose.mockReset().mockResolvedValue(score);
  });

  it('ignores a generation superseded by a text edit before initialization resolves', async () => {
    const initialization = deferred<void>();
    dependencies.initialize.mockReturnValue(initialization.promise);
    render(<App />);

    startGeneration();
    fireEvent.change(screen.getByLabelText('中文原文'), { target: { value: TEXT_B } });
    await act(async () => {
      initialization.resolve(undefined);
      await initialization.promise;
    });

    expect(screen.getByLabelText('中文原文')).toHaveValue(TEXT_B);
    expect(dependencies.analyze).not.toHaveBeenCalled();
    expect(dependencies.compose).not.toHaveBeenCalled();
    expect(screen.queryByText('曲目已生成')).not.toBeInTheDocument();
    expect(screen.getByText('生成后在这里显示曲谱')).toBeInTheDocument();
  });

  it('does not continue generation after unmount', async () => {
    const initialization = deferred<void>();
    dependencies.initialize.mockReturnValue(initialization.promise);
    const view = render(<App />);

    startGeneration();
    await waitFor(() => expect(dependencies.initialize).toHaveBeenCalledOnce());
    view.unmount();
    await act(async () => {
      initialization.resolve(undefined);
      await initialization.promise;
    });

    expect(dependencies.analyze).not.toHaveBeenCalled();
    expect(dependencies.compose).not.toHaveBeenCalled();
  });

  it('ignores a composition failure after the request is superseded', async () => {
    const composition = deferred<Score>();
    dependencies.initialize.mockResolvedValue(undefined);
    dependencies.compose.mockReturnValue(composition.promise);
    render(<App />);

    startGeneration();
    await waitFor(() => expect(dependencies.compose).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByLabelText('中文原文'), { target: { value: TEXT_B } });
    await act(async () => {
      composition.reject(new Error('stale failure'));
      await composition.promise.catch(() => undefined);
    });

    expect(screen.queryByText('stale failure')).not.toBeInTheDocument();
    expect(screen.queryByText('曲目已生成')).not.toBeInTheDocument();
  });

  it('completes a current generation under StrictMode', async () => {
    dependencies.initialize.mockResolvedValue(undefined);
    render(<StrictMode><App /></StrictMode>);

    startGeneration();

    await waitFor(
      () => expect(screen.getByText('曲目已生成')).toBeInTheDocument(),
      { timeout: 5000 },
    );
    expect(dependencies.initialize).toHaveBeenCalledOnce();
    expect(dependencies.analyze).toHaveBeenCalledWith(TEXT_A);
    expect(dependencies.compose).toHaveBeenCalledOnce();
  });
});
