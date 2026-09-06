import { expect, type Page } from '@playwright/test';

/** Recoge errores de consola y excepciones no capturadas durante el test. */
export function captureConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

export type Phase = 'roll' | 'mitigate' | 'shop' | 'gameOver';

/** Espera a que los controles anuncien esta fase (nunca `waitForTimeout`). */
export async function expectPhase(page: Page, phase: Phase, timeout = 30_000): Promise<void> {
  await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-phase', phase, { timeout });
}

export async function currentPhase(page: Page): Promise<string> {
  return (await page.getByTestId('roll-controls').getAttribute('data-phase')) ?? '';
}

/** Abre el menú con los parámetros dados y empieza la partida. */
export async function startGame(page: Page, params = ''): Promise<void> {
  const query = params.startsWith('?') ? params : `?${params}`;
  await page.goto(`/${query}${query.includes('e2e=1') ? '' : '&e2e=1'}`);
  await page.getByTestId('start-game').click();
  await expectPhase(page, 'roll');
}

/** Descarta la pista visible, si hay: un jugador real hace lo mismo antes de seguir. */
export async function dismissHints(page: Page): Promise<void> {
  const btn = page.locator('[data-testid^="hint-dismiss-"]');
  for (let i = 0; i < 3; i++) {
    if ((await btn.count()) === 0) return;
    await btn.first().click();
  }
}

/** En móvil la tienda es un panel plegable: se abre si existe el interruptor. */
async function openShopIfCollapsed(page: Page): Promise<void> {
  const toggle = page.getByTestId('shop-toggle');
  if ((await toggle.count()) === 0) return;
  if ((await toggle.getAttribute('aria-expanded')) === 'true') return;
  await toggle.click();
}

/** Turno humano completo: lanzar → continuar → (comprar cara) → terminar turno. */
export async function playHumanTurn(
  page: Page,
  opts: { buyFace?: boolean } = {},
): Promise<{ bought: boolean }> {
  await expectPhase(page, 'roll');
  await expect(page.getByTestId('roll-controls')).toHaveAttribute('data-busy', 'false');
  await dismissHints(page);
  await page.getByTestId('btn-roll').click();
  await expectPhase(page, 'mitigate');
  await page.getByTestId('btn-pass').click();
  await expectPhase(page, 'shop');
  let bought = false;
  await dismissHints(page);
  await openShopIfCollapsed(page);
  if (opts.buyFace) {
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
  return { bought };
}

/** Juega turnos humanos hasta la pantalla final (con tope de seguridad). */
export async function untilEnd(
  page: Page,
  opts: { buyFace?: boolean; maxTurns?: number } = {},
): Promise<{ bought: boolean }> {
  let bought = false;
  const max = opts.maxTurns ?? 10;
  for (let i = 0; i < max; i++) {
    if (await page.getByTestId('end-screen').isVisible()) break;
    const res = await playHumanTurn(page, { buyFace: opts.buyFace && !bought });
    bought = bought || res.bought;
  }
  await expect(page.getByTestId('end-screen')).toBeVisible({ timeout: 30_000 });
  return { bought };
}
