export type Patch<T> = Partial<T> | ((s: T) => Partial<T>);
export interface Store<T extends object> {
  get(): T;
  set(patch: Patch<T>): void;
  subscribe(fn: (s: T) => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const subs = new Set<(s: T) => void>();
  return {
    get: () => state,
    set(patch) {
      const p = typeof patch === 'function' ? patch(state) : patch;
      let changed = false;
      for (const k of Object.keys(p) as (keyof T)[]) {
        if (p[k] !== state[k]) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...p };
      for (const fn of subs) fn(state);
    },
    subscribe(fn) {
      subs.add(fn);
      fn(state);
      return () => subs.delete(fn);
    },
  };
}
