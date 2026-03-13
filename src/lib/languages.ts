export interface LangOption {
  code: string
  label: string
  flag: string
}

export const LANGUAGES: LangOption[] = [
  // Major world languages
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'it', label: 'Italian',    flag: '🇮🇹' },
  { code: 'es', label: 'Spanish',    flag: '🇪🇸' },
  { code: 'fr', label: 'French',     flag: '🇫🇷' },
  { code: 'de', label: 'German',     flag: '🇩🇪' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'zh', label: 'Chinese',    flag: '🇨🇳' },
  { code: 'ja', label: 'Japanese',   flag: '🇯🇵' },
  { code: 'ko', label: 'Korean',     flag: '🇰🇷' },
  { code: 'ar', label: 'Arabic',     flag: '🇸🇦' },
  { code: 'ru', label: 'Russian',    flag: '🇷🇺' },
  { code: 'hi', label: 'Hindi',      flag: '🇮🇳' },
  { code: 'nl', label: 'Dutch',      flag: '🇳🇱' },
  { code: 'pl', label: 'Polish',     flag: '🇵🇱' },
  { code: 'tr', label: 'Turkish',    flag: '🇹🇷' },
  { code: 'uk', label: 'Ukrainian',  flag: '🇺🇦' },
  // Scandinavian / Baltic
  { code: 'sv', label: 'Swedish',    flag: '🇸🇪' },
  { code: 'da', label: 'Danish',     flag: '🇩🇰' },
  { code: 'fi', label: 'Finnish',    flag: '🇫🇮' },
  { code: 'nb', label: 'Norwegian',  flag: '🇳🇴' },
  { code: 'et', label: 'Estonian',   flag: '🇪🇪' },
  { code: 'lv', label: 'Latvian',    flag: '🇱🇻' },
  { code: 'lt', label: 'Lithuanian', flag: '🇱🇹' },
  // Eastern Europe
  { code: 'el', label: 'Greek',      flag: '🇬🇷' },
  { code: 'cs', label: 'Czech',      flag: '🇨🇿' },
  { code: 'ro', label: 'Romanian',   flag: '🇷🇴' },
  { code: 'hu', label: 'Hungarian',  flag: '🇭🇺' },
  { code: 'sk', label: 'Slovak',     flag: '🇸🇰' },
  { code: 'bg', label: 'Bulgarian',  flag: '🇧🇬' },
  { code: 'hr', label: 'Croatian',   flag: '🇭🇷' },
  { code: 'sr', label: 'Serbian',    flag: '🇷🇸' },
  { code: 'sl', label: 'Slovenian',  flag: '🇸🇮' },
  { code: 'mk', label: 'Macedonian', flag: '🇲🇰' },
  { code: 'be', label: 'Belarusian', flag: '🇧🇾' },
  // Southeast Asia & Oceania
  { code: 'id', label: 'Indonesian', flag: '🇮🇩' },
  { code: 'ms', label: 'Malay',      flag: '🇲🇾' },
  { code: 'tl', label: 'Filipino',   flag: '🇵🇭' },
  { code: 'vi', label: 'Vietnamese', flag: '🇻🇳' },
  { code: 'th', label: 'Thai',       flag: '🇹🇭' },
  // South Asia
  { code: 'ta', label: 'Tamil',      flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali',    flag: '🇧🇩' },
  { code: 'ur', label: 'Urdu',       flag: '🇵🇰' },
  // Middle East & Central Asia
  { code: 'he', label: 'Hebrew',     flag: '🇮🇱' },
  { code: 'kk', label: 'Kazakh',     flag: '🇰🇿' },
  // Africa
  { code: 'sw', label: 'Swahili',    flag: '🇰🇪' },
  { code: 'am', label: 'Amharic',    flag: '🇪🇹' },
  // South Asia (other)
  { code: 'si', label: 'Sinhala',    flag: '🇱🇰' },
]
