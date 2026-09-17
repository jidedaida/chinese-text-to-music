import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextPanel } from './TextPanel';

describe('TextPanel', () => {
  it('identifies and locates content beyond the generation limit', () => {
    const text = `${'春'.repeat(300)}，遠、方！`;
    const { rerender } = render(
      <TextPanel
        text={text}
        score={null}
        activeTokenId={null}
        onChange={vi.fn()}
        onSeekToken={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText('中文原文');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('超过上限 2 个有效字符');
    expect(screen.getByRole('alert')).toHaveTextContent('第 301 个有效字符“遠”');
    expect(screen.getByRole('alert')).toHaveTextContent('超出部分原文：“遠、方！”');

    fireEvent.click(screen.getByRole('button', { name: '定位超出部分' }));
    expect(textarea).toHaveFocus();
    expect(textarea).toHaveProperty('selectionStart', 301);
    expect(textarea).toHaveProperty('selectionEnd', text.length);

    rerender(
      <TextPanel
        text={'春'.repeat(300)}
        score={null}
        activeTokenId={null}
        onChange={vi.fn()}
        onSeekToken={vi.fn()}
      />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('locates and displays the exact effective character inside a grapheme', () => {
    const text = `${'春'.repeat(299)}क्ष`;
    render(
      <TextPanel
        text={text}
        score={null}
        activeTokenId={null}
        onChange={vi.fn()}
        onSeekToken={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText('中文原文') as HTMLTextAreaElement;
    expect(screen.getByRole('alert')).toHaveTextContent('第 301 个有效字符“ष”');
    expect(screen.getByRole('alert')).toHaveTextContent('超出部分原文：“क्ष”');
    fireEvent.click(screen.getByRole('button', { name: '定位超出部分' }));
    expect(textarea.selectionStart).toBe(301);
    expect(text.slice(textarea.selectionStart)).toBe('ष');
  });

  it('limits a long overflow excerpt without splitting source graphemes', () => {
    const combiningGrapheme = 'e\u0301';
    const text = `${'春'.repeat(300)}${combiningGrapheme.repeat(20)}`;
    render(
      <TextPanel
        text={text}
        score={null}
        activeTokenId={null}
        onChange={vi.fn()}
        onSeekToken={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      `超出部分原文：“${combiningGrapheme.repeat(16)}…”`,
    );
  });
});
