export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  isRtl: boolean;
  geminiPromptName: string;
  translateTarget: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    isRtl: false,
    geminiPromptName: 'English',
    translateTarget: false,
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    isRtl: false,
    geminiPromptName: 'French',
    translateTarget: false,
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    isRtl: false,
    geminiPromptName: 'Chinese',
    translateTarget: false,
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    isRtl: false,
    geminiPromptName: 'Spanish',
    translateTarget: true,
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    isRtl: false,
    geminiPromptName: 'Punjabi',
    translateTarget: true,
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    isRtl: true,
    geminiPromptName: 'Arabic',
    translateTarget: true,
  },
  {
    code: 'tl',
    name: 'Tagalog',
    nativeName: 'Tagalog',
    isRtl: false,
    geminiPromptName: 'Tagalog',
    translateTarget: true,
  },
  {
    code: 'yue',
    name: 'Cantonese',
    nativeName: '粵語',
    isRtl: false,
    geminiPromptName: 'Cantonese',
    translateTarget: true,
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    isRtl: false,
    geminiPromptName: 'Italian',
    translateTarget: true,
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    isRtl: false,
    geminiPromptName: 'German',
    translateTarget: true,
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    isRtl: false,
    geminiPromptName: 'Tamil',
    translateTarget: true,
  },
];

export const DEFAULT_LANGUAGE = 'en';

export const getLanguageConfig = (code: string): LanguageConfig | undefined =>
  SUPPORTED_LANGUAGES.find((l) => l.code === code);

export const TRANSLATE_TARGET_LANGUAGES = SUPPORTED_LANGUAGES.filter((l) => l.translateTarget);
