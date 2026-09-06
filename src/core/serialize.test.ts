import { describe, expect, it } from 'vitest';
import { createGame } from './game';
import { fromSave, toSave } from './serialize';

describe('serialize', () => {
  it('toSave/fromSave hacen roundtrip y rechazan basura', () => {
    const s = createGame({
      seats: [
        { name: 'A', kind: 'human' },
        { name: 'B', kind: 'bot' },
      ],
      rounds: 2,
      seed: 1,
    });
    expect(fromSave(toSave(s, 123))).toEqual(s);
    expect(fromSave('{}')).toBeNull();
    expect(fromSave('no json')).toBeNull();
    expect(fromSave(JSON.stringify({ v: 99, state: s }))).toBeNull();
    expect(fromSave(JSON.stringify({ v: 1, state: { ...s, phase: 'nope' } }))).toBeNull();
  });
});
