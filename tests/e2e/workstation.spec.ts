import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const text = '春风吹过山谷，星光落在河面。';

test('generates a score, synchronizes UI state, and never transmits text', async ({ page }) => {
  const outbound: string[] = [];
  const failedAssets: string[] = [];
  page.on('request', (request) => {
    outbound.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failedAssets.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('./');
  if (process.env.EXPECT_PREVIEW_BADGE === '1') {
    await expect(page.getByText('测试版 · PREVIEW')).toBeVisible();
  }
  await page.getByLabel('中文原文').fill(text);
  await page.getByRole('button', { name: '生成音乐' }).click();
  await expect(page.getByText('曲目已生成')).toBeVisible();
  await expect(page.getByLabel('二维音序器')).toBeVisible();
  const reader = page.getByLabel('分词与播放位置');
  const secondWord = reader.locator('button:not([disabled])').nth(1);
  const thirdWord = reader.locator('button:not([disabled])').nth(2);
  await secondWord.click();
  await thirdWord.click();
  await secondWord.click();
  await expect(secondWord).toHaveClass(/active/u);
  await expect(page.getByRole('button', { name: '暂停' })).toBeEnabled();
  await expect(page.getByLabel('播放时间')).not.toHaveText(/0:00 \/ /u);
  expect(failedAssets).toEqual([]);
  await page.getByRole('button', { name: '暂停' }).click();
  await expect(page.getByRole('button', { name: '播放' })).toBeEnabled();
  await page.getByRole('button', { name: '停止' }).click();
  await expect(page.getByLabel('播放时间')).toHaveText(/^0:00 \/ /u);
  await page.getByLabel('音阶').selectOption('natural-minor');
  await expect(page.getByText('文字或参数已变化，请重新生成')).toBeVisible();
  await page.getByRole('button', { name: '生成音乐' }).click();
  await expect(page.getByText('曲目已生成')).toBeVisible();
  await page.getByLabel('中文原文').fill(`${text}清晨`);
  await expect(page.getByText('文字或参数已变化，请重新生成')).toBeVisible();
  expect(outbound.join('\n')).not.toContain(text);
  await page.reload();
  await expect(page.getByLabel('中文原文')).toHaveValue('');
  await expect(page.getByRole('button', { name: '生成音乐' })).toBeDisabled();
});

test('exports a playable-looking WAV download', async ({ page }) => {
  await page.goto('./');
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
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await page.setViewportSize({ width: 800, height: 900 });
  await expect(page.getByText('第一版需要桌面宽屏')).toBeVisible();
});

test('falls back to synthesized voices when licensed samples fail to load', async ({ page }) => {
  await page.route('**/audio/**/*.mp3', (route) => route.abort('failed'));
  await page.goto('./');
  await page.getByLabel('中文原文').fill(text);
  await page.getByRole('button', { name: '生成音乐' }).click();
  await expect(page.getByText('曲目已生成')).toBeVisible();
  await page.getByLabel('分词与播放位置').locator('button:not([disabled])').first().click();
  await expect(page.getByText('钢琴或弦乐采样加载失败，正在使用兼容合成音色。')).toBeVisible();
  await expect(page.getByRole('button', { name: '暂停' })).toBeEnabled();
});
