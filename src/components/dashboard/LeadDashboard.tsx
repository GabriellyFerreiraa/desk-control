import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { addDays, format } from 'date-fns';
import { parseDay, useDateLocale } from '@/i18n/dates';
import { TaskAssignmentForm } from '@/components/forms/TaskAssignmentForm';
import { AbsenceApprovalModal } from '@/components/modals/AbsenceApprovalModal';
import { TeamCalendar } from '@/components/calendar/TeamCalendar';
import { ShiftEditForm } from '@/components/forms/ShiftEditForm';
import { UserAvatar } from '@/components/UserAvatar';
import { ProgressReport } from '@/components/learning/ProgressReport';
import { useSearchParams } from 'react-router-dom';
import { useT } from '@/i18n/lang';
import { absenceStatusVariant, taskStatusVariant } from '@/lib/status';
import { TodayStrip, StripTarget } from './supervisor/TodayStrip';
import { RequestRow, RequiresAction } from './supervisor/RequiresAction';
import { TeamNow } from './supervisor/TeamNow';
import { TeamRow, TeamTable } from './supervisor/TeamTable';
import { localIsoDay, presenceOf } from './teamStatus';
import { LoadError } from './LoadError';

const TABS = ['tasks', 'team', 'history', 'learning-progress'] as const;
const UPCOMING_DAYS = 14;
// Presence depends on the clock (lunch, breaks, end of shift).
const CLOCK_TICK_MS = 60_000;

const priorityVariant = (priority: number | null) =>
  (priority ?? 0) >= 5 ? 'destructive' as const : (priority ?? 0) === 4 ? 'warning' as const : 'outline' as const;

