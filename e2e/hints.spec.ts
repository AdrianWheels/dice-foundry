import { expect, test } from '@playwright/test';

test('las pistas aparecen en la primera partida y no en la siguiente', async ({ page }) => {
  await page.goto('/?seed=1&rounds=2&players=2&bots=instant&e2e=1');
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('hint-roll')).toBeVisible();
  await page.getByTestId('hint-dismiss-roll').click();
  await expect(page.getByTestId('hint-roll')).toBeHidden();

  // Recargar y empezar otra partida: la pista de lanzar ya está vista y persistida.
  await page.reload();
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', 'roll');
  await expect(page.getByTestId('hint-roll')).toHaveCount(0);
});
