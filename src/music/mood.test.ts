import { describe, expect, it } from 'vitest';
import type { Token } from '../domain/types';
import { inferMood } from './mood';

function tokens(text: string): Token[] {
  return Array.from(text, (normalized, index) => ({
    id: `token-${index}`, raw: normalized, normalized,
    sourceStart: index, sourceEnd: index + 1,
    pinyin: [], tones: [], kind: 'word' as const,
  }));
}

describe('inferMood', () => {
  it('classifies approved local moods and defaults neutral text to calm', () => {
    expect(inferMood(tokens('阳光希望快乐'))).toBe('bright');
    expect(inferMood(tokens('孤独离别雨夜'))).toBe('melancholic');
    expect(inferMood(tokens('山川道路房屋'))).toBe('calm');
  });
});
