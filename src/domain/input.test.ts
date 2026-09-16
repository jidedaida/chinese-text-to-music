import { describe, expect, it } from 'vitest';
import { countEffectiveCharacters, validateInput } from './input';

describe('input validation', () => {
  it('counts letters, numbers, and Han characters but not punctuation or space', () => {
    expect(countEffectiveCharacters('春风，A1！ ')).toBe(4);
  });

  it('enforces the inclusive 10 to 300 range', () => {
    expect(validateInput('春'.repeat(9)).code).toBe('too-short');
    expect(validateInput('春'.repeat(10)).code).toBe('valid');
    expect(validateInput('春'.repeat(300)).code).toBe('valid');
    expect(validateInput('春'.repeat(301)).code).toBe('too-long');
  });

  it('rejects punctuation-only text', () => {
    expect(validateInput('，。！？').code).toBe('empty');
  });
});
