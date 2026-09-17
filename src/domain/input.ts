export type InputValidation = {
  code: 'empty' | 'too-short' | 'too-long' | 'valid';
  count: number;
};

const EFFECTIVE_CHARACTER = /[\p{Script=Han}\p{Letter}\p{Number}]/u;
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function countEffectiveCharacters(text: string): number {
  return Array.from(text.normalize('NFC')).filter((character) =>
    EFFECTIVE_CHARACTER.test(character),
  ).length;
}

export function sourceIndexOfEffectiveCharacter(text: string, ordinal: number): number | null {
  if (!Number.isInteger(ordinal) || ordinal < 1) return null;
  let count = 0;
  for (const part of GRAPHEMES.segment(text)) {
    for (const character of Array.from(part.segment.normalize('NFC'))) {
      if (!EFFECTIVE_CHARACTER.test(character)) continue;
      count += 1;
      if (count === ordinal) return part.index;
    }
  }
  return null;
}

export function validateInput(text: string): InputValidation {
  const count = countEffectiveCharacters(text);
  if (count === 0) return { code: 'empty', count };
  if (count < 10) return { code: 'too-short', count };
  if (count > 300) return { code: 'too-long', count };
  return { code: 'valid', count };
}
