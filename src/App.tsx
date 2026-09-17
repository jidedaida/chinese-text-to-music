import { useEffect, useReducer, useRef } from 'react';
import { LazyAudioEngine } from './audio/lazy-engine';
import { Compatibility } from './components/Compatibility';
import { ControlPanel } from './components/ControlPanel';
import { SequencerCanvas } from './components/SequencerCanvas';
import { TextPanel } from './components/TextPanel';
import { TransportBar } from './components/TransportBar';
import { validateInput } from './domain/input';
import type { Score } from './domain/types';
import { composeScore } from './music/compose';
import { initialAppState, reducer } from './state/reducer';
import { analyzeText, initializeTextAnalyzer } from './text/analyze';
import { releaseLabel } from './release/channel';

export function App() {
  const [state, dispatch] = useReducer(reducer, initialAppState);
  const previewLabel = releaseLabel();
  const engineRef = useRef<LazyAudioEngine | null>(null);
  engineRef.current ??= new LazyAudioEngine();
  useEffect(() => () => engineRef.current?.dispose(), []);
  const validation = validateInput(state.text);

  async function generate() {
    engineRef.current?.stop();
    dispatch({ type: 'GENERATE' });
    try {
      await initializeTextAnalyzer();
      const score = await composeScore(analyzeText(state.text), state.settings);
      dispatch({ type: 'GENERATION_SUCCEEDED', score });
    } catch (error) {
      dispatch({
        type: 'GENERATION_FAILED',
        message: error instanceof Error ? error.message : '生成失败，请重试',
      });
    }
  }

  async function startPlayback(score: Score, fromSeconds: number) {
    dispatch({ type: 'PLAY' });
    try {
      const fallback = await engineRef.current!.play(
        score,
        fromSeconds,
        (playheadSeconds, tokenId) => dispatch({ type: 'PLAYHEAD', playheadSeconds, tokenId }),
        () => dispatch({ type: 'STOP' }),
      );
      if (fallback === undefined) return;
      dispatch({
        type: 'NOTICE',
        message: fallback ? '钢琴或弦乐采样加载失败，正在使用兼容合成音色。' : null,
      });
    } catch (error) {
      dispatch({
        type: 'PLAY_FAILED',
        message: error instanceof Error ? error.message : '音频启动失败，请再次点击播放',
      });
    }
  }

  function seekToken(tokenId: string) {
    const event = state.score?.noteEvents.find(
      (item) => item.trackId === 'melody' && item.tokenId === tokenId,
    );
    if (!event || !state.score) return;
    const playheadSeconds = event.startBeat * 60 / state.score.settings.bpm;
    dispatch({
      type: 'SEEK',
      playheadSeconds,
      tokenId,
    });
    void startPlayback(state.score, playheadSeconds);
  }

  const status = state.phase === 'generating'
    ? '正在生成曲目…'
    : state.error
      ? state.error
      : state.dirty
        ? '文字或参数已变化，请重新生成'
        : state.phase === 'ready'
          ? '曲目已生成'
          : null;

  return (
    <main className="app-shell">
      <header className="masthead">
        <div><h1>字谱</h1><p>让每一段中文拥有稳定的音乐指纹。</p></div>
        <div className="masthead-meta">
          {previewLabel && <span className="preview-badge">{previewLabel}</span>}
          <span className="privacy-mark">本地生成 · 不上传原文</span>
        </div>
      </header>
      <Compatibility />
      {status && <div className="status" role="status">{status}</div>}
      {state.notice && <div className="status" role="status">{state.notice}</div>}
      <div className="workstation">
        <TextPanel
          text={state.text}
          score={state.score}
          activeTokenId={state.activeTokenId}
          onChange={(text) => {
            engineRef.current?.stop();
            dispatch({ type: 'EDIT_TEXT', text });
          }}
          onSeekToken={seekToken}
        />
        <section className="panel sequencer-panel" aria-label="曲谱画布">
          {state.score ? (
            <SequencerCanvas
              score={state.score}
              playheadSeconds={state.playheadSeconds}
              activeTokenId={state.activeTokenId}
              onSeekToken={seekToken}
            />
          ) : (
            <div className="empty-score">生成后在这里显示曲谱</div>
          )}
        </section>
        <ControlPanel
          settings={state.settings}
          disabled={['generating', 'exporting', 'playing'].includes(state.phase)}
          canGenerate={validation.code === 'valid'}
          onChange={(settings) => {
            engineRef.current?.stop();
            dispatch({ type: 'EDIT_SETTINGS', settings });
          }}
          onGenerate={generate}
        />
      </div>
      <TransportBar
        ready={Boolean(state.score) && !['generating', 'exporting'].includes(state.phase)}
        playing={state.phase === 'playing'}
        exporting={state.phase === 'exporting'}
        currentSeconds={state.playheadSeconds}
        durationSeconds={state.score?.durationSeconds ?? 0}
        volume={state.volume}
        onPlay={async () => {
          if (!state.score) return;
          await startPlayback(state.score, state.playheadSeconds);
        }}
        onPause={() => dispatch({ type: 'PAUSE', playheadSeconds: engineRef.current!.pause() })}
        onStop={() => { engineRef.current!.stop(); dispatch({ type: 'STOP' }); }}
        onVolumeChange={(volume) => {
          engineRef.current!.setVolume(volume);
          dispatch({ type: 'VOLUME', volume });
        }}
        onExport={async () => {
          if (!state.score) return;
          dispatch({ type: 'EXPORT' });
          try {
            const { exportScoreWav } = await import('./audio/exporter');
            const blob = await exportScoreWav(state.score);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `zipu-${state.score.musicHash.slice(0, 10)}.wav`;
            anchor.click();
            URL.revokeObjectURL(url);
            dispatch({ type: 'EXPORT_FINISHED' });
          } catch (error) {
            dispatch({
              type: 'EXPORT_FAILED',
              message: error instanceof Error ? error.message : 'WAV 导出失败，请关闭其他标签页后重试',
            });
          }
        }}
      />
    </main>
  );
}
