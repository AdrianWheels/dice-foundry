import { expect, test } from '@playwright/test';
import { captureConsoleErrors } from './harness';

test('la app arranca con Rapier y Three sin errores', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('boot-status')).toHaveText(/^OK rapier\+three/, {
    timeout: 30_000,
  });
  expect(errors).toEqual([]);
});
