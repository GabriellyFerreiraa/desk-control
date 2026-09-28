import { useState } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useT } from '@/i18n/lang';
import { parseDay, useDateLocale } from '@/i18n/dates';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Calendar, User } from 'lucide-react';
interface AbsenceApprovalModalProps {
  request: any;
  onClose: () => void;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
}
export const AbsenceApprovalModal = ({
  request,
  onClose,
  onApprove,
  onReject
}: AbsenceApprovalModalProps) => {
  const t = useT();
  const ta = t.approval;
  const locale = useDateLocale();
  const [comment, setComment] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const isCancel = request.status === 'cancel_requested';
  const handleApprove = () => {
    onApprove(comment);
  };
  const handleReject = () => {
    if (!comment.trim()) {
      toast({ title: ta.rejectNeedsComment, variant: 'destructive' });
      return;
    }
    onReject(comment);
  };
  const getDuration = () => {
    const start = parseDay(request.start_date);
    const end = parseDay(request.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };
  return <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-[hsl(var(--panel))]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isCancel ? ta.reviewCancellation : ta.reviewAbsence}
          </DialogTitle>
          <DialogDescription>
            {isCancel ? ta.descriptionCancellation : ta.descriptionAbsence}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Request Details */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <UserAvatar src={request.analyst_profile?.avatar_url} name={request.analyst_profile?.name} size="xs" />
              <span className="font-medium">{request.analyst_profile?.name}</span>
              <Badge variant="secondary">{isCancel ? t.absences.status.cancel_requested : t.absences.status.pending}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">{ta.startDate}</Label>
                <p className="font-medium">
                  {format(parseDay(request.start_date), 'PPP', { locale })}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">{ta.endDate}</Label>
                <p className="font-medium">
                  {format(parseDay(request.end_date), 'PPP', { locale })}
                </p>
              </div>
            </div>
            
            <div className="text-sm">
              <Label className="text-muted-foreground">{ta.duration}</Label>
              <p className="font-medium">{ta.days(getDuration())}</p>
            </div>
            
            <div>
              <Label className="text-muted-foreground">{ta.reason}</Label>
              <p className="mt-1 p-3 bg-muted rounded text-sm">{request.reason}</p>
            </div>

            {isCancel && <div>
                <Label className="text-muted-foreground">{ta.cancelReason}</Label>
                <p className="mt-1 p-3 bg-muted rounded text-sm">{request.cancel_reason || ta.noReason}</p>
              </div>}
            
            <div className="text-xs text-muted-foreground">
              {ta.requestedOn(format(new Date(request.created_at), 'PPp', { locale }))}
            </div>
          </div>
          
          {/* Comment Section */}
          <div className="space-y-2">
            <Label htmlFor="comment">
              {ta.comment} {action === 'reject' && <span className="text-destructive">*</span>}
            </Label>
            <Textarea id="comment" placeholder={action === 'approve' ? ta.placeholderApprove : action === 'reject' ? ta.placeholderReject : ta.placeholderDefault} value={comment} onChange={e => setComment(e.target.value)} rows={3} />
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" onClick={() => {
            setAction('reject');
            handleReject();
          }} className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              {isCancel ? ta.rejectCancellation : ta.reject}
            </Button>
            <Button onClick={() => {
            setAction('approve');
            handleApprove();
          }} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {isCancel ? ta.approveCancellation : ta.approve}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};