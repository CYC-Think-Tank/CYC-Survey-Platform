export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  isRtl: boolean;
  geminiPromptName: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    isRtl: false,
    geminiPromptName: 'English',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    isRtl: false,
    geminiPromptName: 'French',
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    isRtl: false,
    geminiPromptName: 'Chinese',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    isRtl: false,
    geminiPromptName: 'Spanish',
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    isRtl: false,
    geminiPromptName: 'Punjabi',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    isRtl: true,
    geminiPromptName: 'Arabic',
  },
  {
    code: 'tl',
    name: 'Tagalog',
    nativeName: 'Tagalog',
    isRtl: false,
    geminiPromptName: 'Tagalog',
  },
  {
    code: 'yue',
    name: 'Cantonese',
    nativeName: '粵語',
    isRtl: false,
    geminiPromptName: 'Cantonese',
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    isRtl: false,
    geminiPromptName: 'Italian',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    isRtl: false,
    geminiPromptName: 'German',
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    isRtl: false,
    geminiPromptName: 'Tamil',
  },
];

export const DEFAULT_LANGUAGE = 'en';

export const getLanguageConfig = (code: string): LanguageConfig | undefined =>
  SUPPORTED_LANGUAGES.find((l) => l.code === code);
