import { expect, test } from '@playwright/test';
import { captureConsoleErrors } from './harness';

test('5 tiradas físicas coinciden con la pre-simulación', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto('/?dev=roll&seed=3');
  await expect(page.getByTestId('demo-status')).toHaveText('idle');
  for (let i = 0; i < 5; i++) {
    await page.getByTestId('demo-roll').click();
    await expect(page.getByTestId('demo-status')).toHaveText('settled', { timeout: 30_000 });
  }
  const df = await page.evaluate(() => window.__df);
  expect(df?.rolls).toBe(5);
  expect(df?.mismatches).toBe(0);
  expect(errors).toEqual([]);
});
