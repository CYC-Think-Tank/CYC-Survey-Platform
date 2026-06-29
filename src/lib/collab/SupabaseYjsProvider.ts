// Phase 5: Yjs transport over Supabase Realtime broadcast.
//
// The plan calls for Yjs (conflict-free merging) with Supabase Realtime
// broadcast channels as the transport between clients. There is no dedicated
// Yjs websocket server, so this lightweight provider plays that role:
//
//   * local Yjs document updates  -> broadcast to the channel
//   * incoming updates            -> applied to the local document
//   * a join handshake            -> new clients receive the current state
//   * awareness (presence/cursors)-> exchanged the same way
//
// Yjs guarantees that applying updates in any order converges to the same
// document, so out-of-order or duplicated broadcasts are harmless. That is what
// makes simultaneous editing conflict-free ("Google Docs / Figma" behaviour).

import * as Y from 'yjs';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Listener = (payload: unknown) => void;

// --- base64 <-> Uint8Array (Supabase broadcast payloads must be JSON) ---
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const EVENT = {
  syncRequest: 'sync-request',
  syncReply: 'sync-reply',
  update: 'update',
  awareness: 'awareness',
} as const;

export class SupabaseYjsProvider {
  readonly doc: Y.Doc;
  readonly awareness: Awareness;
  readonly channel: RealtimeChannel;

  /** True once we have received state from at least one peer (or timed out alone). */
  synced = false;
  connected = false;

  private listeners = new Map<string, Set<Listener>>();
  private destroyed = false;

  constructor(doc: Y.Doc, channelName: string, awareness?: Awareness) {
    this.doc = doc;
    this.awareness = awareness ?? new Awareness(doc);

    this.channel = supabase.channel(channelName, {
      config: { broadcast: { self: false, ack: false } },
    });

    this.channel
      .on('broadcast', { event: EVENT.syncRequest }, () => this.sendFullState(EVENT.syncReply))
      .on('broadcast', { event: EVENT.syncReply }, ({ payload }) => this.applyRemoteUpdate(payload))
      .on('broadcast', { event: EVENT.update }, ({ payload }) => this.applyRemoteUpdate(payload))
      .on('broadcast', { event: EVENT.awareness }, ({ payload }) =>
        this.applyRemoteAwareness(payload)
      );

    this.doc.on('update', this.onDocUpdate);
    this.awareness.on('update', this.onAwarenessUpdate);
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.onBeforeUnload);
    }

    this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.connected = true;
        // Ask peers for their state and proactively share ours, then announce
        // our presence. Whoever is already here will reply with the document.
        this.broadcast(EVENT.syncRequest, {});
        this.sendFullState(EVENT.syncReply);
        this.broadcastAwareness([this.doc.clientID]);
        this.emit('status', { connected: true });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        this.connected = false;
        this.emit('status', { connected: false });
      }
    });
  }

  // --- document sync ---
  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) return; // applied from a peer; don't echo it back
    this.broadcast(EVENT.update, { u: toBase64(update) });
  };

  private applyRemoteUpdate = (payload: unknown) => {
    const u = (payload as { u?: string })?.u;
    if (!u) return;
    Y.applyUpdate(this.doc, fromBase64(u), this);
    if (!this.synced) {
      this.synced = true;
      this.emit('synced', true);
    }
  };

  private sendFullState(event: string) {
    this.broadcast(event, { u: toBase64(Y.encodeStateAsUpdate(this.doc)) });
  }

  // --- awareness (presence + cursors) ---
  private onAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    if (origin === this) return; // applied from a peer
    this.broadcastAwareness([...changes.added, ...changes.updated, ...changes.removed]);
  };

  private broadcastAwareness(clients: number[]) {
    if (clients.length === 0) return;
    this.broadcast(EVENT.awareness, {
      u: toBase64(encodeAwarenessUpdate(this.awareness, clients)),
    });
  }

  private applyRemoteAwareness = (payload: unknown) => {
    const u = (payload as { u?: string })?.u;
    if (!u) return;
    applyAwarenessUpdate(this.awareness, fromBase64(u), this);
  };

  // --- transport + tiny event emitter ---
  private broadcast(event: string, payload: Record<string, unknown>) {
    if (!this.connected || this.destroyed) return;
    void this.channel.send({ type: 'broadcast', event, payload });
  }

  on(event: 'synced' | 'status', cb: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
  }

  off(event: 'synced' | 'status', cb: Listener) {
    this.listeners.get(event)?.delete(cb);
  }

  private emit(event: string, payload: unknown) {
    this.listeners.get(event)?.forEach((cb) => cb(payload));
  }

  private onBeforeUnload = () => {
    removeAwarenessStates(this.awareness, [this.doc.clientID], 'unload');
  };

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    // Tell peers we're gone so our avatar/cursor disappears promptly.
    removeAwarenessStates(this.awareness, [this.doc.clientID], 'destroy');
    this.doc.off('update', this.onDocUpdate);
    this.awareness.off('update', this.onAwarenessUpdate);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.onBeforeUnload);
    }
    void supabase.removeChannel(this.channel);
    this.listeners.clear();
  }
}
