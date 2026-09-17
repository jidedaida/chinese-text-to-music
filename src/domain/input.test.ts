import { describe, expect, it } from 'vitest';
import {
  countEffectiveCharacters,
  sourceIndexOfEffectiveCharacter,
  validateInput,
} from './input';

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

  it('locates an effective character in the unnormalized source', () => {
    const source = `${'春'.repeat(300)}，遠方`;
    expect(sourceIndexOfEffectiveCharacter(source, 301)).toBe(301);
  });

  it('keeps NFC combining sequences mapped to their original start', () => {
    const source = `e\u0301${'春'.repeat(300)}`;
    expect(sourceIndexOfEffectiveCharacter(source, 301)).toBe(301);
    expect(sourceIndexOfEffectiveCharacter(source, 302)).toBeNull();
  });

  it('maps each effective letter inside a grapheme to its own source offset', () => {
    const source = `${'春'.repeat(299)}क्ष`;
    expect(sourceIndexOfEffectiveCharacter(source, 301)).toBe(301);
  });

  it('skips a non-effective prepend character within a grapheme', () => {
    const source = `${'春'.repeat(300)}\u0600遠`;
    expect(sourceIndexOfEffectiveCharacter(source, 301)).toBe(301);
  });
});
