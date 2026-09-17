export type ReleaseChannel = 'preview' | 'production';

export function releaseLabel(
  channel: string | undefined = import.meta.env.VITE_RELEASE_CHANNEL,
): string | null {
  return channel === 'preview' ? '测试版 · PREVIEW' : null;
}
