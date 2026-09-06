import { expect, test } from '@playwright/test';
import { captureConsoleErrors, startGame, untilEnd } from './harness';

test('móvil: partida de 2 rondas sin scroll horizontal', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await startGame(page, 'seed=42&rounds=2&players=2&bots=instant');
  await expect(page.getByTestId('hud-round')).toHaveText('Ronda 1 / 2');
  // La tienda y el log arrancan plegados en móvil.
  await expect(page.getByTestId('log-toggle')).toBeVisible();
  await untilEnd(page, { buyFace: true, maxTurns: 6 });
  await expect(page.getByTestId('end-screen')).toBeVisible();
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);
  expect(errors).toEqual([]);
});
