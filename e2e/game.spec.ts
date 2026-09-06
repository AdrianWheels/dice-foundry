import { expect, test } from '@playwright/test';
import { captureConsoleErrors, currentPhase, startGame, untilEnd } from './harness';

test('partida completa de 2 rondas contra un bot instantáneo', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await startGame(page, 'seed=42&rounds=2&players=2&bots=instant');
  await expect(page.getByTestId('hud-round')).toHaveText('Ronda 1 / 2');
  const { bought } = await untilEnd(page, { buyFace: true, maxTurns: 6 });
  expect(bought).toBe(true);
  await expect(page.getByTestId('end-row-0')).toBeVisible();
  await expect(page.getByTestId('end-row-1')).toBeVisible();
  const df = await page.evaluate(() => window.__df);
  expect(df?.mismatches).toBe(0);
  expect(errors).toEqual([]);
  expect(await currentPhase(page)).toBe('gameOver');
});

test('otra partida reinicia el marcador', async ({ page }) => {
  await startGame(page, 'seed=9&rounds=2&players=2&bots=instant');
  await untilEnd(page, { maxTurns: 6 });
  await page.getByTestId('btn-again').click();
  await expect(page.getByTestId('hud-round')).toHaveText('Ronda 1 / 2');
  await expect(page.getByTestId('hud-pv')).toContainText('0');
});
