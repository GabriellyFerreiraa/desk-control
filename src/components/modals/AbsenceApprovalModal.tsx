import { useState } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
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
  const [comment, setComment] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const isCancel = request.status === 'cancel_requested';
  const handleApprove = () => {
    onApprove(comment);
  };
  const handleReject = () => {
    if (!comment.trim()) {
      alert('You must provide a comment to reject the request');
      return;
    }
    onReject(comment);
  };
  const getDuration = () => {
    const start = new Date(request.start_date);
    const end = new Date(request.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };
  return <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-[hsl(var(--panel))]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isCancel ? 'Review Cancellation Request' : 'Review Absence Request'}
          </DialogTitle>
          <DialogDescription>
            {isCancel ? 'Decide whether to cancel an already approved absence' : 'Review and decide on this absence request'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Request Details */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <UserAvatar src={request.analyst_profile?.avatar_url} name={request.analyst_profile?.name} size="xs" />
              <span className="font-medium">{request.analyst_profile?.name}</span>
              <Badge variant="secondary">{isCancel ? 'Cancellation requested' : 'Pending'}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Start date</Label>
                <p className="font-medium">
                  {format(new Date(request.start_date), 'PPP', {
                  locale: enUS
                })}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">End date</Label>
                <p className="font-medium">
                  {format(new Date(request.end_date), 'PPP', {
                  locale: enUS
                })}
                </p>
              </div>
            </div>
            
            <div className="text-sm">
              <Label className="text-muted-foreground">Duration</Label>
              <p className="font-medium">{getDuration()} day(s)</p>
            </div>
            
            <div>
              <Label className="text-muted-foreground">Reason</Label>
              <p className="mt-1 p-3 bg-muted rounded text-sm">{request.reason}</p>
            </div>

            {isCancel && <div>
                <Label className="text-muted-foreground">Cancellation reason (from analyst)</Label>
                <p className="mt-1 p-3 bg-muted rounded text-sm">{request.cancel_reason || 'No reason provided'}</p>
              </div>}
            
            <div className="text-xs text-muted-foreground">
              Requested on {format(new Date(request.created_at), 'PPp', {
              locale: enUS
            })}
            </div>
          </div>
          
          {/* Comment Section */}
          <div className="space-y-2">
            <Label htmlFor="comment">
              Comment {action === 'reject' && <span className="text-destructive">*</span>}
            </Label>
            <Textarea id="comment" placeholder={action === 'approve' ? "Optional comment about the approval..." : action === 'reject' ? "Explain the reason for the rejection..." : "Add a comment..."} value={comment} onChange={e => setComment(e.target.value)} rows={3} />
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => {
            setAction('reject');
            handleReject();
          }} className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              {isCancel ? 'Reject Cancellation' : 'Reject'}
            </Button>
            <Button onClick={() => {
            setAction('approve');
            handleApprove();
          }} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {isCancel ? 'Approve Cancellation' : 'Approve'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};