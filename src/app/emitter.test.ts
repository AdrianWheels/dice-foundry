import { describe, expect, it, vi } from 'vitest';
import { createEmitter } from './emitter';

type Events = { ping: [number]; pong: [string, number] };

describe('createEmitter', () => {
  it('llama a los suscriptores del evento con sus argumentos', () => {
    const e = createEmitter<Events>();
    const spy = vi.fn();
    e.on('ping', spy);
    e.emit('ping', 7);
    expect(spy).toHaveBeenCalledWith(7);
  });

  it('no mezcla eventos y admite varios suscriptores', () => {
    const e = createEmitter<Events>();
    const a = vi.fn();
    const b = vi.fn();
    e.on('ping', a);
    e.on('pong', b);
    e.emit('pong', 'x', 1);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith('x', 1);
  });

  it('el retorno de on() cancela la suscripción', () => {
    const e = createEmitter<Events>();
    const spy = vi.fn();
    const off = e.on('ping', spy);
    off();
    e.emit('ping', 1);
    expect(spy).not.toHaveBeenCalled();
  });

  it('emitir un evento sin suscriptores no lanza', () => {
    const e = createEmitter<Events>();
    expect(() => e.emit('ping', 1)).not.toThrow();
  });
});
