'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/config/languages';
import ThemeToggle from '@/components/ThemeToggle';
import { motion, useScroll, useMotionValueEvent } from 'motion/react';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const { language, enabledLanguages, setLanguage } = useLanguage();
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsScrolled(latest > 48);
  });

  const languageUnavailable =
    enabledLanguages && enabledLanguages.length > 0 && !enabledLanguages.includes(language);

  // Landing hero is a dark photo — render the header white-on-transparent
  // over it, then switch to the normal glass bar once scrolled.
  const overHero = pathname === '/' && !isScrolled;

  const navLink = cn(
    'font-display text-sm font-semibold transition-colors',
    overHero ? 'text-white/90 hover:text-white' : 'text-ink-soft hover:text-teal'
  );

  // The admin/student dashboards (everything except their own
  // login/unauthorized screens) have their own nav — either the sidebar
  // shell, or (for /student/teams) the hub's own back/sign-out controls —
  // so this marketing header would just duplicate/clash with it.
  const DASHBOARD_PUBLIC_PATHS = [
    '/admin/login',
    '/admin/unauthorized',
    '/student/login',
    '/student/unauthorized',
  ];
  if (
    (pathname.startsWith('/admin') || pathname.startsWith('/student')) &&
    !DASHBOARD_PUBLIC_PATHS.includes(pathname)
  ) {
    return null;
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        // Fixed over the landing hero so the photo runs under it; sticky (in-flow)
        // everywhere else so non-restyled pages aren't overlapped.
        pathname === '/' ? 'fixed inset-x-0 top-0' : 'sticky top-0 w-full',
        'z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300',
        isScrolled ? 'bg-card/90 shadow-cute-sm backdrop-blur-md' : 'bg-transparent'
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-7xl items-center justify-between px-6 transition-all duration-300 sm:px-8 lg:px-12',
          isScrolled ? 'py-3' : 'py-6'
        )}
      >
        {/* left: logo */}
        <Link href="/" aria-label="CYC Think Tank home" className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="CYC Think Tank"
            width={200}
            height={56}
            className={cn(
              'h-9 w-auto object-contain transition-all duration-300',
              overHero ? 'brightness-0 invert' : 'dark:brightness-110'
            )}
            priority
          />
        </Link>

        {/* right: nav links + language + actions */}
        <div className="flex items-center gap-5 sm:gap-8">
          <nav className="flex items-center gap-4 sm:gap-7">
            <Link href="/blog" className={navLink}>
              Publications
            </Link>
            {!pathname.startsWith('/admin') && !pathname.startsWith('/student') && (
              <Link href="/student/login" className={navLink}>
                Student Login
              </Link>
            )}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className={cn(
                  'flex items-center space-x-1.5 text-sm font-medium transition-colors px-3 py-1.5 rounded-full border focus:outline-none focus:ring-2 focus:ring-teal',
                  overHero
                    ? 'text-white/90 hover:text-white border-white/30 hover:bg-white/10'
                    : 'text-ink-soft hover:text-teal bg-card hover:bg-cream-deep border-border'
                )}
              >
                <Globe className="w-4 h-4" />
                <span>
                  {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName || language}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {langDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setLangDropdownOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-48 bg-card rounded-xl shadow-cute border border-border py-1 z-50 overflow-hidden">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const disabled =
                        enabledLanguages != null &&
                        enabledLanguages.length > 0 &&
                        !enabledLanguages.includes(lang.code);
                      return (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code as Language);
                            setLangDropdownOpen(false);
                          }}
                          disabled={disabled}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${disabled ? 'opacity-50 cursor-not-allowed bg-cream-deep text-ink-soft' : 'hover:bg-cream-deep text-ink'} ${language === lang.code ? 'font-bold text-teal bg-teal-soft' : ''}`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{lang.nativeName}</span>
                            <span className="text-[10px] text-ink-soft text-right">
                              {lang.name}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {languageUnavailable && (
              <span className="text-amber-600 text-xs whitespace-nowrap">
                &rarr;{' '}
                {(() => {
                  const cfg = SUPPORTED_LANGUAGES.find((l) => l.code === language);
                  return cfg?.name || language;
                })()}{' '}
                unavailable &middot; showing English
              </span>
            )}
          </nav>
          <ThemeToggle
            className={cn(overHero && 'text-white/90 hover:bg-white/10 hover:text-white')}
          />
        </div>
      </div>
    </motion.header>
  );
}
