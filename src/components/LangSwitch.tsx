import { Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLang } from '@/i18n/lang';
import { LANGS, LANG_LABELS, isLang } from '@/i18n/strings';

// Language picker for pages without a profile yet (landing, sign in).
// Signed-in users change it in Settings, where it is saved to their profile.
export const LangSwitch = ({ className = '' }: { className?: string }) => {
  const { lang, setLang } = useLang();
  return <Select value={lang} onValueChange={(value) => isLang(value) && setLang(value)}>
      <SelectTrigger className={`w-auto gap-2 bg-background/80 backdrop-blur ${className}`} aria-label={LANG_LABELS[lang]}>
        <Languages className="h-4 w-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {LANGS.map((code) => <SelectItem key={code} value={code}>{LANG_LABELS[code]}</SelectItem>)}
      </SelectContent>
    </Select>;
};
