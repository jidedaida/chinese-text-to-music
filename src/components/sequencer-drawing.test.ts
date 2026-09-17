import { describe, expect, it, vi } from 'vitest';
import { drawTrackShape } from './sequencer-drawing';

function createContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
}

describe('drawTrackShape', () => {
  it('draws melody notes as rounded filled shapes', () => {
    const context = createContext();

    drawTrackShape(context, 'melody', { x: 10, y: 20, width: 40, height: 8 }, '#cf5736');

    expect(context.roundRect).toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalled();
  });

  it('draws harmony notes with an outer and inset outline', () => {
    const context = createContext();

    drawTrackShape(context, 'harmony', { x: 10, y: 20, width: 40, height: 8 }, '#665fc2');

    expect(context.strokeRect).toHaveBeenCalledTimes(2);
  });

  it('draws bass notes with a solid body and floor edge', () => {
    const context = createContext();

    drawTrackShape(context, 'bass', { x: 10, y: 20, width: 40, height: 8 }, '#27866d');

    expect(context.fillRect).toHaveBeenCalledTimes(2);
  });

  it('draws percussion notes as diamonds', () => {
    const context = createContext();

    drawTrackShape(context, 'percussion', { x: 10, y: 20, width: 40, height: 8 }, '#d69a25');

    expect(context.moveTo).toHaveBeenCalledWith(30, 20);
    expect(context.lineTo).toHaveBeenCalledTimes(3);
    expect(context.closePath).toHaveBeenCalled();
  });
});
