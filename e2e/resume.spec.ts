import { expect, test } from '@playwright/test';

test('recargar a mitad de partida permite reanudar en la misma fase', async ({ page }) => {
  await page.goto('/?seed=42&rounds=2&players=2&bots=instant&e2e=1');
  await page.getByTestId('start-game').click();
  await page.getByTestId('btn-roll').click();
  await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'mitigate', {
    timeout: 30_000,
  });
  await page.getByTestId('btn-pass').click();
  await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'shop');
  const gold = await page.getByTestId('hud-gold').textContent();
  await page.reload();
  await page.getByTestId('resume-game').click();
  await expect(page.getByTestId('hud-round')).toHaveText('Ronda 1 / 2');
  await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'shop');
  await expect(page.getByTestId('hud-gold')).toHaveText(gold ?? '');
});
