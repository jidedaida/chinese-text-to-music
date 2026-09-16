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

export function normalizeIdentityText(input: string): string {
  const nfc = input.normalize('NFC').replace(/\r\n?/g, '\n');
  const mapped = Array.from(nfc, (character) => punctuation.get(character) ?? character).join('');
  return toSimplified(mapped)
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}
