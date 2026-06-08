'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/config/languages';

export function Header() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
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
      className={`flex-shrink-0 z-50 bg-white h-16 sm:h-20 border-b border-gray-200/50 transition-opacity duration-[1200ms] ease-in-out ${pathname === '/' && !show ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
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
          <nav className="flex items-center space-x-2 sm:space-x-6 relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="text-gray-700 bg-white border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-cyc-primary)] cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option
                  key={lang.code}
                  value={lang.code}
                  disabled={
                    enabledLanguages != null &&
                    enabledLanguages.length > 0 &&
                    !enabledLanguages.includes(lang.code)
                  }
                >
                  {lang.name}
                </option>
              ))}
            </select>
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
