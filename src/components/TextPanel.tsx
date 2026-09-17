import { useRef } from 'react';
import type { Score } from '../domain/types';
import {
  sourceEffectiveCharacterAt,
  validateInput,
} from '../domain/input';

interface Props {
  text: string;
  score: Score | null;
  activeTokenId: string | null;
  onChange: (value: string) => void;
  onSeekToken: (tokenId: string) => void;
}

export function TextPanel({ text, score, activeTokenId, onChange, onSeekToken }: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const validation = validateInput(text);
  const count = validation.count;
  const overflowCharacterAt = validation.code === 'too-long'
    ? sourceEffectiveCharacterAt(text, 301)
    : null;
  const overflowStart = overflowCharacterAt?.index ?? null;
  const overflowCharacter = overflowCharacterAt?.character ?? '';

  return (
    <section className="panel text-panel" aria-labelledby="text-heading">
      <div className="panel-heading">
        <h2 id="text-heading">原文</h2>
        <span className={count > 300 ? 'count count-error' : 'count'}>{count}/300</span>
      </div>
      <textarea
        ref={inputRef}
        aria-label="中文原文"
        aria-invalid={validation.code === 'too-long'}
        aria-describedby={validation.code === 'too-long' ? 'text-overflow-error' : undefined}
        value={text}
        onChange={(event) => onChange(event.target.value)}
        placeholder="输入 10～300 个有效字符"
      />
      {validation.code === 'too-long' && overflowStart !== null && (
        <div id="text-overflow-error" className="input-error" role="alert">
          <span>
            超过上限 {validation.count - 300} 个有效字符。第 301 个有效字符“{overflowCharacter}”及其后内容暂不能生成。
          </span>
          <button type="button" onClick={() => {
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(overflowStart, text.length);
          }}>
            定位超出部分
          </button>
        </div>
      )}
      {score && (
        <div className="token-reader" aria-label="分词与播放位置">
          {score.tokens.map((token) => (
            <button
              key={token.id}
              type="button"
              className={token.id === activeTokenId ? 'token active' : 'token'}
              onClick={() => onSeekToken(token.id)}
              disabled={token.kind !== 'word'}
            >
              {token.raw}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
