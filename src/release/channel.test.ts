import { afterEach, describe, expect, it, vi } from 'vitest';
import { releaseLabel } from './channel';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('releaseLabel', () => {
  it('labels preview builds', () => {
    expect(releaseLabel('preview')).toBe('测试版 · PREVIEW');
  });

  it('does not label production or unspecified builds', () => {
    expect(releaseLabel('production')).toBeNull();
    vi.stubEnv('VITE_RELEASE_CHANNEL', undefined as unknown as string);
    expect(releaseLabel(undefined)).toBeNull();
  });
});
