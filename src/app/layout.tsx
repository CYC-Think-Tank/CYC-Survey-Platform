import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/HeaderFooter';
import { Footer } from '@/components/layout/Footer';
import { LanguageProvider } from '@/contexts/LanguageContext';

import { Suspense } from 'react';
import { GlobalTracker } from '@/components/GlobalTracker';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CYC Think Tank',
  description: 'Share your voice. Empower Canadian youth.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ fontSize: '85%' }}>
      <head></head>
      <body
        className={`${inter.className} w-full flex flex-col overflow-x-hidden bg-slate-50 text-slate-800 transition-colors duration-300`}
      >
        <LanguageProvider>
          <Suspense fallback={null}>
            <GlobalTracker />
          </Suspense>
          <Header />
          <main className="min-h-screen w-full max-w-7xl mx-auto flex flex-col relative pb-10">
            {children}
          </main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
