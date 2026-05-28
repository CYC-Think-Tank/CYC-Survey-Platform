"use client";
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    if (pathname === '/') {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setShow(true);
    }
  }, [pathname]);

  return (
    <header className={`flex-shrink-0 z-50 bg-white h-16 sm:h-20 border-b border-gray-200/50 transition-opacity duration-[1200ms] ease-in-out ${pathname === '/' && !show ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
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
            {language !== 'en' && (
              <button
                onClick={() => setLanguage('en')}
                className="text-gray-700 hover:text-[var(--color-cyc-secondary)] text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors"
              >
                English
              </button>
            )}
            {language !== 'fr' && (
              <button
                onClick={() => setLanguage('fr')}
                className="text-gray-700 hover:text-[var(--color-cyc-secondary)] text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors"
              >
                Français
              </button>
            )}
            {language !== 'zh' && (
              <button
                onClick={() => setLanguage('zh')}
                className="text-gray-700 hover:text-[var(--color-cyc-secondary)] text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors"
              >
                中文
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
