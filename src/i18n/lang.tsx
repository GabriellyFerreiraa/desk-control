import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_LANG, Dict, Lang, STRINGS, isLang } from './strings';

const STORAGE_KEY = 'deskcontrol-lang';

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => Promise<void>;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

const readStoredLang = (): Lang => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLang(stored) ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
};

// The saved profile language wins once the user is signed in, so the
// choice follows them across devices. localStorage covers the moments
// before the profile loads and signed-out pages.
export const LangProvider = ({ children }: { children: ReactNode }) => {
  const { user, userProfile } = useAuth();
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    if (isLang(userProfile?.language)) {
      setLangState(userProfile.language);
    }
  }, [userProfile?.language]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage can be unavailable (private mode); the in-memory value still works.
    }
  }, [lang]);

  const setLang = useCallback(async (next: Lang) => {
    setLangState(next);
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ language: next }).eq('user_id', user.id);
    if (error) throw error;
  }, [user]);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
};

export const useLang = () => {
  const context = useContext(LangContext);
  if (context === undefined) {
    throw new Error('useLang must be used within a LangProvider');
  }
  return context;
};

export const useT = (): Dict => STRINGS[useLang().lang];
