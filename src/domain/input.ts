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

export function validateInput(text: string): InputValidation {
  const count = countEffectiveCharacters(text);
  if (count === 0) return { code: 'empty', count };
  if (count < 10) return { code: 'too-short', count };
  if (count > 300) return { code: 'too-long', count };
  return { code: 'valid', count };
}
