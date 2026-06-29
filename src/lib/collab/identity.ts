// Phase 5: collaborator identity.
//
// There is no account system yet (that arrives with Phases 1-3 of the plan), so
// each browser tab gets a stable, friendly anonymous identity for the duration
// of the session. Once real auth lands, replace `getCollaboratorIdentity()`
// with the signed-in user's name + a colour derived from their id; the rest of
// the collaboration stack (awareness, presence bar, cursors) consumes this
// shape unchanged.

export interface CollaboratorIdentity {
  /** Stable id for this tab session (NOT a user id). */
  id: string;
  name: string;
  /** Hex colour used for the presence avatar and live cursor. */
  color: string;
}

const STORAGE_KEY = 'cyc_collab_identity';

// Distinct, reasonably high-contrast colours for cursors/avatars.
const COLORS = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#ca8a04',
  '#4f46e5',
  '#ea580c',
];

const ANIMALS = [
  'Otter',
  'Falcon',
  'Maple',
  'Beaver',
  'Heron',
  'Lynx',
  'Moose',
  'Puffin',
  'Caribou',
  'Loon',
  'Bison',
  'Orca',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns the identity for this tab, generating and persisting one on first use.
 * Persisted in sessionStorage so a reload keeps the same name/colour but a new
 * tab is treated as a separate collaborator.
 */
export function getCollaboratorIdentity(): CollaboratorIdentity {
  if (typeof window === 'undefined') {
    return { id: 'server', name: 'Anonymous', color: COLORS[0] };
  }

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CollaboratorIdentity;
      if (parsed?.id && parsed?.name && parsed?.color) return parsed;
    }
  } catch {
    /* fall through to regenerate */
  }

  const identity: CollaboratorIdentity = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    name: `Anonymous ${randomItem(ANIMALS)}`,
    color: randomItem(COLORS),
  };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    /* sessionStorage unavailable (private mode) — identity stays in-memory */
  }

  return identity;
}
