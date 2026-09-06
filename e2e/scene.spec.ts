import { expect, test } from '@playwright/test';
import { captureConsoleErrors } from './harness';

test('la escena con mesa se renderiza sin errores', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto('/?dev=scene');
  await expect(page.getByTestId('boot-status')).toHaveText('OK scene');
  const size = await page
    .locator('#scene')
    .evaluate((c) => [(c as HTMLCanvasElement).width, (c as HTMLCanvasElement).height]);
  expect(size[0]).toBeGreaterThan(0);
  expect(size[1]).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
