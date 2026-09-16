import { describe, expect, it } from 'vitest';
import { normalizeIdentityText } from './normalize';

describe('normalizeIdentityText', () => {
  it('normalizes Unicode, punctuation, whitespace, and Traditional Chinese', () => {
    expect(normalizeIdentityText('  春風，\r\n落在河面！ ')).toBe('春风,\n落在河面!');
  });
});
