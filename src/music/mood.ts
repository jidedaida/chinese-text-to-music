import type { ResolvedMood, Token } from '../domain/types';

const BRIGHT = new Set(['阳光', '希望', '快乐', '欢喜', '春风', '星光', '明亮', '温暖']);
const MELANCHOLIC = new Set(['孤独', '离别', '雨夜', '失去', '悲伤', '寂寞', '远去', '泪']);

export function inferMood(tokens: Token[]): ResolvedMood {
  const normalizedText = tokens.map((token) => token.normalized).join('');
  let bright = 0;
  let melancholic = 0;
  for (const word of BRIGHT) if (normalizedText.includes(word)) bright += 2;
  for (const word of MELANCHOLIC) if (normalizedText.includes(word)) melancholic += 2;
  if (normalizedText.includes('!')) bright += 1;
  if (bright > melancholic) return 'bright';
  if (melancholic > bright) return 'melancholic';
  return 'calm';
}
