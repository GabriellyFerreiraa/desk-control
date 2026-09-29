import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Home, Building, Users, CheckCircle, AlertCircle, Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AbsenceRequestForm } from '@/components/forms/AbsenceRequestForm';
import { SelfAssignTaskForm } from '@/components/forms/SelfAssignTaskForm';
import { TeamCalendar } from '@/components/calendar/TeamCalendar';
import { UserAvatar } from '@/components/UserAvatar';
import { CancellationRequestModal } from '@/components/modals/CancellationRequestModal';
import { LearningTab } from '@/components/learning/LearningTab';
import { useSearchParams } from 'react-router-dom';
import { useT } from '@/i18n/lang';
import { parseDay, useDateLocale } from '@/i18n/dates';
import { absenceStatusVariant, taskStatusVariant } from '@/lib/status';
import { PRESENCE_DOT, localIsoDay, presenceOf } from './teamStatus';
import { LoadError } from './LoadError';
import { Skeleton } from '@/components/ui/skeleton';
export const AnalystDashboard = () => {
  const {
    userProfile,
    user
  } = useAuth();
  const t = useT();
  const locale = useDateLocale();
  // ?tab=learning lets the course player send the analyst back to this tab.
  const [searchParams] = useSearchParams();
  const [absenceRequests, setAbsenceRequests] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [onlineAnalysts, setOnlineAnalysts] = useState([]);
  const [approvedAbsences, setApprovedAbsences] = useState([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showSelfTaskForm, setShowSelfTaskForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'tasks');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const fetchData = async () => {
    if (!user) return;
    try {
      // Local calendar day (toISOString would give tomorrow late in the evening in the Americas).
      const today = localIsoDay(new Date());
      const [
        { data: absences, error: absencesError },
        { data: userTasks, error: tasksError },
        { data: analysts, error: analystsError },
        { data: absencesToday, error: absencesTodayError }
      ] = await Promise.all([
        // Absence requests
        supabase.from('absence_requests').select('*').eq('analyst_id', user.id).order('created_at', {
          ascending: false
        }),
        // Tasks
        supabase.from('tasks').select('*, assigned_by_profile:profiles!tasks_assigned_by_fkey(name, avatar_url)').eq('assigned_to', user.id).order('created_at', {
          ascending: false
        }),
        // All analysts (team) excluding current user
        supabase.from('profiles').select('*').neq('user_id', user.id).eq('role', 'analyst').eq('status', 'active').order('name'),
        // Approved absences for today (to exclude from online count)
        supabase.from('absence_requests').select('*').in('status', ['approved', 'cancel_requested']).lte('start_date', today).gte('end_date', today)
      ]);

      const firstError = absencesError || tasksError || analystsError || absencesTodayError;
      if (firstError) throw firstError;

      setAbsenceRequests(absences || []);
      setTasks(userTasks || []);
      setOnlineAnalysts(analysts || []);
      setApprovedAbsences(absencesToday || []);
      setLoaded(true);
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
  };
  const markTaskCompleted = async (taskId: string) => {
    try {
      const {
        error
      } = await supabase.from('tasks').update({
        status: 'completed',
        completed_at: new Date().toISOString()
      }).eq('id', taskId);
      if (error) throw error;
      toast({
        title: t.tasks.completedToast,
        description: t.tasks.completedToastBody
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: t.common.error,
        description: t.tasks.updateFailed,
        variant: "destructive"
      });
    }
  };
  const deleteTask = async (taskId: string) => {
    try {
      const {
        error
      } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast({
        title: t.tasks.removedToast,
        description: t.tasks.removedToastBody
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: t.common.error,
        description: t.tasks.removeFailed,
        variant: "destructive"
      });
    }
  };

  const cancelPendingRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('absence_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('status', 'pending');
      if (error) throw error;
      toast({ title: t.absences.toasts.canceled, description: t.absences.toasts.canceledBody });
      fetchData();
    } catch (error) {
      console.error('Error canceling request:', error);
      toast({ title: t.common.error, description: t.absences.toasts.cancelFailed, variant: 'destructive' });
    }
  };

  const requestCancellation = async (requestId: string, reason: string) => {
    try {
      if (!reason || !reason.trim()) {
        toast({ title: t.absences.toasts.reasonRequired, description: t.absences.toasts.reasonRequiredBody });
        return;
      }
      const { error } = await supabase
        .from('absence_requests')
        .update({ status: 'cancel_requested', cancel_reason: reason.trim() })
        .eq('id', requestId)
        .eq('status', 'approved');
      if (error) throw error;
      toast({ title: t.absences.toasts.cancellationRequested, description: t.absences.toasts.cancellationRequestedBody });
      fetchData();
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      toast({ title: t.common.error, description: t.absences.toasts.cancellationFailed, variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);
  const getStatusBadge = (status: string) => ({
    label: (t.absences.status as Record<string, string>)[status] ?? status,
    variant: absenceStatusVariant(status)
  });
  const getTaskStatusBadge = (status: string) => ({
    label: (t.tasks.status as Record<string, string>)[status] ?? status,
    variant: taskStatusVariant(status)
  });
  const dayRange = (request: { start_date: string; end_date: string }) =>
    `${format(parseDay(request.start_date), 'PPP', { locale })} - ${format(parseDay(request.end_date), 'PPP', { locale })}`;
  const dueText = (dueDate: string) => t.tasks.due(format(new Date(dueDate), 'PPp', { locale }));

  // Same definition of "working" as the supervisor dashboard (teamStatus.ts).
  const now = new Date();
  const isAnalystOnline = (analyst: any) => presenceOf(analyst, approvedAbsences, now).presence === 'onShift';
  const range = (start: string | null, end: string | null) => (start && end ? `${String(start).slice(0, 5)} - ${String(end).slice(0, 5)}` : '-');

  const getCurrentShiftInfo = () => {
    if (!userProfile?.work_days) return null;
    // Work-day keys are stored as English short names (mon, tue, ...).
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'short'
    }).toLowerCase();
    const todaySchedule = userProfile.work_days[today];
    if (!todaySchedule?.active) {
      return {
        isWorkDay: false,
        mode: null,
        shift: null
      };
    }
    const formatTime = (time: string) => time.slice(0, 5); // Remove seconds

    return {
      isWorkDay: true,
      mode: todaySchedule.mode,
      shift: `${formatTime(userProfile.start_time)} - ${formatTime(userProfile.end_time)}`
    };
  };
  const shiftInfo = getCurrentShiftInfo();
  const onlineNow = onlineAnalysts.filter((a: any) => isAnalystOnline(a));
  if (loading) {
    return <div className="space-y-6" aria-busy="true" aria-label={t.dashboard.loading}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px] rounded-lg" />)}
        </div>
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>;
  }
  if (loadError && !loaded) {
    return <LoadError onRetry={() => { setLoading(true); fetchData(); }} />;
  }
  const taskAuthor = (task: any) => task.assigned_by === task.assigned_to ? (
    <Badge variant="outline">{t.tasks.selfAssigned}</Badge>
  ) : (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{t.tasks.leadAssignedBy}</span>
      <UserAvatar src={task.assigned_by_profile?.avatar_url} name={task.assigned_by_profile?.name} size="xs" />
      <span>{task.assigned_by_profile?.name}</span>
    </div>
  );
  return <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
            <CardTitle className="text-sm font-medium">{t.dashboard.currentShift}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-semibold">
              {shiftInfo?.isWorkDay ? shiftInfo.shift : t.dashboard.dayOff}
            </div>
            {shiftInfo?.isWorkDay && <div className="flex items-center mt-2">
                {shiftInfo.mode === 'home' ? <Home className="h-4 w-4 mr-1" /> : <Building className="h-4 w-4 mr-1" />}
                <span className="text-sm text-muted-foreground">
                  {shiftInfo.mode === 'home' ? t.workMode.home : t.workMode.office}
                </span>
              </div>}
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab('tasks')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('tasks')} tabIndex={0} className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
            <CardTitle className="text-sm font-medium">{t.dashboard.pendingTasks}</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className={`text-2xl font-semibold ${tasks.filter(task => task.status !== 'completed').length > 0 ? 'text-status-pending-fg' : ''}`}>
              {tasks.filter(task => task.status !== 'completed').length}
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab('absences')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('absences')} tabIndex={0} className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
            <CardTitle className="text-sm font-medium">{t.dashboard.myPendingRequests}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className={`text-2xl font-semibold ${absenceRequests.filter(req => req.status === 'pending').length > 0 ? 'text-status-danger-fg' : ''}`}>
              {absenceRequests.filter(req => req.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab('team')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('team')} tabIndex={0} className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
            <CardTitle className="text-sm font-medium">{t.dashboard.onShiftNow}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className={`text-2xl font-semibold ${onlineNow.length > 0 ? 'text-status-success-fg' : ''}`}>{onlineNow.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">{t.dashboard.tabs.myTasks}</TabsTrigger>
          <TabsTrigger value="absences">{t.dashboard.tabs.absences}</TabsTrigger>
          <TabsTrigger value="team">{t.dashboard.tabs.team}</TabsTrigger>
          <TabsTrigger value="reports">{t.dashboard.tabs.reports}</TabsTrigger>
          <TabsTrigger value="learning">{t.learning.tab}</TabsTrigger>
        </TabsList>

        <TabsContent value="learning" className="space-y-4">
          <LearningTab />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t.tasks.myTitle}</CardTitle>
                <CardDescription>
                  {t.tasks.myDescription}
                </CardDescription>
              </div>
              <Button onClick={() => setShowSelfTaskForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t.tasks.selfAssign}
              </Button>
            </CardHeader>
            <CardContent>
              {tasks.filter(task => task.status !== 'completed').length === 0 ? <p className="text-center text-muted-foreground py-4">
                    {t.tasks.noActive}
                  </p> : <div className="space-y-4">
                    {tasks.filter(task => task.status !== 'completed').map(task => <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg bg-[hsl(var(--panel))]">
                          <div className="flex-1">
                            <h4 className="font-medium">{task.title}</h4>
                            {task.description && <p className="text-sm text-muted-foreground mt-1">
                                {task.description}
                              </p>}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge variant={getTaskStatusBadge(task.status).variant}>
                                  {getTaskStatusBadge(task.status).label}
                                </Badge>
                                {taskAuthor(task)}
                                {task.due_date && (
                                  <span className="text-xs text-muted-foreground">
                                    {dueText(task.due_date)}
                                  </span>
                                )}
                              </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {task.status !== 'completed' && <Button size="sm" onClick={() => markTaskCompleted(task.id)}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {t.tasks.complete}
                              </Button>}
                            {task.status === 'completed' && <Button size="sm" variant="outline" onClick={() => deleteTask(task.id)} className="bg-[hsl(var(--panel))] hover:bg-[hsl(var(--panel))]">
                                <X className="h-4 w-4 mr-1" />
                                {t.tasks.remove}
                              </Button>}
                          </div>
                        </div>)}
                  </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="absences" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t.absences.title}</CardTitle>
                <CardDescription>
                  {t.absences.description}
                </CardDescription>
              </div>
              <Button onClick={() => setShowRequestForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t.absences.newRequest}
              </Button>
            </CardHeader>
            <CardContent>
              {absenceRequests.filter(req => req.status === 'pending' || req.status === 'cancel_requested').length === 0 ? <p className="text-center text-muted-foreground py-4">{t.absences.noPendingMine}</p> : <div className="space-y-4">
                  {absenceRequests.filter(req => req.status === 'pending' || req.status === 'cancel_requested').map(request => <div key={request.id} className="p-4 border rounded-lg bg-[hsl(var(--panel))]">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium">
                              {dayRange(request)}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusBadge(request.status).variant}>
                              {getStatusBadge(request.status).label}
                            </Badge>
                          </div>
                        </div>
                        {request.lead_comment && <div className="mt-3 p-3 bg-muted rounded">
                            <p className="text-sm"><strong>{t.absences.leadComment}</strong> {request.lead_comment}</p>
                          </div>}
                        {request.status === 'pending' && (
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => cancelPendingRequest(request.id)}>
                              {t.absences.cancelRequest}
                            </Button>
                          </div>
                        )}
                      </div>)}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.team.infoTitle}</CardTitle>
              <CardDescription>
                {t.team.infoDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {onlineAnalysts.length === 0 ? <p className="text-center text-muted-foreground py-4">
                  {t.team.noOthers}
                </p> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {onlineAnalysts.map((analyst) => {
                    const info = presenceOf(analyst, approvedAbsences, now);
                    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
                    const todaySchedule = analyst.work_days?.[today];
                    return (
                      <div key={analyst.id} className="p-4 border rounded-lg bg-[hsl(var(--panel))]">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${PRESENCE_DOT[info.presence]}`} aria-hidden />
                          <UserAvatar src={analyst.avatar_url} name={analyst.name} size="sm" />
                          <div>
                            <p className="font-medium">{analyst.name}</p>
                            <p className="text-xs text-muted-foreground">{t.supervisor.presence[info.presence]}</p>
                          </div>
                        </div>
                        {todaySchedule?.active ? (
                          <div className="text-xs text-muted-foreground">
                            <p>{t.team.schedule}: {String(analyst.start_time).slice(0,5)} - {String(analyst.end_time).slice(0,5)}</p>
                            <p>{t.team.lunch}: {range(analyst.lunch_start, analyst.lunch_end)}</p>
                            <p>{t.team.break1}: {range(analyst.break1_start, analyst.break1_end)}</p>
                            <p>{t.team.break2}: {range(analyst.break2_start, analyst.break2_end)}</p>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">{t.team.notScheduled}</div>
                        )}
                      </div>
                    );
                  })}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.tasks.completedTitle}</CardTitle>
              <CardDescription>{t.tasks.completedMine}</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.filter(task => task.status === 'completed').length === 0 ? <p className="text-center text-muted-foreground py-4">{t.tasks.noCompleted}</p> : <div className="space-y-4">
                  {tasks.filter(task => task.status === 'completed').map(task => <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg bg-[hsl(var(--panel))]">
                        <div className="flex-1">
                          <h4 className="font-medium">{task.title}</h4>
                          {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant={getTaskStatusBadge(task.status).variant}>
                              {getTaskStatusBadge(task.status).label}
                            </Badge>
                            {taskAuthor(task)}
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground">
                                {dueText(task.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>)}
                </div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.absences.processedTitle}</CardTitle>
              <CardDescription>{t.absences.processedDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {absenceRequests.filter(req => ['approved', 'rejected', 'cancelled'].includes(req.status)).length === 0 ? <p className="text-center text-muted-foreground py-4">{t.absences.noProcessed}</p> : <div className="space-y-4">
                  {absenceRequests.filter(req => ['approved', 'rejected', 'cancelled'].includes(req.status)).map(request => <div key={request.id} className="p-4 border rounded-lg bg-[hsl(var(--panel))] px-[16px] py-[16px] mx-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium">
                              {dayRange(request)}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                          </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={getStatusBadge(request.status).variant}>
                                {getStatusBadge(request.status).label}
                              </Badge>
                              {request.status === 'approved' && (
                                <Button size="sm" variant="outline" onClick={() => { setSelectedRequestId(request.id); setShowCancelModal(true); }}>
                                  {t.absences.requestCancellation}
                                </Button>
                              )}
                            </div>
                        </div>
                        {request.lead_comment && <div className="mt-3 p-3 bg-muted rounded">
                            <p className="text-sm">
                              <strong>{t.absences.leadComment}</strong> {request.lead_comment}
                            </p>
                          </div>}
                      </div>)}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Team Calendar - Always Visible */}
      <TeamCalendar />

      {/* Absence Request Form Modal */}
      {showRequestForm && <AbsenceRequestForm onClose={() => setShowRequestForm(false)} onSuccess={() => {
      setShowRequestForm(false);
      fetchData();
    }} />}

      {/* Self-Assign Task Form Modal */}
      {showSelfTaskForm && <SelfAssignTaskForm onClose={() => setShowSelfTaskForm(false)} onSuccess={() => {
      setShowSelfTaskForm(false);
      fetchData();
    }} />}

      {/* Cancellation Request Modal */}
      {showCancelModal && selectedRequestId && (
        <CancellationRequestModal
          onClose={() => { setShowCancelModal(false); setSelectedRequestId(null); }}
          onConfirm={async (reason) => {
            await requestCancellation(selectedRequestId, reason);
            setShowCancelModal(false);
            setSelectedRequestId(null);
          }}
        />
      )}
    </div>;
};
