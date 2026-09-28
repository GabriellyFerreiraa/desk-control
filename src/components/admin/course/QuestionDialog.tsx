import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLang, useT } from '@/i18n/lang';
import { Localized, cleanLocalized, hasText, pickLocalized } from '@/lib/localized';
import { LocalizedFields } from './LocalizedFields';
import type { QuestionNode, QuestionType } from './courseTree';

interface DraftOption {
  key: string;
  label: Localized;
  is_correct: boolean;
}

// True/false options are fixed and translated up front.
const TRUE_LABEL: Localized = { en: 'True', es: 'Verdadero', pt: 'Verdadeiro' };
const FALSE_LABEL: Localized = { en: 'False', es: 'Falso', pt: 'Falso' };
const MAX_OPTIONS = 8;
const QUESTION_TYPES: QuestionType[] = ['single', 'multiple', 'true_false'];

const newKey = () => crypto.randomUUID();
const emptyOption = (): DraftOption => ({ key: newKey(), label: {}, is_correct: false });
const trueFalseOptions = (): DraftOption[] => [
  { key: newKey(), label: TRUE_LABEL, is_correct: true },
  { key: newKey(), label: FALSE_LABEL, is_correct: false },
];

interface QuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  question: QuestionNode | null;
  onSaved: () => void;
}

export const QuestionDialog = ({ open, onOpenChange, moduleId, question, onSaved }: QuestionDialogProps) => {
  const t = useT();
  const { lang } = useLang();
  const tc = t.admin.courses;
  const [type, setType] = useState<QuestionType>('single');
  const [prompt, setPrompt] = useState<Localized>({});
  const [options, setOptions] = useState<DraftOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(question?.type ?? 'single');
    setPrompt(question?.prompt ?? {});
    setOptions(question
      ? question.options.map((o) => ({ key: o.id, label: o.label, is_correct: o.is_correct }))
      : [emptyOption(), emptyOption()]);
  }, [open, question]);

  const changeType = (next: QuestionType) => {
    if (next === type) return;
    if (next === 'true_false') {
      setOptions(trueFalseOptions());
    } else if (type === 'true_false') {
      setOptions([emptyOption(), emptyOption()]);
    } else if (next === 'single') {
      // Keep the texts; only the first correct mark survives.
      const firstCorrect = options.find((o) => o.is_correct)?.key;
      setOptions(options.map((o) => ({ ...o, is_correct: o.key === firstCorrect })));
    }
    setType(next);
  };

  const toggleCorrect = (key: string, checked: boolean) => {
    setOptions((prev) => prev.map((o) => {
      if (type === 'multiple') return o.key === key ? { ...o, is_correct: checked } : o;
      return { ...o, is_correct: o.key === key };
    }));
  };

  const validate = (): string | null => {
    if (!hasText(prompt)) return tc.questionErrors.prompt;
    if (options.length < 2) return tc.questionErrors.minOptions;
    if (options.some((o) => !hasText(o.label))) return tc.questionErrors.optionLabel;
    const correct = options.filter((o) => o.is_correct).length;
    if (type === 'multiple' && correct < 1) return tc.questionErrors.someCorrect;
    if (type !== 'multiple' && correct !== 1) return tc.questionErrors.oneCorrect;
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) {
      toast({ title: problem, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_save_question', {
        _module_id: moduleId,
        _question_id: question?.id ?? null,
        _type: type,
        _prompt: cleanLocalized(prompt) as Json,
        _options: options.map((o) => ({ label: cleanLocalized(o.label), is_correct: o.is_correct })) as Json,
      });
      if (error) throw error;
      toast({ title: tc.saved });
      onOpenChange(false);
      onSaved();
    } catch (error) {
      console.error('Error saving question:', error);
      toast({ title: tc.saveFailed, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isTrueFalse = type === 'true_false';

  return <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[hsl(var(--panel))]">
        <DialogHeader>
          <DialogTitle>{question ? tc.questionDialogEdit : tc.questionDialogNew}</DialogTitle>
          <DialogDescription>{tc.langHint}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="question-type">{tc.questionTypeLabel}</Label>
            <Select value={type} onValueChange={(value) => changeType(value as QuestionType)} disabled={saving}>
              <SelectTrigger id="question-type" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((qt) => <SelectItem key={qt} value={qt}>{tc.questionType[qt]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <LocalizedFields id="question-prompt" label={tc.prompt} value={prompt} onChange={setPrompt} multiline disabled={saving} />

          <div className="space-y-3">
            <div>
              <Label>{tc.options}</Label>
              <p className="text-xs text-muted-foreground mt-1">{tc.correctHint[type]}</p>
            </div>

            {options.map((option, index) => {
              const correctId = `correct-${option.key}`;
              return <div key={option.key} className={`rounded-md border p-3 space-y-2 ${option.is_correct ? 'border-primary' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={correctId}
                        checked={option.is_correct}
                        onCheckedChange={(checked) => toggleCorrect(option.key, checked === true)}
                        disabled={saving}
                        className={type === 'multiple' ? '' : 'rounded-full'}
                      />
                      <Label htmlFor={correctId} className="font-normal cursor-pointer">
                        {isTrueFalse ? pickLocalized(option.label, lang) : tc.optionN(index + 1)}
                        {option.is_correct && <span className="ml-2 text-xs font-semibold text-primary">{tc.correct}</span>}
                      </Label>
                    </div>
                    {!isTrueFalse && options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOptions((prev) => prev.filter((o) => o.key !== option.key))}
                        disabled={saving}
                        aria-label={`${tc.removeOption} ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {!isTrueFalse && (
                    <LocalizedFields
                      id={`option-${option.key}`}
                      value={option.label}
                      onChange={(label) => setOptions((prev) => prev.map((o) => (o.key === option.key ? { ...o, label } : o)))}
                      disabled={saving}
                    />
                  )}
                </div>;
            })}

            {!isTrueFalse && options.length < MAX_OPTIONS && (
              <Button variant="outline" size="sm" onClick={() => setOptions((prev) => [...prev, emptyOption()])} disabled={saving}>
                <Plus className="h-4 w-4 mr-2" />
                {tc.addOption}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t.common.cancel}</Button>
          <Button onClick={save} disabled={saving}>{saving ? t.common.saving : t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
};
