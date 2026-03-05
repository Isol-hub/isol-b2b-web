export interface LangOption {
  code: string
  label: string
  flag: string
}

export const LANGUAGES: LangOption[] = [
  { code: 'it', label: 'Italian',    flag: '🇮🇹' },
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'es', label: 'Spanish',    flag: '🇪🇸' },
  { code: 'fr', label: 'French',     flag: '🇫🇷' },
  { code: 'de', label: 'German',     flag: '🇩🇪' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'zh', label: 'Chinese',    flag: '🇨🇳' },
  { code: 'ja', label: 'Japanese',   flag: '🇯🇵' },
  { code: 'ko', label: 'Korean',     flag: '🇰🇷' },
  { code: 'ar', label: 'Arabic',     flag: '🇸🇦' },
  { code: 'ru', label: 'Russian',    flag: '🇷🇺' },
  { code: 'nl', label: 'Dutch',      flag: '🇳🇱' },
  { code: 'pl', label: 'Polish',     flag: '🇵🇱' },
  { code: 'tr', label: 'Turkish',    flag: '🇹🇷' },
]
