import OpenCC from 'opencc-js';

const toSimplified = OpenCC.Converter({ from: 't', to: 'cn' });
const punctuation = new Map([
  ['，', ','],
  ['。', '.'],
  ['！', '!'],
  ['？', '?'],
  ['；', ';'],
  ['：', ':'],
]);

export interface SourceRange {
  start: number;
  end: number;
}

export interface NormalizedText {
  text: string;
  sourceRanges: SourceRange[];
}

interface MappedCharacter extends SourceRange {
  value: string;
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function sourceCharacters(input: string): MappedCharacter[] {
  const characters: MappedCharacter[] = [];
  for (const part of graphemes.segment(input)) {
    const sourceRange = { start: part.index, end: part.index + part.segment.length };
    const normalized = part.segment.normalize('NFC').replace(/\r\n?/g, '\n');
    for (const character of Array.from(normalized)) {
      characters.push({
        value: punctuation.get(character) ?? character,
        ...sourceRange,
      });
    }
  }
  return characters;
}

function simplify(characters: MappedCharacter[]): MappedCharacter[] {
  const converted = Array.from(toSimplified(characters.map(({ value }) => value).join('')));
  if (converted.length === characters.length) {
    return converted.map((value, index) => ({ ...characters[index], value }));
  }

  // Traditional-to-Simplified conversion is normally one code point for one code point.
  // Keep a deterministic best-effort source span if a future dictionary changes length.
  return converted.map((value, index) => {
    const sourceIndex = Math.min(
      characters.length - 1,
      Math.floor(index * characters.length / Math.max(1, converted.length)),
    );
    return { ...characters[Math.max(0, sourceIndex)], value };
  });
}

function normalizeWhitespace(characters: MappedCharacter[]): MappedCharacter[] {
  const collapsed: MappedCharacter[] = [];
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    if (character.value !== ' ' && character.value !== '\t') {
      collapsed.push(character);
      continue;
    }
    let end = character.end;
    while (index + 1 < characters.length && /[\t ]/u.test(characters[index + 1].value)) {
      index += 1;
      end = characters[index].end;
    }
    collapsed.push({ value: ' ', start: character.start, end });
  }

  const aroundNewlines: MappedCharacter[] = [];
  for (let index = 0; index < collapsed.length; index += 1) {
    const character = collapsed[index];
    if (character.value !== '\n') {
      aroundNewlines.push(character);
      continue;
    }
    let start = character.start;
    let end = character.end;
    if (aroundNewlines.at(-1)?.value === ' ') {
      start = aroundNewlines.pop()!.start;
    }
    while (collapsed[index + 1]?.value === ' ') {
      index += 1;
      end = collapsed[index].end;
    }
    aroundNewlines.push({ value: '\n', start, end });
  }

  let first = 0;
  let last = aroundNewlines.length;
  while (first < last && /^\s$/u.test(aroundNewlines[first].value)) first += 1;
  while (last > first && /^\s$/u.test(aroundNewlines[last - 1].value)) last -= 1;
  return aroundNewlines.slice(first, last);
}

export function normalizeIdentityTextWithMap(input: string): NormalizedText {
  const characters = normalizeWhitespace(simplify(sourceCharacters(input)));
  const sourceRanges: SourceRange[] = [];
  for (const character of characters) {
    for (let index = 0; index < character.value.length; index += 1) {
      sourceRanges.push({ start: character.start, end: character.end });
    }
  }
  return {
    text: characters.map(({ value }) => value).join(''),
    sourceRanges,
  };
}

export function normalizeIdentityText(input: string): string {
  return normalizeIdentityTextWithMap(input).text;
}
