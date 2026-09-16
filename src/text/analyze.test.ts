import { beforeAll, describe, expect, it } from 'vitest';
import { analyzeText, initializeTextAnalyzer } from './analyze';

beforeAll(async () => initializeTextAnalyzer());

describe('analyzeText', () => {
  it('uses fixed reverse maximum matching and keeps punctuation', () => {
    const result = analyzeText('春风吹过山谷，星光落在河面。');
    expect(result.slice(0, 3).map((token) => token.normalized)).toEqual(['春', '风吹', '过']);
    expect(result.some((token) => token.kind === 'punctuation')).toBe(true);
  });

  it('makes Simplified and Traditional identity tokens equal', () => {
    const simplified = analyzeText('春风吹过山谷。').filter((token) => token.kind === 'word');
    const traditional = analyzeText('春風吹過山谷。').filter((token) => token.kind === 'word');
    expect(traditional.map((token) => token.normalized)).toEqual(
      simplified.map((token) => token.normalized),
    );
    expect(traditional.map((token) => token.raw).join('')).toContain('春風');
  });

  it('extracts numbered tones and leaves Latin text neutral', () => {
    const tokens = analyzeText('春风A1。');
    const spring = tokens.find((token) => token.normalized === '春风')!;
    const nonHanWords = tokens.filter(
      (token) => token.kind === 'word' && !/[\p{Script=Han}]/u.test(token.normalized),
    );
    expect(spring.tones).toEqual([1, 1]);
    expect(nonHanWords.map((token) => token.raw).join('')).toBe('A1');
    expect(nonHanWords.flatMap((token) => token.tones).every((tone) => tone === 0)).toBe(true);
  });
});
