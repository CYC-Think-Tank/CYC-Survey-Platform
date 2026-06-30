// Phase 5: live presence bar — shows who is currently in the editor.
'use client';

import type { CollaboratorPresence } from '@/hooks/useCollaborativeSurvey';

interface PresenceBarProps {
  peers: CollaboratorPresence[];
  connected: boolean;
  typingNames?: string[];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function typingLabel(names: string[]): string {
  if (names.length === 1) return `${names[0]} is typing`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
  return `${names[0]} and ${names.length - 1} others are typing`;
}

export function PresenceBar({ peers, connected, typingNames = [] }: PresenceBarProps) {
  // Self first, then others, capped so the bar can't overflow.
  const ordered = [...peers].sort((a, b) => (a.isSelf === b.isSelf ? 0 : a.isSelf ? -1 : 1));
  const shown = ordered.slice(0, 5);
  const overflow = ordered.length - shown.length;
  const othersCount = peers.filter((p) => !p.isSelf).length;
  const isTyping = typingNames.length > 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            connected ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-slate-600'
          }`}
          title={connected ? 'Live — connected' : 'Connecting…'}
        />
        {isTyping ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-cyc-primary)]">
            <span className="flex items-end gap-0.5" aria-hidden>
              <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-1 rounded-full bg-current animate-bounce" />
            </span>
            {typingLabel(typingNames)}
          </span>
        ) : (
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
            {connected
              ? othersCount > 0
                ? `${othersCount} other${othersCount === 1 ? '' : 's'} editing`
                : 'Live'
              : 'Connecting…'}
          </span>
        )}
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
