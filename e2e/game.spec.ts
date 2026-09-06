import { expect, test, type Page } from '@playwright/test';
import { captureConsoleErrors } from './harness';

async function phase(page: Page): Promise<string> {
  return (await page.getByTestId('roll-controls').getAttribute('data-phase')) ?? '';
}

test('partida completa de 2 rondas contra un bot instantáneo', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto('/?seed=42&rounds=2&players=2&bots=instant&e2e=1');
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('hud-round')).toHaveText('Ronda 1 / 2');
  let bought = false;
  for (let guard = 0; guard < 6; guard++) {
    if (await page.getByTestId('end-screen').isVisible()) break;
    await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'roll', {
      timeout: 30_000,
    });
    await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-busy', 'false');
    await page.getByTestId('btn-roll').click();
    await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'mitigate', {
      timeout: 30_000,
    });
    await page.getByTestId('btn-pass').click();
    await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'shop');
    if (!bought) {
      const slot = page.locator('[data-testid^="shop-slot-"][data-kind="face"]').first();
      if ((await slot.count()) > 0) {
        const idx = (await slot.getAttribute('data-testid'))!.replace('shop-slot-', '');
        if (await page.getByTestId(`buy-${idx}`).isEnabled()) {
          await page.getByTestId(`buy-${idx}`).click();
          await page.getByTestId('forge-die-1-side-5').click();
          await expect(page.getByTestId('forge')).toBeHidden();
          bought = true;
        }
      }
    }
    await page.getByTestId('btn-end-turn').click();
  }
  await expect(page.getByTestId('end-screen')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('end-row-0')).toBeVisible();
  await expect(page.getByTestId('end-row-1')).toBeVisible();
  const df = await page.evaluate(() => window.__df);
  expect(df?.mismatches).toBe(0);
  expect(errors).toEqual([]);
  expect(await phase(page)).toBe('gameOver');
});
