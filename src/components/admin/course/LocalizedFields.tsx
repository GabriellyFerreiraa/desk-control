import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LANGS } from '@/i18n/strings';
import type { Localized } from '@/lib/localized';
import { useT } from '@/i18n/lang';

interface LocalizedFieldsProps {
  id: string;
  label?: string;
  value: Localized;
  onChange: (value: Localized) => void;
  multiline?: boolean;
  disabled?: boolean;
}

// One input per language, stacked, with the language code as a prefix.
export const LocalizedFields = ({ id, label, value, onChange, multiline, disabled }: LocalizedFieldsProps) => {
  const t = useT();
  return <div className="space-y-2">
      {label && <Label htmlFor={`${id}-en`}>{label}</Label>}
      <div className="space-y-1.5">
        {LANGS.map((lang) => {
          const fieldId = `${id}-${lang}`;
          const common = {
            id: fieldId,
            value: value[lang] ?? '',
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [lang]: e.target.value }),
            placeholder: t.admin.courses.missing,
            disabled,
            className: 'bg-[hsl(var(--field))]',
            'aria-label': label ? `${label} (${lang.toUpperCase()})` : lang.toUpperCase(),
          };
          return <div key={lang} className="flex items-start gap-2">
              <span className="mt-2.5 w-7 shrink-0 text-xs font-semibold text-muted-foreground">{lang.toUpperCase()}</span>
              {multiline ? <Textarea rows={2} {...common} /> : <Input {...common} />}
            </div>;
        })}
      </div>
    </div>;
};
