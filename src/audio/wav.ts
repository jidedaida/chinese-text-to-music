function writeText(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

export function encodeWav(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  if (channels.length !== 2) throw new Error('WAV export requires two channels');
  const frameCount = Math.min(channels[0].length, channels[1].length);
  const dataBytes = frameCount * channels.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  writeText(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeText(view, 8, 'WAVE');
  writeText(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeText(view, 36, 'data');
  view.setUint32(40, dataBytes, true);
  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (const channel of channels) {
      const sample = Math.max(-0.999, Math.min(0.999, channel[frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return buffer;
}
