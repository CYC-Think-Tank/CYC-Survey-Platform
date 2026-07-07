'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { InstagramLogo } from '@phosphor-icons/react';

export function Footer() {
  const pathname = usePathname();
  const { t } = useLanguage();

  if (pathname.startsWith('/admin') || pathname.startsWith('/student')) return null;

  return (
    <footer className="w-full border-t border-border bg-card">
      <div className="w-full max-w-6xl mx-auto px-5 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          <div className="md:col-span-5 flex flex-col items-start">
            <Link
              href="https://www.thecyc.org/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit The Canadian Youth Champions website"
              className="inline-block mb-4"
            >
              <Image
                src="/logo.png"
                alt="The Canadian Youth Champions"
                width={200}
                height={56}
                className="h-9 w-auto object-contain dark:brightness-110"
              />
            </Link>
            <p className="text-sm text-ink-soft leading-relaxed max-w-sm">
              {t('The Canadian Youth Champions (thecyc.org)')}{' '}
              {t('is a registered Canadian non-profit #1260703-4.')}
            </p>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-4">
              {t('Follow Us!')}
            </h4>
            <a
              href="https://www.instagram.com/thinktank.cyc/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow The Canadian Youth Champions on Instagram"
              className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-teal transition-colors"
            >
              <InstagramLogo weight="duotone" className="w-5 h-5" />
              @thinktank.cyc
            </a>
          </div>

          <div className="md:col-span-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-4">
              {t('Stay In Touch')}
            </h4>
            <p className="text-sm text-ink-soft leading-relaxed">
              {t('For CYC program updates, please sign-up for our mailing list:')}{' '}
              <a
                href="https://www.thecyc.org/stay-in-touch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal font-semibold hover:text-teal-deep transition-colors"
              >
                {t('sign-up for our mailing list')}
              </a>
              .
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-ink-soft">{t('Copyright © 2021. All rights reserved.')}</p>
        </div>
      </div>
    </footer>
  );
}
