'use client';
import { ReactNode } from 'react';

/** Shared input styling for every auth field, tuned to the redesign palette. */
export const authInputClass =
  'w-full rounded-xl border border-border bg-cream-deep/50 px-4 py-3 text-ink placeholder:text-ink-soft/60 transition-all focus:border-teal focus:bg-card focus:outline-none focus:ring-4 focus:ring-teal-soft';

/** Themed inline error banner. */
export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
      {children}
    </div>
  );
}

/** Themed inline success / info banner. */
export function AuthNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-deep">
      {children}
    </div>
  );
}

interface AuthShellProps {
  /** Small brand glyph shown in the badge above the title. */
  icon: ReactNode;
  title: string;
  subtitle?: string;
  /** The form / body of the card. */
  children: ReactNode;
  /** Optional link row rendered under the card. */
  footer?: ReactNode;
}

/**
 * Centered auth layout for the sign-in screens. Soft drifting accent glows sit
 * behind a single elevated card, matching the landing/dashboard redesign
 * (teal/gold accents, cream/dark surfaces, display type). Works in both light
 * and dark themes via the app's swappable color variables.
 */
export function AuthShell({ icon, title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="relative flex min-h-[calc(100svh-6rem)] items-center justify-center overflow-hidden px-4 py-16">
      {/* decorative themed glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-drift-a absolute -left-16 -top-24 h-80 w-80 rounded-full bg-teal-soft opacity-70 blur-3xl" />
        <div className="animate-drift-b absolute -bottom-24 -right-10 h-96 w-96 rounded-full bg-gold-soft opacity-60 blur-3xl" />
        <div className="animate-drift-c absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-navy-soft opacity-50 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-soft text-teal shadow-cute-sm ring-1 ring-teal/20">
            {icon}
          </span>
          <h1 className="font-display text-3xl font-normal tracking-tighter text-ink">{title}</h1>
          {subtitle && <p className="mt-2 max-w-xs text-sm text-ink-soft">{subtitle}</p>}
        </div>

        <div className="card rounded-3xl p-8 shadow-cute">{children}</div>

        {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
      </div>
    </div>
  );
}
