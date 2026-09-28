import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dict, Lang, STRINGS, isLang } from './strings';
import { readStoredLang, storeLang } from './storage';

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => Promise<void>;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

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
    storeLang(lang);
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
