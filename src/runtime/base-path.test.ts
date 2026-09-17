import { describe, expect, it } from 'vitest';
import { withBasePath } from './base-path';

describe('withBasePath', () => {
  it('keeps local development assets at the site root', () => {
    expect(withBasePath('audio/piano/', '/')).toBe('/audio/piano/');
  });

  it('places preview assets below the repository path', () => {
    expect(withBasePath('/audio/violin/', '/chinese-text-to-music/'))
      .toBe('/chinese-text-to-music/audio/violin/');
  });
});
