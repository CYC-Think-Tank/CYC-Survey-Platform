// Phase 5: per-field presence badge — shows who is editing a specific
// question or option, with a pulse while they're actively typing.
'use client';

import type { FieldEditor } from '@/hooks/useCollaborativeSurvey';

export function FieldPresence({ editors }: { editors?: FieldEditor[] }) {
  if (!editors || editors.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {editors.map((e) => (
        <span
          key={e.clientId}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white whitespace-nowrap shadow-sm"
          style={{ backgroundColor: e.color }}
          title={`${e.name} is editing this`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full bg-white/90 ${e.active ? 'animate-pulse' : 'opacity-50'}`}
          />
          {e.name}
        </span>
      ))}
    </span>
  );
}
