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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useT } from '@/i18n/lang';

const PRIORITIES = [1, 2, 3, 4, 5];

interface TaskAssignmentFormProps {
  analysts: any[];
  onClose: () => void;
  onSuccess: () => void;
}
export const TaskAssignmentForm = ({
  analysts,
  onClose,
  onSuccess
}: TaskAssignmentFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const {
    user
  } = useAuth();
  const t = useT();
  const tf = t.taskForm;
  const schema = useMemo(() => z.object({
    title: z.string().min(3, tf.errors.titleMin),
    description: z.string().optional(),
    assignedTo: z.string().min(1, tf.errors.analystRequired),
    priority: z.number().min(1).max(5),
    dueDate: z.string().optional()
  }), [tf]);
  type FormData = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    setValue,
    formState: {
      errors
    }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: 1
    }
  });
  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const taskData = {
        title: data.title,
        description: data.description,
        assigned_to: data.assignedTo,
        assigned_by: user.id,
        priority: data.priority,
        status: 'pending' as const,
        ...(data.dueDate && {
          due_date: new Date(data.dueDate).toISOString()
        })
      };
      const {
        error
      } = await supabase.from('tasks').insert(taskData);
      if (error) throw error;
      toast({
        title: tf.assigned,
        description: tf.assignedBody
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: t.common.error,
        description: tf.assignFailed,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[hsl(var(--panel))]">
        <DialogHeader>
          <DialogTitle>{tf.assignTitle}</DialogTitle>
          <DialogDescription>
            {tf.assignDescription}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{tf.title}</Label>
            <Input id="title" placeholder={tf.titlePlaceholder} {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{tf.description}</Label>
            <Textarea id="description" placeholder={tf.descriptionPlaceholder} {...register('description')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">{tf.assignTo}</Label>
            <Select onValueChange={value => setValue('assignedTo', value)}>
              <SelectTrigger id="assignedTo">
                <SelectValue placeholder={tf.selectAnalyst} />
              </SelectTrigger>
              <SelectContent>
                {analysts.map(analyst => <SelectItem key={analyst.user_id} value={analyst.user_id}>
                    {analyst.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
            <input type="hidden" {...register('assignedTo')} />
            {errors.assignedTo && <p className="text-sm text-destructive">{errors.assignedTo.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">{tf.priority}</Label>
              <Select onValueChange={value => setValue('priority', parseInt(value))}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder={tf.priority} />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={String(p)}>{tf.priorities[p]}</SelectItem>)}
                </SelectContent>
              </Select>
              <input type="hidden" {...register('priority', { valueAsNumber: true })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">{tf.dueDate}</Label>
              <Input id="dueDate" type="datetime-local" {...register('dueDate')} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? tf.assigning : tf.assign}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>;
};
