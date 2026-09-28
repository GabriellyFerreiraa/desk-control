import type { Json } from '@/integrations/supabase/types';
import { DEFAULT_LANG, LANGS, Lang } from '@/i18n/strings';

// Course content is stored per language as { en, es, pt }; any of them
// may be missing.
export type Localized = Partial<Record<Lang, string>>;

export const asLocalized = (value: Json | undefined | null): Localized => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Localized = {};
  for (const lang of LANGS) {
    const text = (value as Record<string, Json | undefined>)[lang];
    if (typeof text === 'string') result[lang] = text;
  }
  return result;
};

// The viewer's language, else English, else whatever exists.
export const pickLocalized = (value: Localized, lang: Lang): string => {
  const own = value[lang]?.trim();
  if (own) return own;
  const fallback = value[DEFAULT_LANG]?.trim();
  if (fallback) return fallback;
  for (const other of LANGS) {
    const text = value[other]?.trim();
    if (text) return text;
  }
  return '';
};

// Trimmed copy without empty languages, ready to store.
export const cleanLocalized = (value: Localized): Localized => {
  const result: Localized = {};
  for (const lang of LANGS) {
    const text = value[lang]?.trim();
    if (text) result[lang] = text;
  }
  return result;
};

export const hasText = (value: Localized): boolean => LANGS.some((lang) => !!value[lang]?.trim());

export const missingLangs = (value: Localized): Lang[] => LANGS.filter((lang) => !value[lang]?.trim());

export const sameLocalized = (a: Localized, b: Localized): boolean =>
  LANGS.every((lang) => (a[lang]?.trim() ?? '') === (b[lang]?.trim() ?? ''));
