import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextPanel } from './TextPanel';

describe('TextPanel', () => {
  it('identifies and locates content beyond the generation limit', () => {
    const text = `${'春'.repeat(300)}，遠方`;
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
});
