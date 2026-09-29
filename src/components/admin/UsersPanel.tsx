import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { UserAvatar } from '@/components/UserAvatar';
import { toast } from '@/hooks/use-toast';
import { useT } from '@/i18n/lang';
import { useDateLocale } from '@/i18n/dates';
import { userStatusVariant } from '@/lib/status';

type AdminUser = Database['public']['Functions']['admin_list_users']['Returns'][number];
type Role = Database['public']['Enums']['app_role'];
type Status = Database['public']['Enums']['user_status'];
type Project = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'name' | 'active'>;
type StatusFilter = Status | 'all';

const ROLES: Role[] = ['analyst', 'lead', 'admin'];
const STATUSES: Status[] = ['pending', 'active', 'inactive'];
const NO_PROJECT = 'none';

export const UsersPanel = () => {
  const { user, refreshProfile } = useAuth();
  const t = useT();
  const dateLocale = useDateLocale();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [{ data: userRows, error: usersError }, { data: projectRows, error: projectsError }] = await Promise.all([
        supabase.rpc('admin_list_users'),
        supabase.from('projects').select('id, name, active').order('name'),
      ]);
      if (usersError || projectsError) throw usersError || projectsError;
      setUsers(userRows || []);
      setProjects(projectRows || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({ title: t.common.error, description: t.admin.users.updateFailed, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUser = async (target: AdminUser, patch: Partial<Pick<AdminUser, 'role' | 'status' | 'project_id'>>) => {
    const next = { ...target, ...patch };
    if (next.status === 'active' && !next.project_id) {
      toast({ title: t.admin.users.activateNeedsProject, variant: 'destructive' });
      return;
    }
    setSavingId(target.user_id);
    try {
      const { error } = await supabase.from('profiles').update(patch).eq('user_id', target.user_id);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => (u.user_id === target.user_id ? next : u)));
      toast({ title: t.admin.users.updated, description: target.name });
      if (target.user_id === user?.id) await refreshProfile();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({ title: t.admin.users.updateFailed, variant: 'destructive' });
    } finally {
      setSavingId(null);
    }
  };

  const pendingCount = users.filter((u) => u.status === 'pending').length;

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (!query) return true;
      return u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
    });
  }, [users, search, statusFilter]);

  return <Card className="bg-[hsl(var(--panel))]">
      <CardHeader className="bg-[hsl(var(--panel))]">
        <CardTitle className="flex items-center gap-3">
          {t.admin.users.title}
          {pendingCount > 0 && <Badge>{t.admin.users.pendingCount(pendingCount)}</Badge>}
        </CardTitle>
        <CardDescription>{t.admin.users.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 bg-[hsl(var(--panel))]">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.admin.users.searchPlaceholder}
            aria-label={t.common.search}
            className="md:max-w-xs bg-[hsl(var(--field))]"
          />
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(value) => value && setStatusFilter(value as StatusFilter)}
            className="justify-start"
          >
            <ToggleGroupItem value="all" size="sm">{t.admin.users.filterAll}</ToggleGroupItem>
            {STATUSES.map((s) => (
              <ToggleGroupItem key={s} value={s} size="sm">{t.status[s]}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t.common.loading}</p>
        ) : visibleUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t.admin.users.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.users.colUser}</TableHead>
                  <TableHead>{t.admin.users.colRole}</TableHead>
                  <TableHead>{t.admin.users.colProject}</TableHead>
                  <TableHead>{t.admin.users.colStatus}</TableHead>
                  <TableHead>{t.admin.users.colJoined}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.map((u) => {
                  const isSelf = u.user_id === user?.id;
                  const busy = savingId === u.user_id;
                  return <TableRow key={u.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <UserAvatar src={u.avatar_url} name={u.name} />
                          <div>
                            <p className="font-medium">
                              {u.name}
                              {isSelf && <span className="text-muted-foreground font-normal"> ({t.admin.users.you})</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(value) => updateUser(u, { role: value as Role })}
                          disabled={isSelf || busy}
                        >
                          <SelectTrigger className="w-32" title={isSelf ? t.admin.users.selfLocked : undefined}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => <SelectItem key={r} value={r}>{t.roles[r]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.project_id ?? NO_PROJECT}
                          onValueChange={(value) => updateUser(u, { project_id: value === NO_PROJECT ? null : value })}
                          disabled={busy}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_PROJECT}>{t.admin.users.noProject}</SelectItem>
                            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.status}
                          onValueChange={(value) => updateUser(u, { status: value as Status })}
                          disabled={isSelf || busy}
                        >
                          <SelectTrigger className="w-32" title={isSelf ? t.admin.users.selfLocked : undefined}>
                            <Badge variant={userStatusVariant(u.status)}>{t.status[u.status]}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s} value={s}>{t.status[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(u.created_at), 'P', { locale: dateLocale })}
                      </TableCell>
                    </TableRow>;
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>;
};
