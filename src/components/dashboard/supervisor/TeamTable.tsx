import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserAvatar } from '@/components/UserAvatar';
import { Building2, Home, Pencil, Trash2 } from 'lucide-react';
import { ConfirmAction } from '@/components/admin/course/ConfirmAction';
import { useT } from '@/i18n/lang';
import { cn } from '@/lib/utils';
import { PRESENCE_DOT, PresenceInfo, ScheduleProfile, dayKey } from '../teamStatus';

export interface TeamRow extends ScheduleProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  info: PresenceInfo;
}

interface TeamTableProps {
  rows: TeamRow[];
  myProfile: TeamRow | null;
  isAdmin: boolean;
  now: Date;
  onEdit: (profile: TeamRow) => void;
  onDelete: (profile: TeamRow) => void;
}

const hhmm = (value: string | null | undefined) => (value ? value.slice(0, 5) : '-');
const span = (start: string | null, end: string | null) => (start && end ? `${hhmm(start)} - ${hhmm(end)}` : '-');

// Schedules in rows so the team can be scanned top to bottom. Deleting is
// admin-only and sits behind a confirmation, out of the way.
export const TeamTable = ({ rows, myProfile, isAdmin, now, onEdit, onDelete }: TeamTableProps) => {
  const t = useT();
  const ts = t.supervisor;
  const today = dayKey(now);

  const modeCell = (row: TeamRow) => {
    const day = row.work_days?.[today];
    if (!day?.active) return <span className="text-muted-foreground">{ts.presence.dayOff}</span>;
    const Icon = day.mode === 'home' ? Home : Building2;
    return <span className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />{day.mode === 'home' ? t.workMode.home : t.workMode.office}</span>;
  };

  return <div className="space-y-4">
      {myProfile && <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{t.team.myShiftTitle}</p>
              <p className="text-sm text-muted-foreground">
                {t.team.schedule}: {span(myProfile.start_time, myProfile.end_time)} · {t.team.lunch}: {span(myProfile.lunch_start, myProfile.lunch_end)}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onEdit(myProfile)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t.team.editMySchedule}
            </Button>
          </CardContent>
        </Card>}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{ts.teamTableTitle}</CardTitle>
          <CardDescription>{ts.teamTableDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{ts.teamEmpty}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ts.columns.analyst}</TableHead>
                    <TableHead>{ts.columns.status}</TableHead>
                    <TableHead>{ts.columns.shift}</TableHead>
                    <TableHead>{ts.columns.lunch}</TableHead>
                    <TableHead>{ts.columns.breaks}</TableHead>
                    <TableHead>{ts.columns.mode}</TableHead>
                    <TableHead className="text-right">{ts.columns.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...rows].sort((a, b) => a.name.localeCompare(b.name)).map((row) => <TableRow key={row.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5 min-w-[160px]">
                          <UserAvatar src={row.avatar_url} name={row.name} size="xs" />
                          <span className="font-medium">{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', PRESENCE_DOT[row.info.presence])} aria-hidden />
                          {ts.presence[row.info.presence]}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{span(row.start_time, row.end_time)}</TableCell>
                      <TableCell className="whitespace-nowrap">{span(row.lunch_start, row.lunch_end)}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {span(row.break1_start, row.break1_end)} · {span(row.break2_start, row.break2_end)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{modeCell(row)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(row)} aria-label={`${t.team.editSchedule}: ${row.name}`} title={t.team.editSchedule}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && <ConfirmAction
                              trigger={<Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-status-danger/10 hover:text-status-danger-fg" aria-label={`${t.team.deleteAnalyst}: ${row.name}`} title={t.team.deleteAnalyst}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>}
                              title={t.team.deleteAnalyst}
                              description={t.team.deleteConfirm(row.name)}
                              confirmLabel={t.team.deleteAnalyst}
                              onConfirm={() => onDelete(row)}
                            />}
                        </div>
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>;
};
