'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminFetchError, fetchAdminMe, isAllowedAdminEmail } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardModals } from '@/components/dashboard/DashboardModals';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/unauthorized'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
        if (!PUBLIC_ADMIN_PATHS.includes(pathname)) {
          router.replace('/admin/login');
          return;
        }
        allowCurrentPage();
        return;
      }

      if (!isAllowedAdminEmail(session.user.email)) {
        await supabase.auth.signOut();
        if (pathname !== '/admin/unauthorized') {
          router.replace('/admin/unauthorized');
          return;
        }
        allowCurrentPage();
        return;
      }

      try {
        const me = await fetchAdminMe();
        // Only global admins may use /admin; everyone else is a student.
        if (!me.is_admin) {
          router.replace('/student');
          return;
        }
        if (PUBLIC_ADMIN_PATHS.includes(pathname)) {
          router.replace('/admin');
          return;
        }
        allowCurrentPage();
      } catch (err) {
        if (err instanceof AdminFetchError && err.status === 403) {
          if (pathname === '/admin/unauthorized') {
            allowCurrentPage();
          } else {
            router.replace('/admin/unauthorized');
          }
        } else {
          await supabase.auth.signOut();
          if (pathname === '/admin/login') {
            allowCurrentPage();
          } else {
            router.replace('/admin/login');
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
