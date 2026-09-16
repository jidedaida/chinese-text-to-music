import CompleteDict from '@pinyin-pro/data/complete';
import {
  addDict,
  OutputFormat,
  pinyin,
  segment,
} from 'pinyin-pro';
import type { Token, ToneNumber } from '../domain/types';
import { normalizeIdentityText } from './normalize';

let initialized = false;
const REVERSE_MAX_MATCH = 1 as const;

export async function initializeTextAnalyzer(): Promise<void> {
  if (initialized) return;
  addDict(CompleteDict);
  initialized = true;
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
  const normalized = normalizeIdentityText(source);
  const words = segment(normalized, {
    format: OutputFormat.ZhSegment,
    segmentit: REVERSE_MAX_MATCH,
    toneSandhi: false,
  }) as string[];
  let cursor = 0;
  return words.map((word, index) => {
    const start = normalized.indexOf(word, cursor);
    const sourceStart = start < 0 ? cursor : start;
    const sourceEnd = sourceStart + word.length;
    cursor = sourceEnd;
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
