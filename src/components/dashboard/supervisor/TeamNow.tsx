import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/UserAvatar';
import { useT } from '@/i18n/lang';
import { cn } from '@/lib/utils';
import { PRESENCE_DOT, PRESENCE_ORDER, PresenceInfo } from '../teamStatus';

export interface TeamMember {
  user_id: string;
  name: string;
  avatar_url: string | null;
  info: PresenceInfo;
}

// Who is working right now, ordered so the people available come first.
export const TeamNow = ({ members }: { members: TeamMember[] }) => {
  const t = useT();
  const ts = t.supervisor;

  const detail = (info: PresenceInfo) => {
    if (info.presence === 'onShift' && info.until) return ts.until(info.until);
    if ((info.presence === 'onLunch' || info.presence === 'onBreak') && info.until) return ts.backAt(info.until);
    if (info.presence === 'offShift' && info.startsAt) return ts.startsAt(info.startsAt);
    return '';
  };

  const sorted = [...members].sort((a, b) =>
    PRESENCE_ORDER[a.info.presence] - PRESENCE_ORDER[b.info.presence] || a.name.localeCompare(b.name));

  return <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle>{ts.teamTitle}</CardTitle>
        <CardDescription>{ts.teamDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ts.teamEmpty}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {sorted.map((m) => {
              const away = m.info.presence === 'offShift' || m.info.presence === 'dayOff';
              return <li key={m.user_id} className="flex items-center gap-3 px-3 py-2">
                  <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', PRESENCE_DOT[m.info.presence])} aria-hidden />
                  <UserAvatar src={m.avatar_url} name={m.name} size="xs" />
                  <span className={cn('min-w-0 flex-1 truncate text-sm font-medium', away && 'text-muted-foreground')}>{m.name}</span>
                  <span className="text-right text-xs">
                    <span className={cn('block', away ? 'text-muted-foreground' : 'text-foreground')}>{ts.presence[m.info.presence]}</span>
                    {detail(m.info) && <span className="block text-muted-foreground">{detail(m.info)}</span>}
                  </span>
                </li>;
            })}
          </ul>
        )}
      </CardContent>
    </Card>;
};
