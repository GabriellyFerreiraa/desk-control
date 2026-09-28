import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useT } from '@/i18n/lang';

interface CancellationRequestModalProps {
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const CancellationRequestModal = ({ onClose, onConfirm }: CancellationRequestModalProps) => {
  const t = useT();
  const tc = t.cancelModal;
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-[hsl(var(--panel))]">
        <DialogHeader>
          <DialogTitle>{tc.title}</DialogTitle>
          <DialogDescription>
            {tc.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">{tc.reason}</Label>
            <Textarea
              id="cancel-reason"
              placeholder={tc.placeholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{tc.visibleToLead}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
            <Button onClick={handleConfirm} disabled={!reason.trim()}>{tc.submit}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
