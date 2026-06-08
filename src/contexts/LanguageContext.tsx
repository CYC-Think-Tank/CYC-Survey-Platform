'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import zh from '@/locales/zh.json';
import es from '@/locales/es.json';
import pa from '@/locales/pa.json';
import ar from '@/locales/ar.json';
import tl from '@/locales/tl.json';
import yue from '@/locales/yue.json';
import it from '@/locales/it.json';
import de from '@/locales/de.json';
import ta from '@/locales/ta.json';

export type Language = 'en' | 'fr' | 'zh' | 'es' | 'pa' | 'ar' | 'tl' | 'yue' | 'it' | 'de' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  enabledLanguages: string[] | null;
  setEnabledLanguages: (langs: string[] | null) => void;
}

const translations: Record<string, Record<string, string>> = {
  en,
  fr,
  zh,
  es,
  pa,
  ar,
  tl,
  yue,
  it,
  de,
  ta,
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
  enabledLanguages: null,
  setEnabledLanguages: () => {},
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [enabledLanguages, setEnabledLanguages] = useState<string[] | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cyc_language');
    if (saved) {
      setLanguage(saved as Language);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    if (lang === language) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setLanguage(lang);
      localStorage.setItem('cyc_language', lang);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 200);
  };

  const t = (key: string) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: handleSetLanguage, t, enabledLanguages, setEnabledLanguages }}
    >
      <div
        className={`flex-1 flex flex-col w-full transition-opacity duration-300 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
