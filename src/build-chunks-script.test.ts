import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('build chunk verification script', () => {
  it('rejects an eager bundle when any Tone runtime marker is present', async () => {
    const script = await readFile('scripts/verify-build-chunks.mjs', 'utf8');

    expect(script).toContain('if (eagerToneMarkers.size > 0)');
    expect(script).not.toContain('toneRuntimeMarkers.every');
  });
});
