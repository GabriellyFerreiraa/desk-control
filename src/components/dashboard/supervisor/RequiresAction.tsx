import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { CheckCircle2 } from 'lucide-react';
import { useT } from '@/i18n/lang';
import { parseDay, useDateLocale } from '@/i18n/dates';
import { absenceStatusVariant } from '@/lib/status';
import { cn } from '@/lib/utils';
import { absenceDays, daysUntil } from '../teamStatus';

export interface RequestRow {
  id: string;
  analyst_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  analyst_profile?: { name: string; avatar_url?: string | null } | null;
}

interface RequiresActionProps {
  requests: RequestRow[];
  upcoming: RequestRow[];
  now: Date;
  onReview: (request: RequestRow) => void;
}

export const RequiresAction = ({ requests, upcoming, now, onReview }: RequiresActionProps) => {
  const t = useT();
  const ts = t.supervisor;
  const locale = useDateLocale();

  const range = (r: RequestRow) => {
    const start = format(parseDay(r.start_date), 'd MMM', { locale });
    const end = format(parseDay(r.end_date), 'd MMM', { locale });
    return r.start_date === r.end_date ? start : `${start} - ${end}`;
  };

  const timing = (r: RequestRow) => {
    const days = daysUntil(r.start_date, now);
    if (days < 0) return { label: ts.alreadyStarted, urgent: true };
    if (days === 0) return { label: ts.startsToday, urgent: true };
    if (days === 1) return { label: ts.startsTomorrow, urgent: true };
    return { label: ts.startsIn(days), urgent: false };
  };

  return <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {ts.actionTitle}
          {requests.length > 0 && <Badge variant="warning">{requests.length}</Badge>}
        </CardTitle>
        <CardDescription>{ts.actionDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {requests.length === 0 ? (
          <div className="flex items-center gap-3 rounded-md border border-dashed px-4 py-5 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-status-success-fg" aria-hidden />
            {ts.actionEmpty}
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {requests.map((r) => {
              const when = timing(r);
              return <li key={r.id} className="flex items-center gap-3 px-3 py-3">
                  <UserAvatar src={r.analyst_profile?.avatar_url} name={r.analyst_profile?.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{r.analyst_profile?.name}</span>
                      <span className="text-sm text-foreground">{range(r)}</span>
                      <span className="text-sm text-muted-foreground">· {t.approval.days(absenceDays(r.start_date, r.end_date))}</span>
                      {r.status === 'cancel_requested' && <Badge variant={absenceStatusVariant(r.status)}>{t.absences.status.cancel_requested}</Badge>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs">
                      <span className={cn(when.urgent ? 'font-medium text-status-pending-fg' : 'text-muted-foreground')}>{when.label}</span>
                      <span className="truncate text-muted-foreground">· {r.reason}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onReview(r)}>{t.absences.review}</Button>
                </li>;
            })}
          </ul>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{ts.upcomingTitle}</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">{ts.upcomingEmpty}</p>
          ) : (
            <ul className="space-y-1.5">
              {upcoming.map((r) => <li key={r.id} className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-status-pending" aria-hidden />
                  <span className="font-medium">{r.analyst_profile?.name}</span>
                  <span className="text-muted-foreground">{range(r)} · {t.approval.days(absenceDays(r.start_date, r.end_date))}</span>
                </li>)}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>;
};
