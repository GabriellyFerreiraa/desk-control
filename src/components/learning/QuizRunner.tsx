import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLang, useT } from '@/i18n/lang';
import { pickLocalized } from '@/lib/localized';
import { QuizPayload, QuizResult, fetchQuiz, submitQuiz } from './learningData';

type Phase = 'idle' | 'loading' | 'answering' | 'submitting' | 'result';

interface QuizRunnerProps {
  moduleId: string;
  passScore: number;
  locked: boolean;
  hasNextModule: boolean;
  onFinished: (result: QuizResult) => void;
  onNextModule: () => void;
}

export const QuizRunner = ({ moduleId, passScore, locked, hasNextModule, onFinished, onNextModule }: QuizRunnerProps) => {
  const t = useT();
  const { lang } = useLang();
  const tl = t.learning;
  const [phase, setPhase] = useState<Phase>('idle');
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const start = async () => {
    setPhase('loading');
    try {
      // A fresh fetch on every attempt reshuffles questions and options.
      setQuiz(await fetchQuiz(moduleId));
      setAnswers({});
      setResult(null);
      setPhase('answering');
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast({ title: tl.quizFailed, variant: 'destructive' });
      setPhase('idle');
    }
  };

  const submit = async () => {
    if (!quiz) return;
    if (quiz.questions.some((q) => !(answers[q.id]?.length))) {
      toast({ title: tl.answerAll, variant: 'destructive' });
      return;
    }
    setPhase('submitting');
    try {
      const outcome = await submitQuiz(moduleId, answers);
      setResult(outcome);
      setPhase('result');
      onFinished(outcome);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({ title: tl.submitFailed, variant: 'destructive' });
      setPhase('answering');
    }
  };

  const toggleMultiple = (questionId: string, optionId: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      return { ...prev, [questionId]: checked ? [...current, optionId] : current.filter((id) => id !== optionId) };
    });
  };

  if (phase === 'idle' || phase === 'loading') {
    return <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{locked ? tl.quizLocked : tl.passScore(passScore)}</p>
        <Button onClick={start} disabled={locked || phase === 'loading'}>
          {phase === 'loading' ? t.common.loading : tl.startQuiz}
        </Button>
      </div>;
  }

  if (phase === 'result' && result) {
    const Icon = result.passed ? CheckCircle2 : XCircle;
    return <div className={`rounded-md border p-4 space-y-3 ${result.passed ? 'border-status-success/40 bg-status-success/5' : 'border-status-danger/40 bg-status-danger/5'}`} role="status">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${result.passed ? 'text-status-success-fg' : 'text-status-danger-fg'}`} />
          <p className="font-semibold">{result.passed ? tl.resultPassed : tl.resultFailed}</p>
        </div>
        <p className="text-sm">{tl.yourScore(result.score)}</p>
        {!result.passed && <p className="text-sm text-muted-foreground">{tl.needed(result.passScore)}</p>}
        {result.passed
          ? hasNextModule && <Button onClick={onNextModule}>{tl.nextModule}</Button>
          : <Button onClick={start}>{tl.retry}</Button>}
      </div>;
  }

  const questions = quiz?.questions ?? [];
  const submitting = phase === 'submitting';

  return <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{tl.passScore(passScore)}</p>
      <ol className="space-y-4">
        {questions.map((question, index) => {
          const selected = answers[question.id] ?? [];
          const isMultiple = question.type === 'multiple';
          return <li key={question.id} className="rounded-md border p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">{tl.questionOf(index + 1, questions.length)}</p>
                <p className="font-medium mt-1">{pickLocalized(question.prompt, lang)}</p>
                <p className="text-xs text-muted-foreground mt-1">{isMultiple ? tl.selectAll : tl.selectOne}</p>
              </div>
              {isMultiple ? (
                <div className="space-y-2">
                  {question.options.map((option) => {
                    const id = `${question.id}-${option.id}`;
                    return <div key={option.id} className="flex items-center gap-2">
                        <Checkbox
                          id={id}
                          checked={selected.includes(option.id)}
                          onCheckedChange={(checked) => toggleMultiple(question.id, option.id, checked === true)}
                          disabled={submitting}
                        />
                        <Label htmlFor={id} className="font-normal cursor-pointer">{pickLocalized(option.label, lang)}</Label>
                      </div>;
                  })}
                </div>
              ) : (
                <RadioGroup
                  value={selected[0] ?? ''}
                  onValueChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: [value] }))}
                  disabled={submitting}
                  className="space-y-1"
                >
                  {question.options.map((option) => {
                    const id = `${question.id}-${option.id}`;
                    return <div key={option.id} className="flex items-center gap-2">
                        <RadioGroupItem id={id} value={option.id} />
                        <Label htmlFor={id} className="font-normal cursor-pointer">{pickLocalized(option.label, lang)}</Label>
                      </div>;
                  })}
                </RadioGroup>
              )}
            </li>;
        })}
      </ol>
      <Button onClick={submit} disabled={submitting}>{submitting ? tl.submitting : tl.submit}</Button>
    </div>;
};
