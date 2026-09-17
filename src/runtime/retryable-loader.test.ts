import { describe, expect, it, vi } from 'vitest';
import { createRetryableLoader } from './retryable-loader';

describe('createRetryableLoader', () => {
  it('shares a successful in-flight load', async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const initialize = createRetryableLoader(load);
    await Promise.all([initialize(), initialize(), initialize()]);
    expect(load).toHaveBeenCalledOnce();
  });

  it('allows a retry after failure', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    const initialize = createRetryableLoader(load);
    await expect(initialize()).rejects.toThrow('offline');
    await expect(initialize()).resolves.toBeUndefined();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
