// Phase 5: shared Yjs document shape for a survey + reconciliation helpers.
//
// The document has three parts:
//   meta        Y.Map     scalar survey fields (title, category, minutes, ...)
//                         plus a `_seeded` flag set once the baseline is loaded.
//   description Y.XmlFragment  bound directly by the TipTap Collaboration
//                         extension (character-level merge + live cursors).
//   questions   Y.Array<Y.Map>  one Y.Map per question, fields stored per-key so
//                         concurrent edits to *different* fields/questions merge.
//
// The existing survey editor keeps a plain `questions: QuestionDraft[]` React
// state and replaces it wholesale on every change. Rather than rewrite all of
// that, these helpers reconcile that array against the Y.Array with minimal
// operations, so normal typing only touches the field that actually changed.

import * as Y from 'yjs';

export const META_KEY = 'meta';
export const DESCRIPTION_KEY = 'description';
export const QUESTIONS_KEY = 'questions';
export const SEEDED_FLAG = '_seeded';

export type QuestionRecord = { id: string } & Record<string, unknown>;

/** Structural equality for the JSON-like values we store in question fields. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
    for (const k of keys) {
      if (!deepEqual(ao[k], bo[k])) return false;
    }
    return true;
  }
  return false;
}

function questionToYMap(q: QuestionRecord): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) map.set(k, v);
  }
  return map;
}

export function yMapToQuestion(map: Y.Map<unknown>): QuestionRecord {
  const obj = map.toJSON() as QuestionRecord;
  return obj;
}

export function readQuestions(arr: Y.Array<Y.Map<unknown>>): QuestionRecord[] {
  return arr.map((m) => yMapToQuestion(m));
}

/** Update a single question's Y.Map in place, touching only changed keys. */
function updateQuestionFields(map: Y.Map<unknown>, desired: QuestionRecord) {
  const keys = new Set<string>([...map.keys(), ...Object.keys(desired)]);
  for (const k of keys) {
    if (k === 'id') continue;
    const next = desired[k];
    if (next === undefined) {
      if (map.has(k)) map.delete(k);
      continue;
    }
    if (!deepEqual(map.get(k), next)) map.set(k, next);
  }
}

/**
 * Reconcile a Y.Array<Y.Map> so it matches `desired`. MUST be called inside a
 * `doc.transact(..., origin)` so the change is attributed and broadcast once.
 *
 * Fast path: when the id sequence is unchanged (the common keystroke case) only
 * the changed fields of the changed question are written. Structural changes
 * (add / remove / reorder) rebuild the array — these are discrete user actions,
 * not per-keystroke, so the extra churn is acceptable.
 */
export function writeQuestions(arr: Y.Array<Y.Map<unknown>>, desired: QuestionRecord[]) {
  const sameStructure =
    arr.length === desired.length &&
    desired.every((q, i) => (arr.get(i) as Y.Map<unknown>).get('id') === q.id);

  if (sameStructure) {
    for (let i = 0; i < desired.length; i++) {
      updateQuestionFields(arr.get(i) as Y.Map<unknown>, desired[i]);
    }
    return;
  }

  if (arr.length > 0) arr.delete(0, arr.length);
  arr.insert(
    0,
    desired.map((q) => questionToYMap(q))
  );
}
