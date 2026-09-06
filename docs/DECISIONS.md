# Decisiones y desviaciones del plan

Formato: `- YYYY-MM-DD · [tarea] · decisión · motivo`.

- 2026-09-06 · [plan] · Mundo Rapier nuevo por tirada en vez de `takeSnapshot/restoreSnapshot` · determinismo por construcción y la firma del snapshot cambia entre versiones.
- 2026-09-06 · [plan] · Tercer recurso (cristal) fuera del MVP · diseño §16: no añadir recursos hasta demostrar el sistema básico.
- 2026-09-06 · [plan] · TypeScript 5.9 en vez de 7.x · `typescript-eslint` necesita la API JS del compilador.
- 2026-09-06 · [plan] · Deploy en Vercel (CLI ya autenticada) en vez de Cloudflare Pages · decisión de Adrian.
- 2026-09-06 · [SETUP.1] · `docs/superpowers` añadido a `.prettierignore` · la copia íntegra del plan (6011 líneas) no debe reformatearse ni bloquear el gate.
- 2026-09-06 · [SETUP.1] · Añadido `.gitattributes` con `* text=auto eol=lf` · `core.autocrlf` global de la máquina convertía a CRLF y `prettier --check` (endOfLine lf) habría fallado tras el primer checkout.
- 2026-09-06 · [CORE.6] · Test "comprar dado escala el precio" mide `goldBefore - diePrice` en vez de `50 - diePrice` · el plan asumía que la tirada previa no abona oro; con la semilla 7 la resolución suma 2 oro antes de la compra. La aserción sigue comprobando lo mismo (se cobra exactamente el precio del dado).
