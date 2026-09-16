import { describe, expect, it, vi } from 'vitest';
import type { InstrumentBank } from './instruments';
import { createInstrumentBank } from './instruments';

const fakeBank = { fallback: false, dispose: vi.fn() } as unknown as InstrumentBank;
const fallbackBank = { fallback: true, dispose: vi.fn() } as unknown as InstrumentBank;

describe('createInstrumentBank', () => {
  it('retries sample loading once before using the synth fallback', async () => {
    const load = vi.fn().mockRejectedValue(new Error('network'));
    const fallback = vi.fn().mockReturnValue(fallbackBank);
    await expect(createInstrumentBank('chamber-piano', load, fallback)).resolves.toBe(fallbackBank);
    expect(load).toHaveBeenCalledTimes(2);
    expect(fallback).toHaveBeenCalledOnce();
  });

  it('returns sampled instruments without creating fallback voices', async () => {
    const load = vi.fn().mockResolvedValue(fakeBank);
    const fallback = vi.fn();
    await expect(createInstrumentBank('chamber-piano', load, fallback)).resolves.toBe(fakeBank);
    expect(fallback).not.toHaveBeenCalled();
  });
});
