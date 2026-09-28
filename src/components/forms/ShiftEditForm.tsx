import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      start_time: analyst.start_time || '09:00',
      end_time: analyst.end_time || '18:00',
      lunch_start: analyst.lunch_start || '12:00',
      lunch_end: analyst.lunch_end || '13:00',
      break1_start: analyst.break1_start || '10:00',
      break1_end: analyst.break1_end || '10:15',
      break2_start: analyst.break2_start || '15:00',
      break2_end: analyst.break2_end || '15:15',
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
  return <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[hsl(var(--panel))]">
        <DialogHeader>
          <DialogTitle>{ts.title(analyst.name)}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Work Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{ts.workHours}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="start_time" render={({
                field
              }) => <FormItem>
                      <FormLabel>{ts.startTime}</FormLabel>
                      <FormControl>
                         <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="end_time" render={({
                field
              }) => <FormItem>
                      <FormLabel>{ts.endTime}</FormLabel>
                      <FormControl>
                         <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </CardContent>
            </Card>

            {/* Lunch Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{ts.lunchBreak}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="lunch_start" render={({
                field
              }) => <FormItem>
                      <FormLabel>{ts.lunchStart}</FormLabel>
                      <FormControl>
                         <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="lunch_end" render={({
                field
              }) => <FormItem>
                      <FormLabel>{ts.lunchEnd}</FormLabel>
                      <FormControl>
                         <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </CardContent>
            </Card>

            {/* Break Times */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{ts.breakTimes}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="break1_start" render={({
                  field
                }) => <FormItem>
                        <FormLabel>{ts.break1Start}</FormLabel>
                        <FormControl>
                           <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="break1_end" render={({
                  field
                }) => <FormItem>
                        <FormLabel>{ts.break1End}</FormLabel>
                        <FormControl>
                           <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="break2_start" render={({
                  field
                }) => <FormItem>
                        <FormLabel>{ts.break2Start}</FormLabel>
                        <FormControl>
                           <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="break2_end" render={({
                  field
                }) => <FormItem>
                        <FormLabel>{ts.break2End}</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>
              </CardContent>
            </Card>

            {/* Work Days */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{ts.workSchedule}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {days.map(day => <div key={day.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <FormField control={form.control} name={`work_days.${day.key}.active` as any} render={({
                    field
                  }) => <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <Label className="min-w-[90px]">{day.label}</Label>
                          </FormItem>} />
                    </div>

                    <FormField control={form.control} name={`work_days.${day.key}.mode` as any} render={({
                  field
                }) => <FormItem>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange} disabled={!form.watch(`work_days.${day.key}.active` as any)}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="office">{t.workMode.office}</SelectItem>
                                <SelectItem value="home">{t.workMode.home}</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>} />
                  </div>)}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
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