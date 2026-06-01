'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isAuth = localStorage.getItem('cyc_admin_auth') === 'true';

    if (!isAuth && pathname !== '/admin/login') {
      router.push('/admin/login');
    } else if (isAuth && pathname === '/admin/login') {
      router.push('/admin');
    }
    setLoading(false);
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
