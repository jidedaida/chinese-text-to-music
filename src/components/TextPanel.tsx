import type { Score } from '../domain/types';
import { countEffectiveCharacters } from '../domain/input';

interface Props {
  text: string;
  score: Score | null;
  activeTokenId: string | null;
  onChange: (value: string) => void;
  onSeekToken: (tokenId: string) => void;
}

export function TextPanel({ text, score, activeTokenId, onChange, onSeekToken }: Props) {
  const count = countEffectiveCharacters(text);
  return (
    <section className="panel text-panel" aria-labelledby="text-heading">
      <div className="panel-heading">
        <h2 id="text-heading">原文</h2>
        <span className={count > 300 ? 'count count-error' : 'count'}>{count}/300</span>
      </div>
      <textarea
        aria-label="中文原文"
        value={text}
        onChange={(event) => onChange(event.target.value)}
        placeholder="输入 10～300 个有效字符"
      />
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
