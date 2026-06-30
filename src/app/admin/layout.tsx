'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminFetchError, fetchAdminMe, isAllowedAdminEmail } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/unauthorized', '/admin/pending-team'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        if (!PUBLIC_ADMIN_PATHS.includes(pathname)) {
          router.push('/admin/login');
        }
        if (!cancelled) setLoading(false);
        return;
      }

      if (!isAllowedAdminEmail(session.user.email)) {
        await supabase.auth.signOut();
        if (pathname !== '/admin/unauthorized') router.push('/admin/unauthorized');
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const me = await fetchAdminMe();
        if (me.teams.length === 0 && pathname !== '/admin/pending-team') {
          router.push('/admin/pending-team');
          return;
        }
        if (me.teams.length > 0 && PUBLIC_ADMIN_PATHS.includes(pathname)) {
          router.push('/admin');
          return;
        }
      } catch (err) {
        if (err instanceof AdminFetchError && err.status === 403) {
          router.push('/admin/unauthorized');
        } else {
          await supabase.auth.signOut();
          router.push('/admin/login');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]"></div>
      </div>
    );
  }

  return <div className="h-full overflow-y-auto w-full pb-20">{children}</div>;
}
