import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, CalendarCheck, CalendarClock, CalendarX, ClipboardList, GraduationCap, type LucideIcon } from 'lucide-react';
import { useLang, useT } from '@/i18n/lang';
import { parseDay, useDateLocale } from '@/i18n/dates';
import { asLocalized, pickLocalized } from '@/lib/localized';
import { cn } from '@/lib/utils';

interface NotificationRow {
  id: string;
  type: string;
  payload: Json;
  read_at: string | null;
  created_at: string;
}

interface Payload {
  analyst_name?: string;
  course_title?: Json;
  start_date?: string;
  end_date?: string;
  title?: string;
  assigned_by_name?: string;
  no_lead?: boolean;
}

// Fallback refresh; live updates arrive through Supabase Realtime.
const POLL_MS = 60_000;

// Icon, tone and where each notification leads. The dashboards read ?tab=.
const KIND: Record<string, { icon: LucideIcon; tone: string; to: string }> = {
  course_completed: { icon: GraduationCap, tone: 'text-status-success-fg bg-status-success/10', to: '/dashboard?tab=learning-progress' },
  absence_requested: { icon: CalendarClock, tone: 'text-status-pending-fg bg-status-pending/10', to: '/dashboard' },
  cancellation_requested: { icon: CalendarClock, tone: 'text-status-pending-fg bg-status-pending/10', to: '/dashboard' },
  absence_approved: { icon: CalendarCheck, tone: 'text-status-success-fg bg-status-success/10', to: '/dashboard?tab=reports' },
  cancellation_approved: { icon: CalendarCheck, tone: 'text-status-neutral-fg bg-status-neutral/10', to: '/dashboard?tab=reports' },
  absence_rejected: { icon: CalendarX, tone: 'text-status-danger-fg bg-status-danger/10', to: '/dashboard?tab=reports' },
  cancellation_rejected: { icon: CalendarX, tone: 'text-status-danger-fg bg-status-danger/10', to: '/dashboard?tab=reports' },
  task_assigned: { icon: ClipboardList, tone: 'text-status-info-fg bg-status-info/10', to: '/dashboard?tab=tasks' },
};
const FALLBACK_KIND = { icon: Bell, tone: 'text-muted-foreground bg-muted', to: '/dashboard' };

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { lang } = useLang();
  const tn = t.notifications;
  const locale = useDateLocale();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, payload, read_at, created_at')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) {
      console.error('Error loading notifications:', error);
      return;
    }
    setItems(data || []);
  }, [user]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_MS);
    window.addEventListener('focus', load);
    const channel = user
      ? supabase
        .channel(`notifications-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, () => load())
        .subscribe()
      : null;
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', load);
      if (channel) supabase.removeChannel(channel);
    };
  }, [load, user]);

  const unread = items.filter((n) => !n.read_at).length;

  const markRead = async (ids: string[] | null) => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at || (ids && !ids.includes(n.id)) ? n : { ...n, read_at: now })));
    const { error } = await supabase.rpc('mark_notifications_read', { _ids: ids });
    if (error) console.error('Error marking notifications as read:', error);
  };

  const range = (p: Payload) => {
    if (!p.start_date) return '';
    const start = format(parseDay(p.start_date), 'd MMM', { locale });
    if (!p.end_date || p.end_date === p.start_date) return start;
    return `${start} - ${format(parseDay(p.end_date), 'd MMM', { locale })}`;
  };

  const describe = (n: NotificationRow) => {
    const p = (n.payload ?? {}) as Payload;
    switch (n.type) {
      case 'course_completed': return tn.courseCompleted(p.analyst_name ?? '', pickLocalized(asLocalized(p.course_title), lang));
      case 'absence_requested': return tn.absenceRequested(p.analyst_name ?? '', range(p));
      case 'cancellation_requested': return tn.cancellationRequested(p.analyst_name ?? '', range(p));
      case 'absence_approved': return tn.absenceApproved(range(p));
      case 'absence_rejected': return tn.absenceRejected(range(p));
      case 'cancellation_approved': return tn.cancellationApproved(range(p));
      case 'cancellation_rejected': return tn.cancellationRejected(range(p));
      case 'task_assigned': return tn.taskAssigned(p.assigned_by_name ?? '', p.title ?? '');
      default: return n.type;
    }
  };

  const openItem = (n: NotificationRow) => {
    setOpen(false);
    if (!n.read_at) markRead([n.id]);
    navigate((KIND[n.type] ?? FALLBACK_KIND).to);
  };

  return <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `${tn.open} (${tn.unread(unread)})` : tn.open}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold leading-[18px] text-center">
              {unread > 9 ? '9+' : unread}
            </span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={12} className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-semibold">
            {tn.title}
            {unread > 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">{tn.unread(unread)}</span>}
          </p>
          {unread > 0 && <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={() => markRead(null)}>
              {tn.markAllRead}
            </Button>}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground text-center">{tn.empty}</p>
        ) : (
          <ul className="max-h-[26rem] overflow-y-auto divide-y">
            {items.map((n) => {
              const kind = KIND[n.type] ?? FALLBACK_KIND;
              const Icon = kind.icon;
              const isUnread = !n.read_at;
              const noLead = ((n.payload ?? {}) as Payload).no_lead;
              return <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn(
                      'relative flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:bg-accent',
                      isUnread && 'bg-primary/[0.04]'
                    )}
                  >
                    {/* Unread: bar on the left + bold text + dot, not only a faint tint */}
                    {isUnread && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" aria-hidden />}
                    <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', kind.tone)}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm leading-snug', isUnread ? 'font-semibold text-foreground' : 'text-foreground/90')}>{describe(n)}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale })}
                        {noLead && <span className="rounded-full bg-status-pending/15 px-1.5 text-status-pending-fg">{tn.noLead}</span>}
                      </span>
                    </span>
                    {isUnread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={tn.unreadLabel} />}
                  </button>
                </li>;
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>;
};
