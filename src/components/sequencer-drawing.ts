import type { TrackKind } from '../domain/types';

export interface EventRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function drawTrackShape(
  context: CanvasRenderingContext2D,
  track: TrackKind,
  rectangle: EventRectangle,
  color: string,
) {
  const { x, y, width, height } = rectangle;
  context.save();
  context.fillStyle = color;
  context.strokeStyle = '#211f1b';

  if (track === 'melody') {
    context.beginPath();
    context.roundRect(x, y, width, height, Math.min(4, height / 2));
    context.fill();
    context.stroke();
  } else if (track === 'harmony') {
    context.fillStyle = `${color}55`;
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);
    context.strokeRect(x + 2, y + 2, width - 4, height - 4);
  } else if (track === 'bass') {
    context.fillRect(x, y, width, height);
    context.fillStyle = '#155844';
    context.fillRect(x, y + height - 3, width, 3);
  } else {
    const half = Math.max(4, height / 2);
    const centerX = x + Math.max(half, width / 2);
    context.beginPath();
    context.moveTo(centerX, y);
    context.lineTo(centerX + half, y + half);
    context.lineTo(centerX, y + height);
    context.lineTo(centerX - half, y + half);
    context.closePath();
    context.fill();
    context.stroke();
  }

  context.restore();
}
