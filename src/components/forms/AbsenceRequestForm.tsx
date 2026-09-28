import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useT } from '@/i18n/lang';

// Stored as-is in absence_requests.reason ("<reason> - <details>"), so the
// values stay in English; only the labels are translated.
const absenceReasons = ['Service Desk Day', 'Examen Leave', 'Recognition (ScoreCard)', 'Vacation Leave', 'Moving Leave', 'Sick Leave', 'Marriage Leave', 'Unpaid Leave'] as const;

interface AbsenceRequestFormProps {
  onClose: () => void;
  onSuccess: () => void;
}
export const AbsenceRequestForm = ({
  onClose,
  onSuccess
}: AbsenceRequestFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const {
    user
  } = useAuth();
  const t = useT();
  const tf = t.absenceForm;
  const schema = useMemo(() => z.object({
    startDate: z.string().min(1, tf.errors.startRequired),
    endDate: z.string().min(1, tf.errors.endRequired),
    reason: z.enum(absenceReasons, { message: tf.errors.reasonRequired }),
    details: z.string().min(10, tf.errors.detailsMin)
  }).refine(data => data.endDate >= data.startDate, {
    message: tf.errors.endBeforeStart,
    path: ["endDate"]
  }), [tf]);
  type FormData = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    control,
    formState: {
      errors
    }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: '',
      endDate: '',
      details: ''
    }
  });
  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const {
        error
      } = await supabase.from('absence_requests').insert({
        analyst_id: user.id,
        start_date: data.startDate,
        end_date: data.endDate,
        reason: `${data.reason} - ${data.details}`,
        status: 'pending'
      });
      if (error) throw error;
      toast({
        title: tf.submitted,
        description: tf.submittedBody
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating absence request:', error);
      toast({
        title: t.common.error,
        description: tf.submitFailed,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[hsl(var(--panel))]">
        <DialogHeader>
          <DialogTitle>{tf.title}</DialogTitle>
          <DialogDescription>
            {tf.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{tf.startDate}</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">{tf.endDate}</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
              {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">{tf.reason}</Label>
            <Controller name="reason" control={control} render={({
            field
          }) => <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="reason">
                    <SelectValue placeholder={tf.reasonPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {absenceReasons.map(reason => <SelectItem key={reason} value={reason}>
                        {tf.reasons[reason] ?? reason}
                      </SelectItem>)}
                  </SelectContent>
                </Select>} />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">{tf.details}</Label>
            <Textarea id="details" placeholder={tf.detailsPlaceholder} {...register("details")} />
            {errors.details && <p className="text-sm text-destructive">{errors.details.message}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? tf.submitting : tf.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>;
};
