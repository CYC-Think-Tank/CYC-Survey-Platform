'use client';
import { motion } from 'motion/react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { getAllowedAdminEmailDomain } from '@/lib/adminAuth';
import { useAdminDashboard } from '@/contexts/AdminDashboardContext';

export default function AdminSettingsPage() {
  const { adminEmail, handleLogout } = useAdminDashboard();
  const allowedDomain = getAllowedAdminEmailDomain();

  return (
    <div className="max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">Manage your admin account.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-6 rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="mb-4 font-display text-lg font-medium tracking-tight text-ink">Account</h2>
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="text-sm text-ink-soft">Email</p>
            <p className="font-medium text-ink">{adminEmail || 'Loading…'}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-ink">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin
          </span>
        </div>
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="text-sm text-ink-soft">Access</p>
            <p className="text-sm text-ink">
              Restricted to <span className="font-mono">@{allowedDomain || 'unconfigured'}</span>{' '}
              accounts.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="mb-1 font-display text-lg font-medium tracking-tight text-ink">Sign Out</h2>
        <p className="mb-4 text-sm text-ink-soft">
          You&apos;ll need to sign back in to manage surveys.
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </motion.div>
    </div>
  );
}