export const LeadDashboard = () => {
  const {
    user,
    userProfile
  } = useAuth();
  // Deleting an account (login included) is admin-only, also in the database.
  const isAdmin = userProfile?.role === 'admin';
  const t = useT();
  const ts = t.supervisor;
  const locale = useDateLocale();
  // ?tab=learning-progress opens the report (used by the notification bell).
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [pendingRequests, setPendingRequests] = useState<RequestRow[]>([]);
  const [activeAbsences, setActiveAbsences] = useState<RequestRow[]>([]);
  const [processedRequests, setProcessedRequests] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [analysts, setAnalysts] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedAnalyst, setSelectedAnalyst] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<string>(requestedTab && (TABS as readonly string[]).includes(requestedTab) ? requestedTab : 'tasks');
  const actionRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (requestedTab && (TABS as readonly string[]).includes(requestedTab)) setActiveTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const today = localIsoDay(new Date());
      const [
        { data: requests, error: requestsError },
        { data: absences, error: absencesError },
        { data: processed, error: processedError },
        { data: tasks, error: tasksError },
        { data: allAnalysts, error: analystsError },
        { data: ownProfile, error: ownProfileError },
        { data: ledProjects, error: ledProjectsError }
      ] = await Promise.all([
        // Requests waiting for a decision, soonest start first
        supabase.from('absence_requests').select('*, analyst_profile:profiles!absence_requests_analyst_id_fkey(name, avatar_url)').in('status', ['pending', 'cancel_requested']).order('start_date', {
          ascending: true
        }),
        // Approved absences from today on (who is out today + upcoming)
        supabase.from('absence_requests').select('*, analyst_profile:profiles!absence_requests_analyst_id_fkey(name, avatar_url)').in('status', ['approved', 'cancel_requested']).gte('end_date', today).order('start_date', {
          ascending: true
        }),
        // Decided requests, for the history tab
        supabase.from('absence_requests').select('*, analyst_profile:profiles!absence_requests_analyst_id_fkey(name, avatar_url)').in('status', ['approved', 'rejected', 'cancelled']).order('updated_at', {
          ascending: false
        }),
        supabase.from('tasks').select('*, assigned_to_profile:profiles!tasks_assigned_to_fkey(name, avatar_url)').order('created_at', {
          ascending: false
        }),
        supabase.from('profiles').select('*').eq('role', 'analyst').eq('status', 'active').order('name'),
        // The lead's own profile (for self-service shift editing)
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        // Projects this user leads (admins see every project)
        supabase.from('project_leads').select('project_id').eq('lead_id', user.id)
      ]);

      const firstError = requestsError || absencesError || processedError || tasksError || analystsError || ownProfileError || ledProjectsError;
      if (firstError) throw firstError;

      // A lead only follows the analysts of the projects they lead.
      const projectIds = new Set((ledProjects || []).map((p) => p.project_id));
      const team = (allAnalysts || []).filter((a) => isAdmin || projectIds.has(a.project_id));
      const teamIds = new Set(team.map((a) => a.user_id));
      const inTeam = (row: { analyst_id?: string; assigned_to?: string }) => teamIds.has(row.analyst_id ?? row.assigned_to ?? '');

      setAnalysts(team);
      setPendingRequests((requests || []).filter(inTeam));
      setActiveAbsences((absences || []).filter(inTeam));
      setProcessedRequests((processed || []).filter(inTeam));
      setAllTasks((tasks || []).filter(inTeam));
      setMyProfile(ownProfile || null);
      setLoadedAt(new Date());
      setLoadError(false);
    } catch (error) {
      setLoadError(true);
      console.error('Error fetching data:', error);
      toast({
        title: t.common.error,
        description: t.dashboard.loadFailed,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, t]);

  useEffect(() => {
    fetchData();
    // Keep the numbers in step with the calendar, which is live as well.
    const channel = supabase
      .channel('lead-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absence_requests' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const approveRequest = async (requestId: string, comment = '') => {
    try {
      const {
        error
      } = await supabase.from('absence_requests').update({
        status: 'approved',
        lead_comment: comment,
        approved_by: user.id
      }).eq('id', requestId);
      if (error) throw error;
      toast({
        title: t.absences.toasts.approved,
        description: t.absences.toasts.approvedBody
      });
      fetchData();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: t.common.error,
        description: t.absences.toasts.approveFailed,
        variant: "destructive"
      });
    }
  };
  const rejectRequest = async (requestId: string, comment: string) => {
    try {
      const {
        error
      } = await supabase.from('absence_requests').update({
        status: 'rejected',
        lead_comment: comment
      }).eq('id', requestId);
      if (error) throw error;
      toast({
        title: t.absences.toasts.rejected,
        description: t.absences.toasts.rejectedBody
      });
      fetchData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: t.common.error,
        description: t.absences.toasts.rejectFailed,
        variant: "destructive"
      });
    }
  };
  const approveCancellation = async (requestId: string, comment = '') => {
    try {
      const { error } = await supabase
        .from('absence_requests')
        .update({ status: 'cancelled', lead_comment: comment })
        .eq('id', requestId);
      if (error) throw error;
      toast({ title: t.absences.toasts.cancellationApproved, description: t.absences.toasts.cancellationApprovedBody });
      fetchData();
    } catch (error) {
      console.error('Error approving cancellation:', error);
      toast({ title: t.common.error, description: t.absences.toasts.cancellationApproveFailed, variant: 'destructive' });
    }
  };
  const rejectCancellation = async (requestId: string, comment: string) => {
    try {
      const { error } = await supabase
        .from('absence_requests')
        .update({ status: 'approved', lead_comment: comment })
        .eq('id', requestId);
      if (error) throw error;
      toast({ title: t.absences.toasts.cancellationRejected, description: t.absences.toasts.cancellationRejectedBody });
      fetchData();
    } catch (error) {
      console.error('Error rejecting cancellation:', error);
      toast({ title: t.common.error, description: t.absences.toasts.cancellationRejectFailed, variant: 'destructive' });
    }
  };
  const deleteAnalyst = async (analystId: string, analystName: string) => {
    try {
      // Removes the login account; profile, tasks, absences and learning
      // progress go with it through ON DELETE CASCADE.
      const {
        error
      } = await supabase.rpc('admin_delete_user', { _user_id: analystId });
      if (error) throw error;
      toast({
        title: t.team.deleted,
        description: t.team.deletedBody(analystName)
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting analyst:', error);
      toast({
        title: t.common.error,
        description: t.team.deleteFailed,
        variant: "destructive"
      });
    }
  };

  // ---- Derived view data -------------------------------------------------

  const teamRows: TeamRow[] = useMemo(
    () => analysts.map((a) => ({ ...a, info: presenceOf(a, activeAbsences, now) })),
    [analysts, activeAbsences, now]
  );
  const myRow: TeamRow | null = myProfile ? { ...myProfile, info: presenceOf(myProfile, activeAbsences, now) } : null;

  const upcoming = useMemo(() => {
    const limit = localIsoDay(addDays(now, UPCOMING_DAYS));
    return activeAbsences.filter((a) => a.status === 'approved' && a.start_date <= limit);
  }, [activeAbsences, now]);

  const activeTasks = allTasks.filter((task) => task.status !== 'completed');
  const completedTasks = allTasks.filter((task) => task.status === 'completed');

  const counts = {
    toReview: pendingRequests.length,
    absent: teamRows.filter((r) => r.info.presence === 'absent').length,
    onShift: teamRows.filter((r) => r.info.presence === 'onShift').length,
    onBreak: teamRows.filter((r) => r.info.presence === 'onLunch' || r.info.presence === 'onBreak').length,
    total: teamRows.filter((r) => r.info.presence !== 'dayOff' && r.info.presence !== 'absent').length,
    activeTasks: activeTasks.length,
  };

  const jumpTo = (target: StripTarget) => {
    if (target === 'tasks') {
      setActiveTab('tasks');
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const ref = target === 'action' ? actionRef : teamRef;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const dayRange = (request: { start_date: string; end_date: string }) =>
    `${format(parseDay(request.start_date), 'PP', { locale })} - ${format(parseDay(request.end_date), 'PP', { locale })}`;

  if (loading) {
    return <div className="space-y-6" aria-busy="true" aria-label={t.dashboard.loading}>
        <Skeleton className="h-[74px] w-full rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-72 rounded-lg lg:col-span-3" />
          <Skeleton className="h-72 rounded-lg lg:col-span-2" />
        </div>
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>;
  }

  // Never show empty lists after a failed first load: they would read as "nothing pending".
  if (loadError && !loadedAt) {
    return <LoadError onRetry={() => { setLoading(true); fetchData(); }} />;
  }

  return <div className="space-y-6">
      <TodayStrip
        dateLabel={format(now, 'EEEE d MMMM', { locale })}
        updatedLabel={loadedAt ? ts.updatedAt(format(loadedAt, 'HH:mm')) : ''}
        counts={counts}
        onSelect={jumpTo}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div ref={actionRef} className="scroll-mt-4 lg:col-span-3">
          <RequiresAction requests={pendingRequests} upcoming={upcoming} now={now} onReview={setSelectedRequest} />
        </div>
        <div ref={teamRef} className="scroll-mt-4 lg:col-span-2">
          <TeamNow members={teamRows.map((r) => ({ user_id: r.user_id, name: r.name, avatar_url: r.avatar_url, info: r.info }))} />
        </div>
      </div>

      <div ref={tabsRef} className="scroll-mt-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tasks">
            {ts.tabs.tasks}
            {activeTasks.length > 0 && <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{activeTasks.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="team">{ts.tabs.team}</TabsTrigger>
          <TabsTrigger value="history">{ts.tabs.history}</TabsTrigger>
          <TabsTrigger value="learning-progress">{t.progress.tab}</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
              <div className="space-y-1.5">
                <CardTitle>{ts.tasksTitle}</CardTitle>
                <CardDescription>{ts.tasksDescription}</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowTaskForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t.tasks.assign}
              </Button>
            </CardHeader>
            <CardContent>
              {activeTasks.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">
                  {t.tasks.noPending}
                </p> : <ul className="divide-y rounded-md border">
                  {activeTasks.map(task => <li key={task.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{task.title}</p>
                        {task.description && <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <UserAvatar src={task.assigned_to_profile?.avatar_url} name={task.assigned_to_profile?.name} size="xs" />
                            {task.assigned_to_profile?.name}
                          </span>
                          <span>· {task.assigned_by === task.assigned_to ? t.tasks.selfAssigned : t.tasks.leadAssigned}</span>
                          {task.due_date && <span>· {t.tasks.due(format(new Date(task.due_date), 'PPp', { locale }))}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {task.priority && <Badge variant={priorityVariant(task.priority)}>{t.taskForm.priorities[task.priority] ?? task.priority}</Badge>}
                        <Badge variant={taskStatusVariant(task.status)}>{(t.tasks.status as Record<string, string>)[task.status] ?? task.status}</Badge>
                      </div>
                    </li>)}
                </ul>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <TeamTable
            rows={teamRows}
            myProfile={myRow}
            isAdmin={isAdmin}
            now={now}
            onEdit={setSelectedAnalyst}
            onDelete={(row) => deleteAnalyst(row.user_id, row.name)}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t.absences.processedTitle}</CardTitle>
              <CardDescription>{t.absences.processedDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {processedRequests.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">{t.absences.noProcessed}</p> : <ul className="divide-y rounded-md border">
                  {processedRequests.map(request => <li key={request.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start">
                      <UserAvatar src={request.analyst_profile?.avatar_url} name={request.analyst_profile?.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <span className="font-medium">{request.analyst_profile?.name}</span>
                          <span className="text-sm text-muted-foreground">{dayRange(request)}</span>
                        </div>
                        <p className="text-sm">{request.reason}</p>
                        {request.lead_comment && <p className="mt-1 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{t.absences.leadComment}</span> {request.lead_comment}
                          </p>}
                      </div>
                      <Badge variant={absenceStatusVariant(request.status)}>
                        {(t.absences.status as Record<string, string>)[request.status] ?? request.status}
                      </Badge>
                    </li>)}
                </ul>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t.tasks.completedTitle}</CardTitle>
              <CardDescription>{t.tasks.completedAll}</CardDescription>
            </CardHeader>
            <CardContent>
              {completedTasks.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">{t.tasks.noCompleted}</p> : <ul className="divide-y rounded-md border">
                  {completedTasks.map(task => <li key={task.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.assigned_to_profile?.name}
                          {task.completed_at && ` · ${format(new Date(task.completed_at), 'PP', { locale })}`}
                        </p>
                      </div>
                      <Badge variant={taskStatusVariant(task.status)}>{t.tasks.status.completed}</Badge>
                    </li>)}
                </ul>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning-progress">
          <ProgressReport />
        </TabsContent>
      </Tabs>
      </div>

      {/* Always visible at the end of the page, for planning who is out. */}
      <TeamCalendar memberIds={analysts.map((a) => a.user_id)} />

      {/* Task Assignment Form Modal */}
      {showTaskForm && <TaskAssignmentForm analysts={analysts} onClose={() => setShowTaskForm(false)} onSuccess={() => {
      setShowTaskForm(false);
      fetchData();
    }} />}

      {/* Absence Approval Modal */}
      {selectedRequest && <AbsenceApprovalModal request={selectedRequest} onClose={() => setSelectedRequest(null)} onApprove={comment => {
      if (selectedRequest.status === 'cancel_requested') {
        approveCancellation(selectedRequest.id, comment);
      } else {
        approveRequest(selectedRequest.id, comment);
      }
      setSelectedRequest(null);
    }} onReject={comment => {
      if (selectedRequest.status === 'cancel_requested') {
        rejectCancellation(selectedRequest.id, comment);
      } else {
        rejectRequest(selectedRequest.id, comment);
      }
      setSelectedRequest(null);
    }} />}

      {/* Shift Edit Modal */}
      {selectedAnalyst && <ShiftEditForm analyst={selectedAnalyst} onClose={() => setSelectedAnalyst(null)} onSuccess={() => {
      setSelectedAnalyst(null);
      fetchData();
    }} />}
    </div>;
};
