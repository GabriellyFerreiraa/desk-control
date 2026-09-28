import { parseISO, type Locale } from 'date-fns';
import { enUS, es, ptBR } from 'date-fns/locale';
import { useLang } from './lang';
import type { Lang } from './strings';

export const DATE_LOCALES: Record<Lang, Locale> = { en: enUS, es, pt: ptBR };

export const useDateLocale = (): Locale => DATE_LOCALES[useLang().lang];

// Date-only values ('2026-10-05') must be read as local dates: new Date()
// treats them as UTC midnight, which shows the previous day in the Americas.
export const parseDay = (value: string): Date => parseISO(value);
