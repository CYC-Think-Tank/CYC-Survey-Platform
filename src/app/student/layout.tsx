'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminFetchError, fetchAdminMe, isAllowedAdminEmail } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardModals } from '@/components/dashboard/DashboardModals';

const PUBLIC_STUDENT_PATHS = ['/student/login', '/student/unauthorized', '/student/pending-team'];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [canRender, setCanRender] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      setLoading(true);
      setCanRender(false);

      const allowCurrentPage = () => {
        if (!cancelled) {
          setCanRender(true);
          setLoading(false);
        }
      };

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        if (!PUBLIC_STUDENT_PATHS.includes(pathname)) {
          router.replace('/student/login');
          return;
        }
        allowCurrentPage();
        return;
      }

      if (!isAllowedAdminEmail(session.user.email)) {
        await supabase.auth.signOut();
        if (pathname !== '/student/unauthorized') {
          router.replace('/student/unauthorized');
          return;
        }
        allowCurrentPage();
        return;
      }

      try {
        const me = await fetchAdminMe();
        // Global admins belong in the /admin area, not the student team space.
        if (me.is_admin) {
          router.replace('/admin');
          return;
        }
        if (me.teams.length === 0 && pathname !== '/student/pending-team') {
          router.replace('/student/pending-team');
          return;
        }
        if (me.teams.length > 0 && PUBLIC_STUDENT_PATHS.includes(pathname)) {
          router.replace('/student');
          return;
        }
        allowCurrentPage();
      } catch (err) {
        if (err instanceof AdminFetchError && err.status === 403) {
          if (pathname === '/student/unauthorized') {
            allowCurrentPage();
          } else {
            router.replace('/student/unauthorized');
          }
        } else {
          await supabase.auth.signOut();
          if (pathname === '/student/login') {
            allowCurrentPage();
          } else {
            router.replace('/student/login');
          }
        }
      }
    };

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (loading || !canRender) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]"></div>
      </div>
    );
  }

  if (PUBLIC_STUDENT_PATHS.includes(pathname)) {
    return <div className="h-full overflow-y-auto w-full pb-20">{children}</div>;
  }

  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
      <DashboardModals />
    </DashboardProvider>
  );
}
