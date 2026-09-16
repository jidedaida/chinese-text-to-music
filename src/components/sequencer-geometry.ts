import type { NoteEvent } from '../domain/types';

export interface ViewMetrics {
  pixelsPerBeat: number;
  rowHeight: number;
  maxMidi: number;
}

export function eventRectangle(event: NoteEvent, metrics: ViewMetrics) {
  return {
    x: event.startBeat * metrics.pixelsPerBeat,
    y: (metrics.maxMidi - event.midi) * metrics.rowHeight,
    width: Math.max(2, event.durationBeats * metrics.pixelsPerBeat),
    height: Math.max(4, metrics.rowHeight - 2),
  };
}

export function eventUnderPoint(
  events: NoteEvent[],
  x: number,
  y: number,
  metrics: ViewMetrics,
): NoteEvent | undefined {
  return events.find((event) => {
    const rectangle = eventRectangle(event, metrics);
    return x >= rectangle.x && x <= rectangle.x + rectangle.width
      && y >= rectangle.y && y <= rectangle.y + rectangle.height;
  });
}
