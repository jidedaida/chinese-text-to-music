import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the product name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '字谱' })).toBeInTheDocument();
  });

  it('shows a badge only for preview builds', () => {
    vi.stubEnv('VITE_RELEASE_CHANNEL', 'preview');
    render(<App />);
    expect(screen.getByText('测试版 · PREVIEW')).toBeInTheDocument();
    vi.unstubAllEnvs();
  });
});
