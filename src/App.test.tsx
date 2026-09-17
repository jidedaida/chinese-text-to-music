import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('App', () => {
  it('renders the product name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '字谱' })).toBeInTheDocument();
  });

  it('shows a badge only for preview builds', () => {
    vi.stubEnv('VITE_RELEASE_CHANNEL', 'preview');
    render(<App />);
    expect(screen.getByText('测试版 · PREVIEW')).toBeInTheDocument();
  });

  it('hides the badge for production builds while preserving privacy text', () => {
    vi.stubEnv('VITE_RELEASE_CHANNEL', 'production');
    render(<App />);
    expect(screen.queryByText('测试版 · PREVIEW')).not.toBeInTheDocument();
    expect(screen.getByText('本地生成 · 不上传原文')).toBeInTheDocument();
  });

  it('hides the badge when the release channel is unset while preserving privacy text', () => {
    vi.stubEnv('VITE_RELEASE_CHANNEL', undefined as unknown as string);
    render(<App />);
    expect(screen.queryByText('测试版 · PREVIEW')).not.toBeInTheDocument();
    expect(screen.getByText('本地生成 · 不上传原文')).toBeInTheDocument();
  });
});
