export type EventMap = Record<string, unknown[]>;

type AnyListener = (...args: unknown[]) => void;

export interface Emitter<Events extends EventMap> {
  on<K extends keyof Events & string>(name: K, fn: (...args: Events[K]) => void): () => void;
  emit<K extends keyof Events & string>(name: K, ...args: Events[K]): void;
}

export function createEmitter<Events extends EventMap>(): Emitter<Events> {
  const listeners = new Map<string, Set<AnyListener>>();
  return {
    on(name, fn) {
      const set = listeners.get(name) ?? new Set<AnyListener>();
      const listener = fn as unknown as AnyListener;
      set.add(listener);
      listeners.set(name, set);
      return () => {
        set.delete(listener);
      };
    },
    emit(name, ...args) {
      const set = listeners.get(name);
      if (!set) return;
      for (const fn of [...set]) fn(...args);
    },
  };
}
