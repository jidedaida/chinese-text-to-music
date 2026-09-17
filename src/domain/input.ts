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

export interface SourceEffectiveCharacter {
  index: number;
  character: string;
}

export function sourceEffectiveCharacterAt(
  text: string,
  ordinal: number,
): SourceEffectiveCharacter | null {
  if (!Number.isInteger(ordinal) || ordinal < 1) return null;
  let count = 0;
  for (const part of GRAPHEMES.segment(text)) {
    const normalized = part.segment.normalize('NFC');
    const effectiveCharacters = Array.from(normalized).filter((character) =>
      EFFECTIVE_CHARACTER.test(character),
    );
    const nextCount = count + effectiveCharacters.length;
    if (ordinal > nextCount) {
      count = nextCount;
      continue;
    }

    const targetWithinPart = ordinal - count;
    let previousPartCount = 0;
    for (let localIndex = 0; localIndex < part.segment.length;) {
      const codePoint = part.segment.codePointAt(localIndex)!;
      const nextLocalIndex = localIndex + (codePoint > 0xffff ? 2 : 1);
      const partCount = countEffectiveCharacters(part.segment.slice(0, nextLocalIndex));
      if (previousPartCount < targetWithinPart && partCount >= targetWithinPart) {
        return {
          index: part.index + localIndex,
          character: effectiveCharacters[targetWithinPart - 1],
        };
      }
      previousPartCount = partCount;
      localIndex = nextLocalIndex;
    }
    return null;
  }
  return null;
}

export function sourceIndexOfEffectiveCharacter(text: string, ordinal: number): number | null {
  return sourceEffectiveCharacterAt(text, ordinal)?.index ?? null;
}

export function validateInput(text: string): InputValidation {
  const count = countEffectiveCharacters(text);
  if (count === 0) return { code: 'empty', count };
  if (count < 10) return { code: 'too-short', count };
  if (count > 300) return { code: 'too-long', count };
  return { code: 'valid', count };
}
