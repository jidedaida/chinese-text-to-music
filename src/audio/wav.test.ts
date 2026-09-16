import { describe, expect, it } from 'vitest';
import { encodeWav } from './wav';

describe('encodeWav', () => {
  it('writes a stereo 44.1 kHz 16-bit RIFF/WAVE file', () => {
    const bytes = encodeWav([new Float32Array(441), new Float32Array(441)], 44_100);
    const view = new DataView(bytes);
    const text = (offset: number, length: number) =>
      String.fromCharCode(...new Uint8Array(bytes, offset, length));
    expect(text(0, 4)).toBe('RIFF');
    expect(text(8, 4)).toBe('WAVE');
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(44_100);
    expect(view.getUint16(34, true)).toBe(16);
  });
});
