"use client";
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="5" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Footer() {
  const pathname = usePathname();
  const { t } = useLanguage();

  if (pathname.startsWith('/admin')) return null;

  return (
    <motion.footer
      className="flex-shrink-0 bg-white border-t border-slate-200"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full max-w-7xl mx-auto px-6 py-12 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1.2fr] gap-10 md:gap-12">
          <div className="flex flex-col">
            <Link
              href="https://www.thecyc.org/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit The Canadian Youth Champions website"
              className="inline-block mb-3"
            >
              <Image
                src="/logo.png"
                alt="The Canadian Youth Champions"
                width={220}
                height={62}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
              {t('The Canadian Youth Champions (thecyc.org)')} {t('is a registered Canadian non-profit #1260703-4.')}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              {t('Follow Us!')}
            </h4>
            <a
              href="https://www.instagram.com/thecyc_"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow The Canadian Youth Champions on Instagram"
              className="inline-flex items-center gap-2.5 text-sm font-semibold text-[#04377E] px-4 py-2.5 rounded-lg border-2 border-[#04377E] hover:bg-[#04377E] hover:text-white transition-colors duration-200"
            >
              <InstagramIcon className="w-4.5 h-4.5" />
              @thecyc_
            </a>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              {t('Stay In Touch')}
            </h4>
            <p className="text-sm text-slate-500 leading-relaxed">
              {t('For CYC program updates, please sign-up for our mailing list:')}{' '}
              <a
                href="https://www.thecyc.org/stay-in-touch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F5C518] font-semibold hover:underline transition-all duration-200"
              >
                {t('sign-up for our mailing list')}
              </a>
              .
            </p>
          </div>
        </div>

        <div className="mt-10 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            {t('Copyright © 2021. All rights reserved.')}
          </p>
        </div>
      </div>
    </motion.footer>
  );
}
