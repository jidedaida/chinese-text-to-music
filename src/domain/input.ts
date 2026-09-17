export type InputValidation = {
  code: 'empty' | 'too-short' | 'too-long' | 'valid';
  count: number;
};

const EFFECTIVE_CHARACTER = /[\p{Script=Han}\p{Letter}\p{Number}]/u;

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
  const effectiveCharacters = Array.from(text.normalize('NFC')).filter((character) =>
    EFFECTIVE_CHARACTER.test(character),
  );
  if (ordinal > effectiveCharacters.length) return null;

  let previousCount = 0;
  for (let index = 0; index < text.length;) {
    const codePoint = text.codePointAt(index)!;
    const nextIndex = index + (codePoint > 0xffff ? 2 : 1);
    const count = countEffectiveCharacters(text.slice(0, nextIndex));
    if (previousCount < ordinal && count >= ordinal) {
      return { index, character: effectiveCharacters[ordinal - 1] };
    }
    previousCount = count;
    index = nextIndex;
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
