'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { AdminFetchError, fetchAdminMe, isAllowedAdminEmail } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardModals } from '@/components/dashboard/DashboardModals';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/unauthorized'];

type AuthState =
  | { status: 'checking' }
  | { status: 'signed-out' }
  | { status: 'unauthorized-domain' }
  | { status: 'error' }
  | { status: 'ok'; isAdmin: boolean };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'checking' });
  const router = useRouter();
  const pathname = usePathname();

  // The session/profile check is a network round trip — it only needs to run
  // once per mount, not on every in-dashboard navigation (re-running it per
  // pathname change was forcing a full DashboardProvider remount and a
  // second, redundant data-loading spinner on every sidebar click). But it
  // does need to re-run whenever the session itself changes — e.g. a user
  // who lands on this layout signed out, then signs in from a child page
  // (like /admin/login) without a full page reload. onAuthStateChange
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
        if (!cancelled) setAuth({ status: 'ok', isAdmin: me.is_admin });
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
    if (auth.status === 'signed-out') return PUBLIC_ADMIN_PATHS.includes(pathname);
    if (auth.status === 'unauthorized-domain') return pathname === '/admin/unauthorized';
    if (auth.status === 'error') return pathname === '/admin/login';
    // Only global admins may use /admin; everyone else is a student.
    if (!auth.isAdmin) return false;
    return !PUBLIC_ADMIN_PATHS.includes(pathname);
  }, [auth, pathname]);

  useEffect(() => {
    if (auth.status === 'checking') return;

    if (auth.status === 'signed-out') {
      if (!PUBLIC_ADMIN_PATHS.includes(pathname)) router.replace('/admin/login');
      return;
    }
    if (auth.status === 'unauthorized-domain') {
      if (pathname !== '/admin/unauthorized') router.replace('/admin/unauthorized');
      return;
    }
    if (auth.status === 'error') {
      if (pathname !== '/admin/login') router.replace('/admin/login');
      return;
    }

    if (!auth.isAdmin) {
      router.replace('/student');
      return;
    }
    if (PUBLIC_ADMIN_PATHS.includes(pathname)) {
      router.replace('/admin');
    }
  }, [auth, pathname, router]);

  if (!canRenderCurrentPath) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]"></div>
      </div>
    );
  }

  if (PUBLIC_ADMIN_PATHS.includes(pathname)) {
    return <div className="h-full overflow-y-auto w-full pb-20">{children}</div>;
  }

  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
      <DashboardModals />
    </DashboardProvider>
  );
}
