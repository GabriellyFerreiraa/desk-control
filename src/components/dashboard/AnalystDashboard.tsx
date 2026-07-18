import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Home, Building, Users, CheckCircle, AlertCircle, Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AbsenceRequestForm } from '@/components/forms/AbsenceRequestForm';
import { SelfAssignTaskForm } from '@/components/forms/SelfAssignTaskForm';
import { TeamCalendar } from '@/components/calendar/TeamCalendar';
import { UserAvatar } from '@/components/UserAvatar';
import { CancellationRequestModal } from '@/components/modals/CancellationRequestModal';
export const AnalystDashboard = () => {
  const {
    userProfile,
    user
  } = useAuth();
  const [absenceRequests, setAbsenceRequests] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [onlineAnalysts, setOnlineAnalysts] = useState([]);
  const [approvedAbsences, setApprovedAbsences] = useState([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showSelfTaskForm, setShowSelfTaskForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const fetchData = async () => {
    if (!user) return;
    try {
      // Fetch absence requests
      const {
        data: absences
      } = await supabase.from('absence_requests').select('*').eq('analyst_id', user.id).order('created_at', {
        ascending: false
      });

      // Fetch tasks
      const {
        data: userTasks
      } = await supabase.from('tasks').select('*, assigned_by_profile:profiles!tasks_assigned_by_fkey(name, avatar_url)').eq('assigned_to', user.id).order('created_at', {
        ascending: false
      });

      // Fetch all analysts (team) excluding current user
      const { data: analysts } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id);

      // Fetch approved absences for today (to exclude from online count)
      const today = new Date().toISOString().split('T')[0];
      const { data: absencesToday } = await supabase
        .from('absence_requests')
        .select('*')
        .in('status', ['approved', 'cancel_requested'])
        .lte('start_date', today)
        .gte('end_date', today);

      setAbsenceRequests(absences || []);
      setTasks(userTasks || []);
      setOnlineAnalysts(analysts || []);
      setApprovedAbsences(absencesToday || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Could not load data",
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
        title: "Task completed",
        description: "The task has been marked as completed"
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Could not update task",
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
        title: "Task removed",
        description: "The task notification has been removed"
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Could not remove task",
        variant: "destructive"
      });
    }
  };
  const deleteAbsenceRequest = async (requestId: string) => {
    try {
      const {
        error
      } = await supabase.from('absence_requests').delete().eq('id', requestId);
      if (error) throw error;
      toast({
        title: "Request removed",
        description: "The absence request notification has been removed"
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting absence request:', error);
      toast({
        title: "Error",
        description: "Could not remove request",
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
      toast({ title: 'Request canceled', description: 'Your request was canceled before approval.' });
      fetchData();
    } catch (error) {
      console.error('Error canceling request:', error);
      toast({ title: 'Error', description: 'Could not cancel request', variant: 'destructive' });
    }
  };

  const requestCancellation = async (requestId: string, reason: string) => {
    try {
      if (!reason || !reason.trim()) {
        toast({ title: 'Cancellation reason required', description: 'Please enter a reason to proceed.' });
        return;
      }
      const { error } = await supabase
        .from('absence_requests')
        .update({ status: 'cancel_requested', cancel_reason: reason.trim() })
        .eq('id', requestId)
        .eq('status', 'approved');
      if (error) throw error;
      toast({ title: 'Cancellation requested', description: 'Waiting for lead approval.' });
      fetchData();
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      toast({ title: 'Error', description: 'Could not request cancellation', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        label: 'Pending',
        variant: 'secondary' as const
      },
      approved: {
        label: 'Approved',
        variant: 'success' as const
      },
      rejected: {
        label: 'Rejected',
        variant: 'destructive' as const
      },
      cancel_requested: {
        label: 'Cancellation requested',
        variant: 'secondary' as const
      },
      cancelled: {
        label: 'Canceled',
        variant: 'outline' as const
      }
    } as const;
    return (statusConfig as any)[status] || {
      label: status,
      variant: 'outline' as const
    };
  };
  const getTaskStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        label: 'Pending',
        variant: 'secondary' as const
      },
      in_progress: {
        label: 'In progress',
        variant: 'default' as const
      },
      completed: {
        label: 'Completed',
        variant: 'success' as const
      }
    };
    return statusConfig[status] || {
      label: status,
      variant: 'outline' as const
    };
  };

  const isAnalystOnline = (analyst: any) => {
    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    const todaySchedule = analyst.work_days?.[today];
    if (!todaySchedule?.active) return false;

    // Exclude analysts with approved absence today
    const hasAbsenceToday = approvedAbsences.some((a: any) => a.analyst_id === analyst.user_id);
    if (hasAbsenceToday) return false;

    // Check current time within work hours
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const startTime = (analyst.start_time || '09:00').slice(0, 5);
    const endTime = (analyst.end_time || '18:00').slice(0, 5);
    return currentTime >= startTime && currentTime <= endTime;
  };

  const getCurrentShiftInfo = () => {
    if (!userProfile?.work_days) return null;
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
    return <div className="p-6">Loading dashboard...</div>;
  }
  return <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Shift</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shiftInfo?.isWorkDay ? shiftInfo.shift : 'Day off'}
            </div>
            {shiftInfo?.isWorkDay && <div className="flex items-center mt-2">
                {shiftInfo.mode === 'home' ? <Home className="h-4 w-4 mr-1" /> : <Building className="h-4 w-4 mr-1" />}
                <span className="text-sm text-muted-foreground capitalize">
                  {shiftInfo.mode === 'home' ? 'Home' : 'Office'}
                </span>
              </div>}
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab('tasks')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('tasks')} tabIndex={0} className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${tasks.filter(task => task.status !== 'completed').length > 0 ? 'text-[hsl(var(--warning))]' : ''}`}>
              {tasks.filter(task => task.status !== 'completed').length}
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab('absences')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('absences')} tabIndex={0} className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${absenceRequests.filter(req => req.status === 'pending').length > 0 ? 'text-[hsl(var(--destructive))]' : ''}`}>
              {absenceRequests.filter(req => req.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab('team')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('team')} tabIndex={0} className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Analysts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${onlineNow.length > 0 ? 'text-[hsl(var(--success))]' : ''}`}>{onlineNow.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">My Tasks</TabsTrigger>
          <TabsTrigger value="absences">Absence Requests</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Tasks</CardTitle>
                <CardDescription>
                  Tasks assigned to you or self-assigned
                </CardDescription>
              </div>
              <Button onClick={() => setShowSelfTaskForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Self-assign task
              </Button>
            </CardHeader>
            <CardContent>
              {tasks.filter(task => task.status !== 'completed').length === 0 ? <p className="text-center text-muted-foreground py-4">
                    You have no active tasks
                  </p> : <div className="space-y-4">
                    {tasks.filter(task => task.status !== 'completed').map(task => <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg bg-[hsl(var(--panel))]">
                          <div className="flex-1">
                            <h4 className="font-medium">{task.title}</h4>
                            {task.description && <p className="text-sm text-muted-foreground mt-1">
                                {task.description}
                              </p>}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className="bg-orange-500">
                                  {getTaskStatusBadge(task.status).label}
                                </Badge>
                                {task.assigned_by === task.assigned_to ? (
                                  <Badge variant="outline">Self-assigned</Badge>
                                ) : (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Lead-assigned by</span>
                                    <UserAvatar src={task.assigned_by_profile?.avatar_url} name={task.assigned_by_profile?.name} size="xs" />
                                    <span>{task.assigned_by_profile?.name}</span>
                                  </div>
                                )}
                                {task.due_date && (
                                  <span className="text-xs text-muted-foreground">
                                    Due: {format(new Date(task.due_date), 'PPp')}
                                  </span>
                                )}
                              </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {task.status !== 'completed' && <Button size="sm" onClick={() => markTaskCompleted(task.id)}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Complete
                              </Button>}
                            {task.status === 'completed' && <Button size="sm" variant="outline" onClick={() => deleteTask(task.id)} className="bg-[hsl(var(--panel))] hover:bg-[hsl(var(--panel))]">
                                <X className="h-4 w-4 mr-1" />
                                Remove
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
                <CardTitle>Absence Requests</CardTitle>
                <CardDescription>
                  Manage your absence requests
                </CardDescription>
              </div>
              <Button onClick={() => setShowRequestForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </CardHeader>
            <CardContent>
              {absenceRequests.filter(req => req.status === 'pending' || req.status === 'cancel_requested').length === 0 ? <p className="text-center text-muted-foreground py-4">No pending absence requests</p> : <div className="space-y-4">
                  {absenceRequests.filter(req => req.status === 'pending' || req.status === 'cancel_requested').map(request => <div key={request.id} className="p-4 border rounded-lg bg-[hsl(var(--panel))]">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium">
                              {format(new Date(request.start_date), 'PPP')} - {' '}
                              {format(new Date(request.end_date), 'PPP')}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-orange-500">
                              {getStatusBadge(request.status).label}
                            </Badge>
                          </div>
                        </div>
                        {request.lead_comment && <div className="mt-3 p-3 bg-muted rounded">
                            <p className="text-sm"><strong>Lead Comment:</strong> {request.lead_comment}</p>
                          </div>}
                        {request.status === 'pending' && (
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => cancelPendingRequest(request.id)}>
                              Cancel Request
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
              <CardTitle>Team Information</CardTitle>
              <CardDescription>
                Shift information for each analyst
              </CardDescription>
            </CardHeader>
            <CardContent>
              {onlineAnalysts.length === 0 ? <p className="text-center text-muted-foreground py-4">
                  No other analysts connected
                </p> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {onlineAnalysts.map((analyst) => {
                    const isOnline = onlineNow.includes(analyst);
                    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
                    const todaySchedule = analyst.work_days?.[today];
                    return (
                      <div key={analyst.id} className="p-4 border rounded-lg bg-[hsl(var(--panel))]">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`h-3 w-3 rounded-full ring-2 ring-background ${isOnline ? 'bg-[hsl(var(--success))]' : 'bg-muted'}`} />
                          <UserAvatar src={analyst.avatar_url} name={analyst.name} size="sm" />
                          <div>
                            <p className="font-medium">{analyst.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{analyst.role}</p>
                          </div>
                        </div>
                        {todaySchedule?.active ? (
                          <div className="text-xs text-muted-foreground">
                            <p>Schedule: {String(analyst.start_time).slice(0,5)} - {String(analyst.end_time).slice(0,5)}</p>
                            <p>Lunch: {analyst.lunch_start ? String(analyst.lunch_start).slice(0,5) : '—'}</p>
                            <p>Break 1: {analyst.break1_start ? String(analyst.break1_start).slice(0,5) : '—'}</p>
                            <p>Break 2: {analyst.break2_start ? String(analyst.break2_start).slice(0,5) : '—'}</p>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">Not scheduled today</div>
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
              <CardTitle>Completed Tasks</CardTitle>
              <CardDescription>Tasks you have completed</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.filter(task => task.status === 'completed').length === 0 ? <p className="text-center text-muted-foreground py-4">No completed tasks</p> : <div className="space-y-4">
                  {tasks.filter(task => task.status === 'completed').map(task => <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg bg-[hsl(var(--panel))]">
                        <div className="flex-1">
                          <h4 className="font-medium">{task.title}</h4>
                          {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge {...getTaskStatusBadge(task.status)}>
                              {getTaskStatusBadge(task.status).label}
                            </Badge>
                            {task.assigned_by === task.assigned_to ? (
                              <Badge variant="outline">Self-assigned</Badge>
                            ) : (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Lead-assigned by</span>
                                <UserAvatar src={task.assigned_by_profile?.avatar_url} name={task.assigned_by_profile?.name} size="xs" />
                                <span>{task.assigned_by_profile?.name}</span>
                              </div>
                            )}
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground">
                                Due: {format(new Date(task.due_date), 'PPp')}
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
              <CardTitle>Processed Absence Requests</CardTitle>
              <CardDescription>Approved, rejected or cancelled</CardDescription>
            </CardHeader>
            <CardContent>
              {absenceRequests.filter(req => ['approved', 'rejected', 'cancelled'].includes(req.status)).length === 0 ? <p className="text-center text-muted-foreground py-4">No processed requests</p> : <div className="space-y-4">
                  {absenceRequests.filter(req => ['approved', 'rejected', 'cancelled'].includes(req.status)).map(request => <div key={request.id} className="p-4 border rounded-lg bg-[hsl(var(--panel))] px-[16px] py-[16px] mx-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium">
                              {format(new Date(request.start_date), 'PPP')} - {' '}
                              {format(new Date(request.end_date), 'PPP')}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                          </div>
                            <div className="flex items-center gap-2">
                              <Badge {...getStatusBadge(request.status)}>
                                {getStatusBadge(request.status).label}
                              </Badge>
                              {request.status === 'approved' && (
                                <Button size="sm" onClick={() => { setSelectedRequestId(request.id); setShowCancelModal(true); }}>
                                  Request Cancellation
                                </Button>
                              )}
                            </div>
                        </div>
                        {request.lead_comment && <div className="mt-3 p-3 bg-muted rounded">
                            <p className="text-sm">
                              <strong>Lead Comment:</strong> {request.lead_comment}
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