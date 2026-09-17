import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('text input error styling', () => {
  it('uses a stable transparent border that becomes red when invalid', async () => {
    const styles = await readFile('src/styles.css', 'utf8');

    expect(styles).toMatch(/\.text-panel textarea\s*\{[^}]*border:\s*1px solid transparent;/su);
    expect(styles).toMatch(/textarea\[aria-invalid="true"\]\s*\{[^}]*border-color:\s*#a83b2f;/su);
  });
});
