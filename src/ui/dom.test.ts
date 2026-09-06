import { describe, expect, it, vi } from 'vitest';
import { clear, h, mount } from './dom';
import { createStore } from './store';

describe('h', () => {
  it('pone testid, class y atributos sueltos', () => {
    const el = h('div', { testid: 'x', class: 'a b', 'data-phase': 'roll' }, 'hola');
    expect(el.dataset.testid).toBe('x');
    expect(el.className).toBe('a b');
    expect(el.dataset.phase).toBe('roll');
    expect(el.textContent).toBe('hola');
  });

  it('registra listeners y respeta disabled', () => {
    const spy = vi.fn();
    const btn = h('button', { onclick: spy }, 'ok') as HTMLButtonElement;
    btn.click();
    expect(spy).toHaveBeenCalled();
    const off = h('button', { onclick: spy, disabled: true }) as HTMLButtonElement;
    expect(off.disabled).toBe(true);
    off.click(); // un botón deshabilitado no dispara el listener
    expect(spy).toHaveBeenCalledTimes(1);
    const notDisabled = h('button', { disabled: false }) as HTMLButtonElement;
    expect(notDisabled.disabled).toBe(false);
  });

  it('ignora hijos falsy y admite nodos', () => {
    const el = h('p', {}, null, false, undefined, 'a', h('b', {}, 'c'), 3);
    expect(el.textContent).toBe('ac3');
  });

  it('clear vacía el elemento', () => {
    const el = h('div', {}, 'a', h('span', {}, 'b'));
    clear(el);
    expect(el.childNodes.length).toBe(0);
  });
});

describe('mount', () => {
  it('re-renderiza cuando cambia el store y el unsubscribe lo detiene', () => {
    const root = document.createElement('div');
    const store = createStore({ n: 1 });
    const off = mount(root, store, (s) => h('span', { testid: 'n' }, String(s.n)));
    expect(root.textContent).toBe('1');
    store.set({ n: 7 });
    expect(root.textContent).toBe('7');
    expect(root.querySelectorAll('[data-testid="n"]')).toHaveLength(1);
    off();
    store.set({ n: 9 });
    expect(root.textContent).toBe('7');
  });
});
