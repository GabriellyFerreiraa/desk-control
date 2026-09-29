import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/lang';

// Shown instead of the dashboard when its data could not be loaded, so an
// empty list is never mistaken for "nothing pending".
export const LoadError = ({ onRetry }: { onRetry: () => void }) => {
  const t = useT();
  return <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-status-danger/30 bg-status-danger/5 px-6 py-10 text-center">
      <AlertTriangle className="h-8 w-8 text-status-danger-fg" aria-hidden />
      <div>
        <p className="font-semibold">{t.dashboard.loadFailed}</p>
        <p className="text-sm text-muted-foreground">{t.dashboard.loadFailedBody}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        <RotateCw className="mr-2 h-4 w-4" />
        {t.common.retry}
      </Button>
    </div>;
};
