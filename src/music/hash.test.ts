import { describe, expect, it } from 'vitest';
import { sha256Hex, stableStringify } from './hash';

describe('hash helpers', () => {
  it('matches the SHA-256 reference vector', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('sorts object keys recursively', () => {
    expect(stableStringify({ z: 1, a: { y: 2, b: 3 } })).toBe(
      '{"a":{"b":3,"y":2},"z":1}',
    );
  });
});
