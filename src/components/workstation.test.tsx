import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

describe('workstation', () => {
  it('validates input, generates once, and marks later edits dirty', async () => {
    render(<App />);
    const input = screen.getByLabelText('中文原文');
    const generate = screen.getByRole('button', { name: '生成音乐' });
    expect(generate).toBeDisabled();
    fireEvent.change(input, { target: { value: '春风吹过山谷星光落在河面' } });
    expect(generate).toBeEnabled();
    fireEvent.click(generate);
    await waitFor(() => expect(screen.getByText('曲目已生成')).toBeInTheDocument());
    fireEvent.change(input, { target: { value: '春风吹过山谷星光落在河面清晨' } });
    expect(screen.getByText('文字或参数已变化，请重新生成')).toBeInTheDocument();
  });

  it('exposes the approved mood choices without tension', () => {
    render(<App />);
    const mood = screen.getByLabelText('情绪');
    expect(mood).toHaveTextContent('自动');
    expect(mood).toHaveTextContent('明亮');
    expect(mood).toHaveTextContent('平静');
    expect(mood).toHaveTextContent('忧郁');
    expect(mood).not.toHaveTextContent('紧张');
  });
});
