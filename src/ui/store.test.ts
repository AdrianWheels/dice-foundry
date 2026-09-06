import { describe, expect, it, vi } from 'vitest';
import { createStore } from './store';

describe('createStore', () => {
  it('notifica al suscribir con el estado actual', () => {
    const store = createStore({ n: 1 });
    const spy = vi.fn();
    store.subscribe(spy);
    expect(spy).toHaveBeenCalledWith({ n: 1 });
  });

  it('set aplica un patch y notifica una vez', () => {
    const store = createStore({ n: 1, s: 'a' });
    const spy = vi.fn();
    store.subscribe(spy);
    spy.mockClear();
    store.set({ n: 2 });
    expect(store.get()).toEqual({ n: 2, s: 'a' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('no notifica si nada cambia y acepta función', () => {
    const store = createStore({ n: 1 });
    const spy = vi.fn();
    store.subscribe(spy);
    spy.mockClear();
    store.set({ n: 1 });
    expect(spy).not.toHaveBeenCalled();
    store.set((s) => ({ n: s.n + 1 }));
    expect(store.get().n).toBe(2);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe deja de notificar', () => {
    const store = createStore({ n: 1 });
    const spy = vi.fn();
    const off = store.subscribe(spy);
    off();
    store.set({ n: 5 });
    expect(spy).toHaveBeenCalledTimes(1); // solo la inicial
  });
});
