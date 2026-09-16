import { useEffect, useRef, useState } from 'react';
import type { Score } from '../domain/types';
import { eventRectangle, eventUnderPoint } from './sequencer-geometry';

interface Props {
  score: Score;
  playheadSeconds: number;
  activeTokenId: string | null;
  onSeekToken: (tokenId: string) => void;
}

const METRICS = { pixelsPerBeat: 20, rowHeight: 8, maxMidi: 84 };
const COLORS: Record<string, string> = {
  melody: '#cf5736', harmony: '#665fc2', bass: '#27866d', percussion: '#d69a25',
};

export function SequencerCanvas({ score, playheadSeconds, activeTokenId, onSeekToken }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 640, scrollLeft: 0 });
  const totalBeats = score.durationSeconds * score.settings.bpm / 60;
  const contentWidth = Math.max(640, totalBeats * METRICS.pixelsPerBeat + 32);
  useEffect(() => {
    setViewport((current) => ({
      ...current,
      width: scrollRef.current?.clientWidth || current.width,
    }));
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const scale = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || viewport.width;
    const height = canvas.clientHeight;
    canvas.width = width * scale;
    canvas.height = height * scale;
    context.scale(scale, scale);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#fffefa';
    context.fillRect(0, 0, width, height);
    const visible = score.noteEvents.filter((event) => {
      const rectangle = eventRectangle(event, METRICS);
      return rectangle.x + rectangle.width >= viewport.scrollLeft
        && rectangle.x <= viewport.scrollLeft + width;
    });
    for (const event of visible) {
      const rectangle = eventRectangle(event, METRICS);
      context.fillStyle = COLORS[event.trackId] ?? '#777';
      context.globalAlpha = event.tokenId === activeTokenId ? 1 : 0.74;
      const x = rectangle.x - viewport.scrollLeft;
      context.fillRect(x, rectangle.y, rectangle.width, rectangle.height);
      if (event.tokenId === activeTokenId) {
        context.strokeStyle = '#211f1b';
        context.strokeRect(x - 1, rectangle.y - 1, rectangle.width + 2, rectangle.height + 2);
      }
    }
    context.globalAlpha = 1;
    const playheadBeat = playheadSeconds * score.settings.bpm / 60;
    context.fillStyle = '#211f1b';
    context.fillRect(playheadBeat * METRICS.pixelsPerBeat - viewport.scrollLeft, 0, 2, height);
  }, [score, playheadSeconds, activeTokenId, viewport]);

  return (
    <div
      ref={scrollRef}
      className="sequencer-scroll"
      onScroll={(event) => setViewport({
        width: event.currentTarget.clientWidth || 640,
        scrollLeft: event.currentTarget.scrollLeft,
      })}
    >
      <div className="score-surface" style={{ width: contentWidth }}>
        <canvas
          ref={canvasRef}
          className="sequencer-canvas"
          style={{ width: viewport.width }}
          aria-label="二维音序器"
          tabIndex={0}
          onClick={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const hit = eventUnderPoint(
              score.noteEvents,
              event.clientX - bounds.left + viewport.scrollLeft,
              event.clientY - bounds.top,
              METRICS,
            );
            if (hit?.tokenId) onSeekToken(hit.tokenId);
          }}
        />
      </div>
      <span className="sr-only" aria-live="polite">
        当前词语 {activeTokenId ?? '无'}，时间 {playheadSeconds.toFixed(1)} 秒
      </span>
    </div>
  );
}
