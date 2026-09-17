import {
  addDict,
  OutputFormat,
  pinyin,
  segment,
} from 'pinyin-pro';
import type { Token, ToneNumber } from '../domain/types';
import { createRetryableLoader } from '../runtime/retryable-loader';
import { normalizeIdentityTextWithMap } from './normalize';

let initialized = false;
const loadCompleteDictionary = createRetryableLoader(async () => {
  const { default: completeDictionary } = await import('@pinyin-pro/data/complete');
  addDict(completeDictionary);
  initialized = true;
});
const REVERSE_MAX_MATCH = 1 as const;

export async function initializeTextAnalyzer(): Promise<void> {
  await loadCompleteDictionary();
}

function toneNumbers(value: string): ToneNumber[] {
  if (!/[\p{Script=Han}]/u.test(value)) return Array.from(value, () => 0);
  return (pinyin(value, {
    pattern: 'num',
    type: 'array',
    segmentit: REVERSE_MAX_MATCH,
    toneSandhi: false,
  }) as string[]).map((tone) => Number(tone) as ToneNumber);
}

function pinyinNumbers(value: string): string[] {
  if (!/[\p{Script=Han}]/u.test(value)) return [];
  return pinyin(value, {
    toneType: 'num',
    type: 'array',
    segmentit: REVERSE_MAX_MATCH,
    toneSandhi: false,
  }) as string[];
}

export function analyzeText(source: string): Token[] {
  if (!initialized) throw new Error('Text analyzer is not initialized');
  const { text: normalized, sourceRanges } = normalizeIdentityTextWithMap(source);
  const words = segment(normalized, {
    format: OutputFormat.ZhSegment,
    segmentit: REVERSE_MAX_MATCH,
    toneSandhi: false,
  }) as string[];
  let cursor = 0;
  return words.map((word, index) => {
    const start = normalized.indexOf(word, cursor);
    const normalizedStart = start < 0 ? cursor : start;
    const normalizedEnd = normalizedStart + word.length;
    cursor = normalizedEnd;
    const ranges = sourceRanges.slice(normalizedStart, normalizedEnd);
    const sourceStart = ranges.length > 0
      ? Math.min(...ranges.map((range) => range.start))
      : 0;
    const sourceEnd = ranges.length > 0
      ? Math.max(...ranges.map((range) => range.end))
      : sourceStart;
    const kind = /^[,.!?;:\n]$/u.test(word)
      ? 'punctuation'
      : /[\p{Script=Han}\p{Letter}\p{Number}]/u.test(word)
        ? 'word'
        : 'other';
    return {
      id: `token-${index}`,
      raw: source.slice(sourceStart, sourceEnd),
      normalized: word,
      sourceStart,
      sourceEnd,
      pinyin: pinyinNumbers(word),
      tones: toneNumbers(word),
      kind,
    } satisfies Token;
  });
}
