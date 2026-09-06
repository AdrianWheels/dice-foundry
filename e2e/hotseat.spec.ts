import { expect, test } from '@playwright/test';
import { expectPhase } from './harness';

test('dos humanos: overlay de pasar el dispositivo entre turnos', async ({ page }) => {
  await page.goto('/?seed=7&rounds=2&players=2&seats=human,human&e2e=1');
  await page.getByTestId('start-game').click();
  await page.getByTestId('btn-roll').click();
  await expectPhase(page, 'mitigate');
  await page.getByTestId('btn-pass').click();
  await page.getByTestId('btn-end-turn').click();
  await expect(page.getByTestId('handoff')).toBeVisible();
  await expect(page.getByTestId('handoff')).toContainText('Jugador 2');
  await page.getByTestId('btn-handoff-ok').click();
  await expect(page.getByTestId('handoff')).toBeHidden();
  await expectPhase(page, 'roll');
  await expect(page.getByTestId('hud-turn')).toContainText('Jugador 2');
});
