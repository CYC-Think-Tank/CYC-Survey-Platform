// Phase 5: live presence bar — shows who is currently in the editor.
'use client';

import type { CollaboratorPresence } from '@/hooks/useCollaborativeSurvey';

interface PresenceBarProps {
  peers: CollaboratorPresence[];
  connected: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PresenceBar({ peers, connected }: PresenceBarProps) {
  // Self first, then others, capped so the bar can't overflow.
  const ordered = [...peers].sort((a, b) => (a.isSelf === b.isSelf ? 0 : a.isSelf ? -1 : 1));
  const shown = ordered.slice(0, 5);
  const overflow = ordered.length - shown.length;
  const othersCount = peers.filter((p) => !p.isSelf).length;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            connected ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-slate-600'
          }`}
          title={connected ? 'Live — connected' : 'Connecting…'}
        />
        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
          {connected
            ? othersCount > 0
              ? `${othersCount} other${othersCount === 1 ? '' : 's'} editing`
              : 'Live'
            : 'Connecting…'}
        </span>
      </div>

      <div className="flex -space-x-2">
        {shown.map((p) => (
          <div
            key={p.clientId}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-800"
            style={{ backgroundColor: p.color }}
            title={p.isSelf ? `${p.name} (you)` : p.name}
          >
            {initials(p.name)}
          </div>
        ))}
        {overflow > 0 && (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-slate-200 bg-gray-200 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-800"
            title={`${overflow} more`}
          >
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}
