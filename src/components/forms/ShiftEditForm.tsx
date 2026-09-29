import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { useT } from '@/i18n/lang';
// Built per language so the validation message follows the selected language.
const makeShiftSchema = (required: string) => z.object({
  start_time: z.string().min(1, required),
  end_time: z.string().min(1, required),
  lunch_start: z.string().min(1, required),
  lunch_end: z.string().min(1, required),
  break1_start: z.string().min(1, required),
  break1_end: z.string().min(1, required),
  break2_start: z.string().min(1, required),
  break2_end: z.string().min(1, required),
  work_days: z.object({
    mon: z.object({
      active: z.boolean(),
      mode: z.enum(['home', 'office'])
    }),
    tue: z.object({
      active: z.boolean(),
      mode: z.enum(['home', 'office'])
    }),
    wed: z.object({
      active: z.boolean(),
      mode: z.enum(['home', 'office'])
    }),
    thu: z.object({
      active: z.boolean(),
      mode: z.enum(['home', 'office'])
    }),
    fri: z.object({
      active: z.boolean(),
      mode: z.enum(['home', 'office'])
    }),
    sat: z.object({
      active: z.boolean(),
      mode: z.enum(['home', 'office'])
    }),
    sun: z.object({
      active: z.boolean(),
      mode: z.enum(['home', 'office'])
    })
  })
});
type ShiftFormData = z.infer<ReturnType<typeof makeShiftSchema>>;
interface ShiftEditFormProps {
  analyst: any;
  onClose: () => void;
  onSuccess: () => void;
}
export const ShiftEditForm = ({
  analyst,
  onClose,
  onSuccess
}: ShiftEditFormProps) => {
  const [loading, setLoading] = useState(false);
  const t = useT();
  const ts = t.shiftForm;
  const shiftFormSchema = useMemo(() => makeShiftSchema(ts.required), [ts]);
  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      // Stored as HH:MM:SS; the time inputs work in HH:MM.
      start_time: (analyst.start_time || '09:00').slice(0, 5),
      end_time: (analyst.end_time || '18:00').slice(0, 5),
      lunch_start: (analyst.lunch_start || '12:00').slice(0, 5),
      lunch_end: (analyst.lunch_end || '13:00').slice(0, 5),
      break1_start: (analyst.break1_start || '10:00').slice(0, 5),
      break1_end: (analyst.break1_end || '10:15').slice(0, 5),
      break2_start: (analyst.break2_start || '15:00').slice(0, 5),
      break2_end: (analyst.break2_end || '15:15').slice(0, 5),
      work_days: analyst.work_days || {
        mon: {
          active: true,
          mode: 'office'
        },
        tue: {
          active: true,
          mode: 'office'
        },
        wed: {
          active: true,
          mode: 'office'
        },
        thu: {
          active: true,
          mode: 'office'
        },
        fri: {
          active: true,
          mode: 'office'
        },
        sat: {
          active: false,
          mode: 'office'
        },
        sun: {
          active: false,
          mode: 'office'
        }
      }
    }
  });
  const onSubmit = async (data: ShiftFormData) => {
    setLoading(true);
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        start_time: data.start_time,
        end_time: data.end_time,
        lunch_start: data.lunch_start,
        lunch_end: data.lunch_end,
        break1_start: data.break1_start,
        break1_end: data.break1_end,
        break2_start: data.break2_start,
        break2_end: data.break2_end,
        work_days: data.work_days
      }).eq('user_id', analyst.user_id);
      if (error) throw error;
      toast({
        title: ts.saved,
        description: ts.savedBody
      });
      onSuccess();
    } catch (error) {
      console.error('Error updating shift:', error);
      toast({
        title: t.common.error,
        description: ts.saveFailed,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const days = (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((key) => ({ key, label: ts.days[key] }));
  // One row per time range: label, start, end.
  const ranges = [
    { label: ts.workHours, start: 'start_time', end: 'end_time' },
    { label: ts.lunchBreak, start: 'lunch_start', end: 'lunch_end' },
    { label: t.team.break1, start: 'break1_start', end: 'break1_end' },
    { label: t.team.break2, start: 'break2_start', end: 'break2_end' },
  ] as const;
  return <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{ts.title(analyst.name)}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {/* Time ranges */}
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)_minmax(0,7rem)] items-center gap-x-3 gap-y-2">
                <span />
                <span className="text-xs font-medium text-muted-foreground">{ts.from}</span>
                <span className="text-xs font-medium text-muted-foreground">{ts.to}</span>
                {ranges.map((range) => <div key={range.start} className="contents">
                    <span className="text-sm font-medium">{range.label}</span>
                    {[range.start, range.end].map((name) => <FormField key={name} control={form.control} name={name} render={({ field }) => <FormItem className="space-y-1">
                            <FormLabel className="sr-only">{`${range.label} ${name === range.start ? ts.from : ts.to}`}</FormLabel>
                            <FormControl>
                              <Input type="time" className="min-w-0 px-2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />)}
                  </div>)}
              </div>

              {/* Work days */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{ts.workSchedule}</h3>
                <ul className="divide-y rounded-md border">
                  {days.map(day => <li key={day.key} className="flex items-center justify-between gap-3 px-3 py-2">
                      <FormField control={form.control} name={`work_days.${day.key}.active` as const} render={({ field }) => <FormItem className="flex min-w-0 flex-1 items-center gap-3 space-y-0">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={day.label} />
                            </FormControl>
                            <FormLabel className="truncate text-sm font-normal">{day.label}</FormLabel>
                          </FormItem>} />

                      <FormField control={form.control} name={`work_days.${day.key}.mode` as const} render={({ field }) => <FormItem className="shrink-0 space-y-0">
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange} disabled={!form.watch(`work_days.${day.key}.active` as const)}>
                                <SelectTrigger className="h-9 w-32" aria-label={`${day.label}: ${t.team.mode}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="office">{t.workMode.office}</SelectItem>
                                  <SelectItem value="home">{t.workMode.home}</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>} />
                    </li>)}
                </ul>
              </div>
            </div>

            {/* Actions stay visible while the content scrolls */}
            <div className="flex justify-end gap-2 border-t bg-card px-6 py-3">
              <Button type="button" variant="outline" onClick={onClose}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t.common.saving : ts.saveChanges}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>;
};
