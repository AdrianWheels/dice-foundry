import type { Store } from './store';

type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | ((ev: Event) => void) | undefined>;

export function h(tag: string, attrs: Attrs = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'testid') el.dataset.testid = String(v);
    else if (k === 'class') el.className = String(v);
    else if (k === 'disabled' || k === 'selected' || k === 'checked') {
      (el as unknown as Record<string, boolean>)[k] = v === true;
    } else if (k === 'value') (el as HTMLInputElement).value = String(v);
    else el.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Re-renderiza `root` con `render(state)` en cada cambio del store. */
export function mount<T extends object>(
  root: HTMLElement,
  store: Store<T>,
  render: (s: T) => Node | null,
): () => void {
  return store.subscribe((s) => {
    clear(root);
    const node = render(s);
    if (node) root.append(node);
  });
}
