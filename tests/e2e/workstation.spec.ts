import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const text = '春风吹过山谷，星光落在河面。';

test('generates a score, synchronizes UI state, and never transmits text', async ({ page }) => {
  const outbound: string[] = [];
  page.on('request', (request) => {
    outbound.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`);
  });
  await page.goto('/');
  await page.getByLabel('中文原文').fill(text);
  await page.getByRole('button', { name: '生成音乐' }).click();
  await expect(page.getByText('曲目已生成')).toBeVisible();
  await expect(page.getByLabel('二维音序器')).toBeVisible();
  await page.getByLabel('中文原文').fill(`${text}清晨`);
  await expect(page.getByText('文字或参数已变化，请重新生成')).toBeVisible();
  expect(outbound.join('\n')).not.toContain(text);
});

test('exports a playable-looking WAV download', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('中文原文').fill(text);
  await page.getByRole('button', { name: '生成音乐' }).click();
  await expect(page.getByText('曲目已生成')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 WAV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^zipu-[a-f0-9]{10}\.wav$/);
  expect(await download.failure()).toBeNull();
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
  expect(bytes.readUInt32LE(24)).toBe(44_100);
  let peak = 0;
  let nonZero = false;
  for (let offset = 44; offset + 1 < bytes.length; offset += 2) {
    const sample = Math.abs(bytes.readInt16LE(offset));
    peak = Math.max(peak, sample);
    nonZero ||= sample > 0;
  }
  expect(nonZero).toBe(true);
  expect(peak).toBeLessThan(32_767);
});

test('supports keyboard focus and shows a narrow-screen notice', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await page.setViewportSize({ width: 800, height: 900 });
  await expect(page.getByText('第一版需要桌面宽屏')).toBeVisible();
});
