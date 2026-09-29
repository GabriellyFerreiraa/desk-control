import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, GraduationCap } from 'lucide-react';
import { useLang, useT } from '@/i18n/lang';
import { useDateLocale } from '@/i18n/dates';
import { asLocalized, pickLocalized } from '@/lib/localized';

interface NotificationRow {
  id: string;
  type: string;
  payload: Json;
  read_at: string | null;
  created_at: string;
}

const POLL_MS = 60_000;

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
      .limit(20);
    if (error) {
      console.error('Error loading notifications:', error);
      return;
    }
    setItems(data || []);
  }, [user]);

  // No realtime channel: a light poll plus a refresh when the tab regains focus.
  useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_MS);
    window.addEventListener('focus', load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', load);
    };
  }, [load]);

  const unread = items.filter((n) => !n.read_at).length;

  const markAllRead = async () => {
    if (unread === 0) return;
    const { error } = await supabase.rpc('mark_notifications_read', { _ids: null });
    if (error) {
      console.error('Error marking notifications as read:', error);
      return;
    }
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
  };

  const describe = (n: NotificationRow) => {
    const payload = (n.payload ?? {}) as { analyst_name?: string; course_title?: Json };
    if (n.type === 'course_completed') {
      return tn.courseCompleted(payload.analyst_name ?? '', pickLocalized(asLocalized(payload.course_title), lang));
    }
    return n.type;
  };

  const openItem = (n: NotificationRow) => {
    setOpen(false);
    if (!n.read_at) {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, read_at: now } : item)));
      supabase.rpc('mark_notifications_read', { _ids: [n.id] }).then(({ error }) => {
        if (error) console.error('Error marking notification as read:', error);
      });
    }
    if (n.type === 'course_completed') navigate('/dashboard?tab=learning-progress');
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
      <PopoverContent align="end" collisionPadding={12} className="w-[min(20rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-semibold">{tn.title}</p>
          {unread > 0 && <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={markAllRead}>
              {tn.markAllRead}
            </Button>}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">{tn.empty}</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto divide-y">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className={`w-full flex gap-3 px-4 py-3 text-left hover:bg-muted/60 ${n.read_at ? '' : 'bg-primary/5'}`}
                >
                  <GraduationCap className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className={`block text-sm ${n.read_at ? '' : 'font-medium'}`}>{describe(n)}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale })}
                    </span>
                  </span>
                  {!n.read_at && <span className="ml-auto mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>;
};
