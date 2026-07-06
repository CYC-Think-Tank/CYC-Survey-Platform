'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import {
  AdminFetchError,
  fetchAdminMe,
  isAllowedAdminEmail,
  type AdminTeam,
} from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardModals } from '@/components/dashboard/DashboardModals';

// Rendered without the sidebar dashboard shell. /student/teams is the teams
// hub (invites, join/create/leave a team) — always a valid destination, even
// for a student who already belongs to a team, so it is intentionally not
// force-redirected away from below.
const NO_SHELL_PATHS = ['/student/login', '/student/unauthorized', '/student/teams'];
// Redirect away from these once the user is authenticated and allowed in.
const AUTH_ENTRY_PATHS = ['/student/login', '/student/unauthorized'];

type AuthState =
  | { status: 'checking' }
  | { status: 'signed-out' }
  | { status: 'unauthorized-domain' }
  | { status: 'error' }
  | { status: 'ok'; isAdmin: boolean; teams: AdminTeam[] };

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'checking' });
  const router = useRouter();
  const pathname = usePathname();

  // The session/profile check is a network round trip — it only needs to run
  // once per mount, not on every in-dashboard navigation (re-running it per
  // pathname change was forcing a full DashboardProvider remount and a
  // second, redundant data-loading spinner on every sidebar click). But it
  // does need to re-run whenever the session itself changes — e.g. a user
  // who lands on this layout signed out, then signs in from a child page
  // (like /student/login) without a full page reload. onAuthStateChange
  // covers both: it fires once immediately with the current session and
  // again on every subsequent sign-in/sign-out, so a single subscription
  // replaces a one-shot getSession() call without re-running on navigation.
  useEffect(() => {
    let cancelled = false;

    const resolve = async (session: Session | null) => {
      if (!session) {
        if (!cancelled) setAuth({ status: 'signed-out' });
        return;
      }

      if (!isAllowedAdminEmail(session.user.email)) {
        await supabase.auth.signOut();
        if (!cancelled) setAuth({ status: 'unauthorized-domain' });
        return;
      }

      try {
        const me = await fetchAdminMe();
        if (!cancelled) setAuth({ status: 'ok', isAdmin: me.is_admin, teams: me.teams });
      } catch (err) {
        if (err instanceof AdminFetchError && err.status === 403) {
          if (!cancelled) setAuth({ status: 'unauthorized-domain' });
        } else {
          await supabase.auth.signOut();
          if (!cancelled) setAuth({ status: 'error' });
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolve(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Pure function of already-resolved auth state + the current pathname —
  // no network calls, so this recomputes instantly on navigation instead of
  // flashing the spinner while a redirect target is worked out.
  const canRenderCurrentPath = useMemo(() => {
    if (auth.status === 'checking') return false;
    if (auth.status === 'signed-out') return NO_SHELL_PATHS.includes(pathname);
    if (auth.status === 'unauthorized-domain') return pathname === '/student/unauthorized';
    if (auth.status === 'error') return pathname === '/student/login';
    if (auth.isAdmin) return false;
    if (auth.teams.length === 0) return NO_SHELL_PATHS.includes(pathname);
    return !AUTH_ENTRY_PATHS.includes(pathname);
  }, [auth, pathname]);

  useEffect(() => {
    if (auth.status === 'checking') return;

    if (auth.status === 'signed-out') {
      if (!NO_SHELL_PATHS.includes(pathname)) router.replace('/student/login');
      return;
    }
    if (auth.status === 'unauthorized-domain') {
      if (pathname !== '/student/unauthorized') router.replace('/student/unauthorized');
      return;
    }
    if (auth.status === 'error') {
      if (pathname !== '/student/login') router.replace('/student/login');
      return;
    }

    // Global admins belong in the /admin area, not the student team space.
    if (auth.isAdmin) {
      router.replace('/admin');
      return;
    }
    // The survey dashboard requires a team; send teamless students to the
    // hub to join/create one first.
    if (auth.teams.length === 0 && !NO_SHELL_PATHS.includes(pathname)) {
      router.replace('/student/teams');
      return;
    }
    // Login always lands on the hub first — the dashboard is reached by
    // explicitly clicking through from there.
    if (AUTH_ENTRY_PATHS.includes(pathname)) {
      router.replace('/student/teams');
    }
  }, [auth, pathname, router]);

  if (!canRenderCurrentPath) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]"></div>
      </div>
    );
  }

  if (NO_SHELL_PATHS.includes(pathname)) {
    return <div className="h-full overflow-y-auto w-full pb-20">{children}</div>;
  }

  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
      <DashboardModals />
    </DashboardProvider>
  );
}
