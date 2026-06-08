'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_LANGUAGE, getLanguageConfig } from '@/config/languages';

export type Language = string;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isLoading: boolean;
  isRtl: boolean;
  enabledLanguages: string[] | null;
  setEnabledLanguages: (langs: string[] | null) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key: string) => key,
  isLoading: false,
  isRtl: false,
  enabledLanguages: null,
  setEnabledLanguages: () => {},
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [enabledLanguages, setEnabledLanguages] = useState<string[] | null>(null);

  // Load translations for the current language
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const mod = await import(`@/locales/${language}.json`);
        setTranslations(mod.default || mod);
      } catch {
        // Fallback to English if translation file missing
        const mod = await import(`@/locales/${DEFAULT_LANGUAGE}.json`);
        setTranslations(mod.default || mod);
      }
      setIsLoading(false);
    };
    loadTranslations();
  }, [language]);

  // Initialize language from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cyc_language');
    if (saved) {
      setLanguageState(saved);
      const config = getLanguageConfig(saved);
      document.documentElement.dir = config?.isRtl ? 'rtl' : 'ltr';
    }
  }, []);

  const setLanguage = useCallback(
    (lang: Language) => {
      if (lang === language) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setLanguageState(lang);
        localStorage.setItem('cyc_language', lang);
        // Update document dir for RTL support
        const config = getLanguageConfig(lang);
        document.documentElement.dir = config?.isRtl ? 'rtl' : 'ltr';
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 200);
    },
    [language]
  );

  const t = useCallback(
    (key: string) => {
      return translations[key] || key;
    },
    [translations]
  );

  const config = getLanguageConfig(language);
  const isRtl = config?.isRtl || false;

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, isLoading, isRtl, enabledLanguages, setEnabledLanguages }}
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
