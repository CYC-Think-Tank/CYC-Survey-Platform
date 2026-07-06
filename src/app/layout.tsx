import type { Metadata } from 'next';
import { Inter, Newsreader } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/HeaderFooter';
import { Footer } from '@/components/layout/Footer';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/components/theme-provider';

import { Suspense } from 'react';
import { GlobalTracker } from '@/components/GlobalTracker';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['italic'],
  weight: ['400', '500', '600'],
  variable: '--font-newsreader',
});

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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${newsreader.variable}`}>
      <head></head>
      <body className="w-full flex flex-col overflow-x-hidden bg-cream text-ink transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <Suspense fallback={null}>
              <GlobalTracker />
            </Suspense>
            <Header />
            <main className="flex-1 w-full relative">{children}</main>
            <Footer />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
