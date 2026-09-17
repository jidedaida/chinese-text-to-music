import { describe, expect, it } from 'vitest';
import { releaseLabel } from './channel';

describe('releaseLabel', () => {
  it('labels preview builds', () => {
    expect(releaseLabel('preview')).toBe('测试版 · PREVIEW');
  });

  it('does not label production or unspecified builds', () => {
    expect(releaseLabel('production')).toBeNull();
    expect(releaseLabel(undefined)).toBeNull();
  });
});
