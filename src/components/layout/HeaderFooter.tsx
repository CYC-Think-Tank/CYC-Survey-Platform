'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';

import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/config/languages';

export function Header() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const { language, setLanguage, enabledLanguages } = useLanguage();

  useEffect(() => {
    if (pathname === '/') {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setShow(true);
    }
  }, [pathname]);

  const languageUnavailable =
    enabledLanguages && enabledLanguages.length > 0 && !enabledLanguages.includes(language);

  return (
    <header
      className={`relative flex-shrink-0 z-[100] bg-white h-16 sm:h-20 border-b border-gray-200/50 transition-opacity duration-[1200ms] ease-in-out ${pathname === '/' && !show ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
    >
      <div className="h-1 w-full bg-[var(--color-cyc-primary)]" />
      <div className="w-full h-[calc(100%-0.375rem)] px-4 sm:px-8">
        <div className="flex justify-between items-center h-full">
          <Link href="/" className="flex items-center h-full py-1">
            <Image
              src="/logo.png"
              alt="CYC Logo"
              width={250}
              height={70}
              className="object-contain h-full w-auto max-w-[140px] sm:max-w-[200px] md:max-w-[250px] dark:brightness-110"
              priority
            />
          </Link>
          <nav className="flex items-center space-x-4 sm:space-x-6 relative">
            <Link
              href="/blog"
              className="text-gray-700 hover:text-[var(--color-cyc-primary)] text-sm sm:text-base font-semibold transition-colors"
            >
              Publications
            </Link>
            {!pathname.startsWith('/admin') && !pathname.startsWith('/student') && (
              <Link
                href="/student/login"
                className="text-gray-700 hover:text-[var(--color-cyc-primary)] text-sm sm:text-base font-semibold transition-colors"
              >
                Student Login
              </Link>
            )}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center space-x-1.5 text-gray-700 hover:text-[var(--color-cyc-primary)] dark:text-slate-300 dark:hover:text-white text-sm font-medium transition-colors bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-cyc-primary)]"
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
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50 overflow-hidden">
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
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-900 text-gray-400' : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200'} ${language === lang.code ? 'font-bold text-[var(--color-cyc-primary)] bg-[var(--color-cyc-primary)]/10' : ''}`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{lang.nativeName}</span>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 text-right">
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
        </div>
      </div>
    </header>
  );
}
