import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import {
  QUESTIONS_KEY,
  deepEqual,
  readQuestions,
  writeQuestions,
  type QuestionRecord,
} from '@/lib/collab/surveyDoc';

function makeArr() {
  const doc = new Y.Doc();
  const arr = doc.getArray<Y.Map<unknown>>(QUESTIONS_KEY);
  return { doc, arr };
}

const q = (id: string, extra: Record<string, unknown> = {}): QuestionRecord => ({
  id,
  question_text: `Q ${id}`,
  type: 'short_answer',
  options: [],
  ...extra,
});

describe('deepEqual', () => {
  it('compares nested arrays/objects order-independently for objects', () => {
    expect(deepEqual({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe('writeQuestions / readQuestions', () => {
  it('seeds an empty array and round-trips', () => {
    const { doc, arr } = makeArr();
    const desired = [q('a'), q('b')];
    doc.transact(() => writeQuestions(arr, desired));
    expect(readQuestions(arr)).toEqual(desired);
  });

  it('updates a single field without rebuilding (same structure)', () => {
    const { doc, arr } = makeArr();
    doc.transact(() => writeQuestions(arr, [q('a'), q('b')]));
    const mapA = arr.get(0);
    doc.transact(() => writeQuestions(arr, [q('a', { question_text: 'changed' }), q('b')]));
    // Same Y.Map instance is reused (no delete+reinsert) on the fast path.
    expect(arr.get(0)).toBe(mapA);
    expect((arr.get(0) as Y.Map<unknown>).get('question_text')).toBe('changed');
  });

  it('handles add, remove and reorder', () => {
    const { doc, arr } = makeArr();
    doc.transact(() => writeQuestions(arr, [q('a'), q('b')]));
    doc.transact(() => writeQuestions(arr, [q('b'), q('a'), q('c')])); // reorder + add
    expect(readQuestions(arr).map((x) => x.id)).toEqual(['b', 'a', 'c']);
    doc.transact(() => writeQuestions(arr, [q('a')])); // remove b and c
    expect(readQuestions(arr).map((x) => x.id)).toEqual(['a']);
  });

  it('converges when two documents apply each other’s updates (conflict-free)', () => {
    const { doc: d1, arr: a1 } = makeArr();
    const { doc: d2, arr: a2 } = makeArr();
    // Seed both from the same baseline.
    const seed = [q('a'), q('b')];
    d1.transact(() => writeQuestions(a1, seed));
    Y.applyUpdate(d2, Y.encodeStateAsUpdate(d1));

    // Concurrent edits to DIFFERENT questions on each replica.
    d1.transact(() => writeQuestions(a1, [q('a', { question_text: 'edited on 1' }), q('b')]));
    d2.transact(() => writeQuestions(a2, [q('a'), q('b', { question_text: 'edited on 2' })]));

    // Exchange updates both ways.
    const u1 = Y.encodeStateAsUpdate(d1);
    const u2 = Y.encodeStateAsUpdate(d2);
    Y.applyUpdate(d1, u2);
    Y.applyUpdate(d2, u1);

    const r1 = readQuestions(a1);
    const r2 = readQuestions(a2);
    expect(r1).toEqual(r2); // both replicas converge
    expect(r1.find((x) => x.id === 'a')?.question_text).toBe('edited on 1');
    expect(r1.find((x) => x.id === 'b')?.question_text).toBe('edited on 2');
  });
});
