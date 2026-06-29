// Phase 5: wires a survey editor's React state to a shared Yjs document that
// is synced over Supabase Realtime. The editor keeps its existing `useState`
// model; this hook mirrors that state into Yjs and back so multiple people can
// edit the same survey at once, conflict-free.
//
// Design notes for reliability:
//   * Every local write into Yjs uses a private `localOrigin`. The observers
//     ignore changes carrying that origin, so local edits never echo back into
//     React state (no feedback loops, no cursor jumps from your own typing).
//   * The shared doc is seeded exactly once, by a single elected client (lowest
//     Yjs clientID present), guarded by a `_seeded` flag. Every client loads the
//     same survey from Postgres independently, so non-seeders simply adopt the
//     synced baseline — identical data, no duplication.
//   * Bindings stay dormant until the doc is seeded, so an early edit can't race
//     the seed.
//   * If Supabase Realtime is unavailable the hook is simply inert and the
//     editor keeps working as a normal single-user form.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { SupabaseYjsProvider } from '@/lib/collab/SupabaseYjsProvider';
import { getCollaboratorIdentity, type CollaboratorIdentity } from '@/lib/collab/identity';
import {
  META_KEY,
  QUESTIONS_KEY,
  SEEDED_FLAG,
  deepEqual,
  readQuestions,
  writeQuestions,
  type QuestionRecord,
} from '@/lib/collab/surveyDoc';

const ELECTION_MS = 800;
const LOCAL_EDIT_GUARD_MS = 1500;
// Typing indicator: re-broadcast at most every THROTTLE while typing; clear
// after IDLE of no edits; treat a peer's flag as stale after TTL (crash safety).
const TYPING_THROTTLE_MS = 600;
const TYPING_IDLE_MS = 1800;
const TYPING_TTL_MS = 3000;

export interface FieldEditor {
  clientId: number;
  name: string;
  color: string;
  /** True while this person is actively typing in the field (not just focused). */
  active: boolean;
}

export interface CollaboratorPresence {
  clientId: number;
  id: string;
  name: string;
  color: string;
  isSelf: boolean;
}

export interface UseCollaborativeSurveyArgs {
  surveyId: string | undefined;
  /** Collaboration is only enabled for editable (unlocked) surveys. */
  enabled: boolean;
  /** True once the editor has loaded the survey from the API. */
  ready: boolean;
  title: string;
  setTitle: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  estimatedMinutes: number;
  setEstimatedMinutes: (v: number) => void;
  descriptionAlignment: string;
  setDescriptionAlignment: (v: string) => void;
  questions: QuestionRecord[];
  setQuestions: (q: QuestionRecord[]) => void;
}

export interface UseCollaborativeSurveyResult {
  active: boolean;
  connected: boolean;
  isSeeder: boolean;
  isSeeded: boolean;
  doc: Y.Doc | null;
  provider: SupabaseYjsProvider | null;
  awareness: Awareness | null;
  user: CollaboratorIdentity;
  peers: CollaboratorPresence[];
  /** Names of other collaborators currently typing (Google-Docs style). */
  typingNames: string[];
  /** Call on any local edit to broadcast a "typing…" signal to peers. */
  notifyTyping: () => void;
  /** Peers currently editing each field, keyed by a caller-chosen field id. */
  fieldEditors: Record<string, FieldEditor[]>;
  /** Announce which field this user is focused on (null to clear, e.g. on blur). */
  setFocusField: (key: string | null) => void;
}

