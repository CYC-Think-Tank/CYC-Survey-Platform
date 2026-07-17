'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid,
  FileText,
  BarChart3,
  Users,
  Settings,
  Search,
  PlusCircle,
  LogOut,
  Newspaper,
  Home,
  UserCog,
  Trophy,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useDashboard } from '@/contexts/DashboardContext';
import { cn } from '@/lib/utils';

function buildNavItems(basePath: string) {
  return [
    {
      href: basePath,
      label: 'Overview',
      icon: LayoutGrid,
      match: (p: string) => p === basePath,
      adminOnly: false,
      studentOnly: false,
      raffleOnly: false,
    },
    {
      href: `${basePath}/surveys`,
      label: 'Surveys',
      icon: FileText,
      match: (p: string) =>
        p.startsWith(`${basePath}/surveys`) ||
        p.startsWith(`${basePath}/edit`) ||
        p.startsWith(`${basePath}/results`),
      adminOnly: false,
      studentOnly: false,
      raffleOnly: false,
    },
    {
      href: '/admin/blog',
      label: 'Blog',
      icon: Newspaper,
      match: (p: string) => p.startsWith('/admin/blog'),
      adminOnly: true,
      studentOnly: false,
      raffleOnly: false,
    },
    {
      href: `${basePath}/analytics`,
      label: 'Analytics',
      icon: BarChart3,
      match: (p: string) => p.startsWith(`${basePath}/analytics`),
      adminOnly: false,
      studentOnly: false,
      raffleOnly: false,
    },
    {
      href: `${basePath}/audience`,
      label: 'Audience',
      icon: Users,
      match: (p: string) => p.startsWith(`${basePath}/audience`),
      adminOnly: false,
      studentOnly: false,
      raffleOnly: false,
    },
    {
      href: `${basePath}/raffle`,
      label: 'Raffle',
      icon: Trophy,
      match: (p: string) => p.startsWith(`${basePath}/raffle`),
      adminOnly: false,
      studentOnly: false,
      raffleOnly: true,
    },
    {
      href: `${basePath}/settings`,
      label: 'Team Settings',
      icon: Settings,
      match: (p: string) => p.startsWith(`${basePath}/settings`),
      adminOnly: false,
      studentOnly: true,
      raffleOnly: false,
    },
  ];
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const {
    role,
    basePath,
    searchQuery,
    setSearchQuery,
    openCreateModal,
    adminEmail,
    handleLogout,
    openAccountSettings,
    isTeamLeader,
  } = useDashboard();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const initials = adminEmail ? adminEmail.slice(0, 2).toUpperCase() : '··';
  const navItems = buildNavItems(basePath).filter(
    (item) =>
      (!item.adminOnly || role === 'admin') &&
      (!item.studentOnly || role === 'student') &&
      (!item.raffleOnly || role === 'admin' || isTeamLeader)
  );

  return (
    <div className="flex min-h-screen w-full bg-cream">
      {/* Sidebar — pinned to the viewport so it never scrolls; only the page
          content scrolls past it. */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center justify-between gap-2 px-6 py-6">
          <Image
            src="/logo.png"
            alt="CYC"
            width={120}
            height={34}
            className="h-7 w-auto object-contain dark:brightness-110"
          />
          <Link
            href="/"
            title="Back to site"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cream-deep hover:text-ink dark:hover:bg-white/10"
          >
            <Home className="h-[18px] w-[18px]" />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-cream-deep text-ink dark:bg-white/10'
                    : 'text-ink-soft hover:bg-cream-deep/60 hover:text-ink dark:hover:bg-white/5'
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative border-t border-border p-3">
          <button
            onClick={() => setAccountMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-cream-deep dark:hover:bg-white/5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-cream">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                {adminEmail || 'Loading…'}
              </span>
              <span className="block text-xs text-ink-soft">
                {role === 'admin' ? 'Admin' : 'Team member'}
              </span>
            </span>
          </button>

          <AnimatePresence>
            {accountMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAccountMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-3 right-3 z-50 mb-2 origin-bottom rounded-xl border border-border bg-card shadow-cute py-1.5"
                >
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      openAccountSettings();
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-deep hover:text-ink dark:hover:bg-white/5"
                  >
                    <UserCog className="h-4 w-4" />
                    Account Settings
                  </button>
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              title="Back to site"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cream-deep hover:text-ink dark:hover:bg-white/10 md:hidden"
            >
              <Home className="h-[18px] w-[18px]" />
            </Link>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search surveys…"
                className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={openCreateModal}
              className="flex items-center whitespace-nowrap rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-cream transition-opacity hover:opacity-90"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Survey
            </motion.button>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
