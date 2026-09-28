import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, CheckCircle, AlertCircle, Plus, Clock, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { parseDay, useDateLocale } from '@/i18n/dates';
import { TaskAssignmentForm } from '@/components/forms/TaskAssignmentForm';
import { AbsenceApprovalModal } from '@/components/modals/AbsenceApprovalModal';
import { TeamCalendar } from '@/components/calendar/TeamCalendar';
import { ShiftEditForm } from '@/components/forms/ShiftEditForm';
import { UserAvatar } from '@/components/UserAvatar';
import { ProgressReport } from '@/components/learning/ProgressReport';
import { useSearchParams } from 'react-router-dom';
import { useT } from '@/i18n/lang';
export const LeadDashboard = () => {
  const {
    user
  } = useAuth();
  const t = useT();
  const locale = useDateLocale();
  // ?tab=learning-progress opens the report (used by the notification bell).
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [analysts, setAnalysts] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [approvedAbsences, setApprovedAbsences] = useState([]);
  const [processedRequests, setProcessedRequests] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedAnalyst, setSelectedAnalyst] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(requestedTab || 'requests');
  useEffect(() => {
    if (requestedTab) setActiveTab(requestedTab);
  }, [requestedTab]);
  const fetchData = async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const [
        { data: requests, error: requestsError },
        { data: processed, error: processedError },
        { data: absences, error: absencesError },
        { data: tasks, error: tasksError },
        { data: allAnalysts, error: analystsError },
        { data: ownProfile, error: ownProfileError }
      ] = await Promise.all([
        // Pending absence requests
        supabase.from('absence_requests').select('*, analyst_profile:profiles!absence_requests_analyst_id_fkey(name, avatar_url)').in('status', ['pending', 'cancel_requested']).order('created_at', {
          ascending: false
        }),
        // Processed (non-pending) absence requests
        supabase.from('absence_requests').select('*, analyst_profile:profiles!absence_requests_analyst_id_fkey(name, avatar_url)').in('status', ['approved', 'rejected', 'cancelled']).order('updated_at', {
          ascending: false
        }),
        // Approved absences for today
        supabase.from('absence_requests').select('*').eq('status', 'approved').lte('start_date', today).gte('end_date', today),
        // All tasks
        supabase.from('tasks').select('*, assigned_to_profile:profiles!tasks_assigned_to_fkey(name, avatar_url)').order('created_at', {
          ascending: false
        }),
        // All analysts
        supabase.from('profiles').select('*').eq('role', 'analyst'),
        // The lead's own profile (for self-service shift editing)
        supabase.from('profiles').select('*').eq('user_id', user.id).single()
      ]);

      const firstError = requestsError || processedError || absencesError || tasksError || analystsError || ownProfileError;
      if (firstError) throw firstError;

      setPendingRequests(requests || []);
      setProcessedRequests(processed || []);
      setApprovedAbsences(absences || []);
      setAllTasks(tasks || []);
      setAnalysts(allAnalysts || []);
      setMyProfile(ownProfile || null);
    } catch (error) {
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
      fetchData(); // Refresh data
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
      fetchData(); // Refresh data
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
    if (!confirm(t.team.deleteConfirm(analystName))) {
      return;
    }
    try {
      // tasks.assigned_to and absence_requests.analyst_id both have
      // ON DELETE CASCADE to profiles.user_id, so deleting the profile
      // row alone removes their tasks/absence requests atomically —
      // no need for separate client-side delete calls.
      const {
        error
      } = await supabase.from('profiles').delete().eq('user_id', analystId);
      if (error) throw error;
      toast({
        title: t.team.deleted,
        description: t.team.deletedBody(analystName)
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting analyst:', error);
      toast({
        title: t.common.error,
        description: t.team.deleteFailed,
        variant: "destructive"
      });
    }
  };
  useEffect(() => {
    fetchData();
  }, [user]);
  const getTaskStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        label: t.tasks.status.pending,
        variant: 'secondary' as const,
        className: 'bg-orange-500 text-white'
      },
      in_progress: {
        label: t.tasks.status.in_progress,
        variant: 'default' as const,
        className: ''
      },
      completed: {
        label: t.tasks.status.completed,
        variant: 'success' as const,
        className: ''
      }
    } as const;
    return (statusConfig as any)[status] || {
      label: status,
      variant: 'outline' as const,
      className: ''
    };
  };
  const getAbsenceStatusBadge = (status: string) => {
    const statusConfig = {
      approved: {
        label: t.absences.status.approved,
        variant: 'success' as const
      },
      rejected: {
        label: t.absences.status.rejected,
        variant: 'destructive' as const
      },
      cancelled: {
        label: t.absences.status.cancelled,
        variant: 'outline' as const
      },
      pending: {
        label: t.absences.status.pending,
        variant: 'secondary' as const
      }
    } as const;
    return (statusConfig as any)[status] || {
      label: status,
      variant: 'outline' as const
    };
  };
  const isAnalystOnline = (analyst: any) => {
    const now = new Date();
    const today = now.toLocaleDateString('en-US', {
      weekday: 'short'
    }).toLowerCase();
    const todaySchedule = analyst.work_days?.[today];

    // Check if analyst is scheduled to work today
    if (!todaySchedule?.active) return false;

    // Check if analyst has an approved absence for today
    const hasAbsenceToday = approvedAbsences.some(absence => absence.analyst_id === analyst.user_id);
    if (hasAbsenceToday) return false;

    // Check if current time is within work hours
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const startTime = analyst.start_time || '09:00';
    const endTime = analyst.end_time || '18:00';
    return currentTime >= startTime && currentTime <= endTime;
  };
  const getOnlineAnalysts = () => {
    return analysts.filter(analyst => isAnalystOnline(analyst));
  };
  const onlineAnalysts = getOnlineAnalysts();
  if (loading) {
    return <div className="p-6">{t.dashboard.loading}</div>;
  }
  return <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card onClick={() => setActiveTab('requests')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('requests')} tabIndex={0} className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.pendingRequests}</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${pendingRequests.length > 0 ? 'text-[hsl(var(--destructive))]' : ''}`}>{pendingRequests.length}</div>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab('tasks')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('tasks')} tabIndex={0} className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.activeTasks}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${allTasks.filter(task => task.status !== 'completed').length > 0 ? 'text-[hsl(var(--warning))]' : ''}`}>
              {allTasks.filter(task => task.status !== 'completed').length}
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab('team')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('team')} tabIndex={0} className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.onlineAnalysts}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${onlineAnalysts.length > 0 ? 'text-[hsl(var(--success))]' : ''}`}>{onlineAnalysts.length}</div>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab('team')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('team')} tabIndex={0} className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.totalAnalysts}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="requests">{t.dashboard.tabs.absences}</TabsTrigger>
          <TabsTrigger value="tasks">{t.dashboard.tabs.taskManagement}</TabsTrigger>
          <TabsTrigger value="team">{t.dashboard.tabs.team}</TabsTrigger>
          <TabsTrigger value="reports">{t.dashboard.tabs.reports}</TabsTrigger>
          <TabsTrigger value="learning-progress">{t.progress.tab}</TabsTrigger>
        </TabsList>

        <TabsContent value="learning-progress" className="space-y-4">
          <ProgressReport />
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.absences.pendingTitle}</CardTitle>
              <CardDescription>
                {t.absences.pendingDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? <p className="text-center text-muted-foreground py-4">{t.absences.noPending}</p> : <div className="space-y-4">
                  {pendingRequests.map(request => <div key={request.id} className="p-4 border rounded-lg bg-[hsl(var(--panel))]">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <UserAvatar src={request.analyst_profile?.avatar_url} name={request.analyst_profile?.name} size="sm" />
                            <h4 className="font-medium">{request.analyst_profile?.name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(parseDay(request.start_date), 'PPP', { locale })} - {' '}
                            {format(parseDay(request.end_date), 'PPP', { locale })}
                          </p>
                          <p className="text-sm mt-1">{request.reason}</p>
                        </div>
                        <Badge variant="secondary" className="bg-orange-500">{request.status === 'cancel_requested' ? t.absences.status.cancel_requested : t.absences.status.pending}</Badge>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={() => setSelectedRequest(request)}>
                          {t.absences.review}
                        </Button>
                      </div>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t.tasks.managementTitle}</CardTitle>
                <CardDescription>
                  {t.tasks.managementDescription}
                </CardDescription>
              </div>
              <Button onClick={() => setShowTaskForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t.tasks.assign}
              </Button>
            </CardHeader>
            <CardContent>
              {allTasks.filter(task => task.status === 'pending').length === 0 ? <p className="text-center text-muted-foreground py-4">
                  {t.tasks.noPending}
                </p> : <div className="space-y-4">
                  {allTasks.filter(task => task.status === 'pending').map(task => <div key={task.id} className="p-4 border rounded-lg bg-[hsl(var(--panel))]">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span>{t.tasks.assignedTo}</span>
                            <UserAvatar src={task.assigned_to_profile?.avatar_url} name={task.assigned_to_profile?.name} size="xs" />
                            <span>{task.assigned_to_profile?.name}</span>
                          </div>
                          {task.description && <p className="text-sm mt-1">{task.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge {...getTaskStatusBadge(task.status)}>
                            {getTaskStatusBadge(task.status).label}
                          </Badge>
                          <Badge variant="outline">
                            {task.assigned_by === task.assigned_to ? t.tasks.selfAssigned : t.tasks.leadAssigned}
                          </Badge>
                        </div>
                      </div>
                      {task.due_date && <p className="text-xs text-muted-foreground">
                          {t.tasks.due(format(new Date(task.due_date), 'PPp', { locale }))}
                        </p>}
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.team.myShiftTitle}</CardTitle>
              <CardDescription>
                {t.team.myShiftDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myProfile ? <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    <p>{t.team.schedule}: {String(myProfile.start_time).slice(0, 5)} - {String(myProfile.end_time).slice(0, 5)}</p>
                    <p>{t.team.lunch}: {myProfile.lunch_start ? String(myProfile.lunch_start).slice(0, 5) : '-'} - {myProfile.lunch_end ? String(myProfile.lunch_end).slice(0, 5) : '-'}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedAnalyst(myProfile)}>
                    {t.team.editMySchedule}
                  </Button>
                </div> : <p className="text-sm text-muted-foreground">{t.team.loadingSchedule}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.team.statusTitle}</CardTitle>
              <CardDescription>
                {t.team.statusDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {analysts.map(analyst => {
                const isOnline = onlineAnalysts.includes(analyst);
                const today = new Date().toLocaleDateString('en-US', {
                  weekday: 'short'
                }).toLowerCase();
                const todaySchedule = analyst.work_days?.[today];
                return <div key={analyst.id} className={`group p-5 md:p-6 border rounded-xl bg-card shadow-sm transition-colors hover:border-primary/30 ${!isOnline ? '' : ''}`}>
                       <div className="flex items-center gap-3 mb-4">
                         <div className={`h-3.5 w-3.5 rounded-full ring-2 ring-background ${isOnline ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                         <div className="flex items-center gap-2">
                           <UserAvatar src={analyst.avatar_url} name={analyst.name} size="sm" />
                           <div>
                             <p className="font-semibold text-base leading-tight">{analyst.name}</p>
                             <p className="text-xs text-muted-foreground/90">
                               {isOnline ? t.team.online : t.team.offline}
                             </p>
                           </div>
                         </div>
                       </div>
                       {todaySchedule?.active && <div className="text-sm text-muted-foreground mb-3">
                           <p>{t.team.schedule}: {String(analyst.start_time).slice(0, 5)} - {String(analyst.end_time).slice(0, 5)}</p>
                           <p>{t.team.mode}: {todaySchedule.mode === 'home' ? t.workMode.home : t.workMode.office}</p>
                         </div>}
                       {!todaySchedule?.active && <div className="text-sm text-muted-foreground mb-3">
                           <p>{t.team.notScheduled}</p>
                         </div>}
                        <div className="space-y-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedAnalyst(analyst)} className="w-full">
                            {t.team.editSchedule}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteAnalyst(analyst.user_id, analyst.name)} className="w-full">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t.team.deleteAnalyst}
                          </Button>
                        </div>
                     </div>;
              })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.tasks.completedTitle}</CardTitle>
              <CardDescription>{t.tasks.completedAll}</CardDescription>
            </CardHeader>
            <CardContent>
              {allTasks.filter(task => task.status === 'completed').length === 0 ? <p className="text-center text-muted-foreground py-4">{t.tasks.noCompleted}</p> : <div className="space-y-4">
                  {allTasks.filter(task => task.status === 'completed').map(task => <div key={task.id} className="p-4 border rounded-lg bg-[hsl(var(--panel))]">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{task.title}</h4>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <span>{t.tasks.assignedTo}</span>
                              <UserAvatar src={task.assigned_to_profile?.avatar_url} name={task.assigned_to_profile?.name} size="xs" />
                              <span>{task.assigned_to_profile?.name}</span>
                            </div>
                            {task.description && <p className="text-sm mt-1">{task.description}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge {...getTaskStatusBadge(task.status)}>
                              {getTaskStatusBadge(task.status).label}
                            </Badge>
                            <Badge variant="outline">
                              {task.assigned_by === task.assigned_to ? t.tasks.selfAssigned : t.tasks.leadAssigned}
                            </Badge>
                          </div>
                        </div>
                        {task.due_date && <p className="text-xs text-muted-foreground">
                            {t.tasks.due(format(new Date(task.due_date), 'PPp', { locale }))}
                          </p>}
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
              {processedRequests.length === 0 ? <p className="text-center text-muted-foreground py-4">{t.absences.noProcessed}</p> : <div className="space-y-4">
                  {processedRequests.map(request => <div key={request.id} className="p-4 border rounded-lg bg-[hsl(var(--panel))]">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <UserAvatar src={request.analyst_profile?.avatar_url} name={request.analyst_profile?.name} size="xs" />
                            <h4 className="font-medium">{request.analyst_profile?.name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(parseDay(request.start_date), 'PPP', { locale })} - {' '}
                            {format(parseDay(request.end_date), 'PPP', { locale })}
                          </p>
                          <p className="text-sm mt-1">{request.reason}</p>
                        </div>
                        <Badge {...getAbsenceStatusBadge(request.status)}>
                          {getAbsenceStatusBadge(request.status).label}
                        </Badge>
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