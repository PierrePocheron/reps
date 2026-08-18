import { useSettingsStore, type LanguageSetting } from '@/store/settingsStore';

/** Langues effectivement supportées pour les contenus d'exercices */
export type Language = 'fr' | 'en';

/** Langue de l'appareil (navigateur / WebView Capacitor) : fr → fr, sinon en */
export function detectDeviceLanguage(): Language {
  if (typeof navigator === 'undefined') return 'fr';
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  const first = (langs[0] ?? '').toLowerCase();
  return first.startsWith('fr') ? 'fr' : 'en';
}

/** Résout le réglage utilisateur en langue effective */
export function resolveLanguage(setting: LanguageSetting): Language {
  return setting === 'auto' ? detectDeviceLanguage() : setting;
}

/**
 * Langue effective des contenus d'exercices (noms, instructions, muscles,
 * équipements) : réglage explicite ou langue de l'appareil.
 */
export function useLanguage(): Language {
  const setting = useSettingsStore((s) => s.language);
  return resolveLanguage(setting);
}
