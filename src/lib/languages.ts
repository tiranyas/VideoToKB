export const OUTPUT_LANGUAGES = [
  { value: 'auto', label: 'Auto-detect (match transcript)' },
  { value: 'English', label: 'English' },
  { value: 'Hebrew', label: 'Hebrew (עברית)' },
  { value: 'Spanish', label: 'Spanish (Español)' },
  { value: 'French', label: 'French (Français)' },
  { value: 'German', label: 'German (Deutsch)' },
  { value: 'Portuguese', label: 'Portuguese (Português)' },
  { value: 'Arabic', label: 'Arabic (العربية)' },
  { value: 'Chinese', label: 'Chinese (中文)' },
  { value: 'Japanese', label: 'Japanese (日本語)' },
  { value: 'Korean', label: 'Korean (한국어)' },
  { value: 'Russian', label: 'Russian (Русский)' },
  { value: 'Italian', label: 'Italian (Italiano)' },
  { value: 'Dutch', label: 'Dutch (Nederlands)' },
  { value: 'Turkish', label: 'Turkish (Türkçe)' },
] as const;

export type OutputLanguage = (typeof OUTPUT_LANGUAGES)[number]['value'];
