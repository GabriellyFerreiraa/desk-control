import { DEFAULT_LANG, Lang, isLang } from './strings';

export const LANG_STORAGE_KEY = 'deskcontrol-lang';

// LangProvider keeps this in sync with the active language, so code that
// runs outside React context (like the auth provider's toasts) can read it.
export const readStoredLang = (): Lang => {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(stored) ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
};

export const storeLang = (lang: Lang) => {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Storage can be unavailable (private mode); the in-memory value still works.
  }
};