export function useCollaborativeSurvey(
  args: UseCollaborativeSurveyArgs
): UseCollaborativeSurveyResult {
  const { surveyId, enabled, ready } = args;
  const user = useMemo(() => getCollaboratorIdentity(), []);

  // Session is held in state so the returned doc/provider/awareness are
  // render-safe (no reading refs during render).
  const [session, setSession] = useState<{
    doc: Y.Doc;
    provider: SupabaseYjsProvider;
    awareness: Awareness;
  } | null>(null);
  const [connected, setConnected] = useState(false);
  const [isSeeder, setIsSeeder] = useState(false);
  const [isSeeded, setIsSeeded] = useState(false);
  const [peers, setPeers] = useState<CollaboratorPresence[]>([]);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [fieldEditors, setFieldEditors] = useState<Record<string, FieldEditor[]>>({});

  const docRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const focusKeyRef = useRef<string | null>(null);
  const localOrigin = useRef<object>({});

  const seededRef = useRef(false);
  const isSeededRef = useRef(false);
  const electionDoneRef = useRef(false);
  const lastLocalEdit = useRef<Record<string, number>>({});
  const lastQuestionsJson = useRef<string>('');
  const lastTypingSent = useRef(0);
  const typingClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest props, so the one-shot seed and observers read fresh values without
  // re-subscribing on every keystroke. Updated after render (never during).
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });

  // Broadcast a throttled "typing" timestamp via awareness; auto-clear after a
  // short idle so peers see "… is typing" only while edits are actually flowing.
  const notifyTyping = useCallback(() => {
    const awareness = awarenessRef.current;
    if (!awareness) return;
    const now = Date.now();
    if (now - lastTypingSent.current > TYPING_THROTTLE_MS) {
      lastTypingSent.current = now;
      awareness.setLocalStateField('typing', now);
      // Keep the per-field "active" badge alive while typing in a focused field.
      if (focusKeyRef.current) {
        awareness.setLocalStateField('focus', { key: focusKeyRef.current, ts: now });
      }
    }
    if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
    typingClearTimer.current = setTimeout(() => {
      awarenessRef.current?.setLocalStateField('typing', null);
      lastTypingSent.current = 0;
    }, TYPING_IDLE_MS);
  }, []);

  // Announce (via awareness) which structured field this user is focused on, so
  // peers can show a "{name} is editing" badge on that exact question/option.
  const setFocusField = useCallback((key: string | null) => {
    focusKeyRef.current = key;
    const awareness = awarenessRef.current;
    if (!awareness) return;
    awareness.setLocalStateField('focus', key ? { key, ts: Date.now() } : null);
  }, []);

  const active = session !== null;

  // --- create the session ---
  useEffect(() => {
    if (!enabled || !surveyId) return;

    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    awareness.setLocalStateField('user', { id: user.id, name: user.name, color: user.color });
    const provider = new SupabaseYjsProvider(doc, `survey-collab:${surveyId}`, awareness);

    docRef.current = doc;
    awarenessRef.current = awareness;
    setSession({ doc, provider, awareness });

    const onStatus = (p: unknown) => setConnected(!!(p as { connected?: boolean })?.connected);
    provider.on('status', onStatus);

    const updatePeers = () => {
      const list: CollaboratorPresence[] = [];
      const typing: string[] = [];
      const editorsByField: Record<string, FieldEditor[]> = {};
      const now = Date.now();
      awareness.getStates().forEach((state, clientId) => {
        const u = (state as { user?: CollaboratorIdentity })?.user;
        if (!u) return;
        const isSelf = clientId === doc.clientID;
        list.push({ clientId, id: u.id, name: u.name, color: u.color, isSelf });
        if (isSelf) return;
        const ts = (state as { typing?: unknown })?.typing;
        if (typeof ts === 'number' && now - ts < TYPING_TTL_MS) typing.push(u.name);
        const focus = (state as { focus?: { key?: unknown; ts?: unknown } })?.focus;
        if (focus && typeof focus.key === 'string') {
          (editorsByField[focus.key] ??= []).push({
            clientId,
            name: u.name,
            color: u.color,
            active: typeof focus.ts === 'number' && now - focus.ts < TYPING_TTL_MS,
          });
        }
      });
      setPeers(list);
      setTypingNames(typing);
      setFieldEditors(editorsByField);
    };
    awareness.on('change', updatePeers);
    updatePeers();
    // Re-evaluate periodically so a peer's "typing" flag expires even if their
    // clear message never arrives (e.g. they closed the tab abruptly).
    const typingInterval = setInterval(updatePeers, 1000);

    const meta = doc.getMap(META_KEY);

    const applyRemoteScalar = (key: string, value: unknown) => {
      // Skip if the local user touched this field very recently (they're likely
      // typing in it); avoids yanking their cursor on a concurrent edit.
      if (Date.now() - (lastLocalEdit.current[key] || 0) < LOCAL_EDIT_GUARD_MS) return;
      const a = latest.current;
      switch (key) {
        case 'title':
          if (typeof value === 'string' && value !== a.title) a.setTitle(value);
          break;
        case 'category':
          if (typeof value === 'string' && value !== a.category) a.setCategory(value);
          break;
        case 'estimatedMinutes':
          if (typeof value === 'number' && value !== a.estimatedMinutes)
            a.setEstimatedMinutes(value);
          break;
        case 'descriptionAlignment':
          if (typeof value === 'string' && value !== a.descriptionAlignment)
            a.setDescriptionAlignment(value);
          break;
      }
    };

    const onMeta = (event: Y.YMapEvent<unknown>, txn: Y.Transaction) => {
      if (txn.origin === localOrigin.current) return;
      if (meta.get(SEEDED_FLAG) === true && !isSeededRef.current) {
        isSeededRef.current = true;
        setIsSeeded(true);
      }
      event.keysChanged.forEach((k) => {
        if (k === SEEDED_FLAG) return;
        applyRemoteScalar(k, meta.get(k));
      });
    };
    meta.observe(onMeta);

    const qArr = doc.getArray<Y.Map<unknown>>(QUESTIONS_KEY);
    const onQuestions = (_events: unknown, txn: Y.Transaction) => {
      if (txn.origin === localOrigin.current) return;
      const next = readQuestions(qArr);
      lastQuestionsJson.current = JSON.stringify(next);
      latest.current.setQuestions(next);
    };
    qArr.observeDeep(onQuestions);

    const runElection = () => {
      if (electionDoneRef.current) return;
      electionDoneRef.current = true;
      if (meta.get(SEEDED_FLAG) === true) {
        isSeededRef.current = true;
        setIsSeeded(true);
        return;
      }
      const ids = Array.from(awareness.getStates().keys());
      const minId = ids.length ? Math.min(...ids) : doc.clientID;
      setIsSeeder(doc.clientID === minId);
    };
    const electionTimer = setTimeout(runElection, ELECTION_MS);

    return () => {
      clearTimeout(electionTimer);
      clearInterval(typingInterval);
      if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
      awareness.off('change', updatePeers);
      provider.off('status', onStatus);
      meta.unobserve(onMeta);
      qArr.unobserveDeep(onQuestions);
      provider.destroy();
      doc.destroy();
      docRef.current = null;
      awarenessRef.current = null;
      seededRef.current = false;
      isSeededRef.current = false;
      electionDoneRef.current = false;
      lastQuestionsJson.current = '';
      setSession(null);
      setConnected(false);
      setIsSeeder(false);
      setIsSeeded(false);
      setPeers([]);
      setTypingNames([]);
      setFieldEditors({});
    };
    // user.id is stable for the session; re-create only when target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, surveyId, user.id]);

  // --- one-shot seed by the elected client, once data is loaded ---
  useEffect(() => {
    if (!active || !isSeeder || !ready || seededRef.current) return;
    const doc = docRef.current;
    if (!doc) return;
    const meta = doc.getMap(META_KEY);
    if (meta.get(SEEDED_FLAG) === true) {
      seededRef.current = true;
      isSeededRef.current = true;
      setIsSeeded(true);
      return;
    }
    const a = latest.current;
    const qArr = doc.getArray<Y.Map<unknown>>(QUESTIONS_KEY);
    doc.transact(() => {
      meta.set('title', a.title);
      meta.set('category', a.category);
      meta.set('estimatedMinutes', a.estimatedMinutes);
      meta.set('descriptionAlignment', a.descriptionAlignment);
      writeQuestions(qArr, a.questions);
      meta.set(SEEDED_FLAG, true);
    }, localOrigin.current);
    lastQuestionsJson.current = JSON.stringify(a.questions);
    seededRef.current = true;
    isSeededRef.current = true;
    setIsSeeded(true);
  }, [active, isSeeder, ready]);

  // --- push local scalar edits into Yjs ---
  useEffect(() => {
    if (!isSeeded) return;
    const doc = docRef.current;
    if (!doc) return;
    const meta = doc.getMap(META_KEY);
    const pairs: [string, unknown][] = [
      ['title', args.title],
      ['category', args.category],
      ['estimatedMinutes', args.estimatedMinutes],
      ['descriptionAlignment', args.descriptionAlignment],
    ];
    let changed = false;
    doc.transact(() => {
      for (const [k, v] of pairs) {
        if (!deepEqual(meta.get(k), v)) {
          lastLocalEdit.current[k] = Date.now();
          meta.set(k, v);
          changed = true;
        }
      }
    }, localOrigin.current);
    if (changed) notifyTyping();
  }, [
    args.title,
    args.category,
    args.estimatedMinutes,
    args.descriptionAlignment,
    isSeeded,
    notifyTyping,
  ]);

  // --- push local question edits into Yjs ---
  useEffect(() => {
    if (!isSeeded) return;
    const doc = docRef.current;
    if (!doc) return;
    const json = JSON.stringify(args.questions);
    if (json === lastQuestionsJson.current) return; // unchanged or came from a peer
    const qArr = doc.getArray<Y.Map<unknown>>(QUESTIONS_KEY);
    doc.transact(() => writeQuestions(qArr, args.questions), localOrigin.current);
    lastQuestionsJson.current = json;
    notifyTyping();
  }, [args.questions, isSeeded, notifyTyping]);

  return {
    active,
    connected,
    isSeeder,
    isSeeded,
    doc: session?.doc ?? null,
    provider: session?.provider ?? null,
    awareness: session?.awareness ?? null,
    user,
    peers,
    typingNames,
    notifyTyping,
    fieldEditors,
    setFocusField,
  };
}
