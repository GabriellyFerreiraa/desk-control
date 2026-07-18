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
import { TaskAssignmentForm } from '@/components/forms/TaskAssignmentForm';
import { AbsenceApprovalModal } from '@/components/modals/AbsenceApprovalModal';
import { TeamCalendar } from '@/components/calendar/TeamCalendar';
import { ShiftEditForm } from '@/components/forms/ShiftEditForm';
import { UserAvatar } from '@/components/UserAvatar';
export const LeadDashboard = () => {
  const {
    user
  } = useAuth();
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
  const [activeTab, setActiveTab] = useState('requests');
  const fetchData = async () => {
    if (!user) return;
    try {
      // Fetch pending absence requests
      const {
        data: requests
      } = await supabase.from('absence_requests').select('*, analyst_profile:profiles!absence_requests_analyst_id_fkey(name, avatar_url)').in('status', ['pending', 'cancel_requested']).order('created_at', {
        ascending: false
      });

      // Fetch processed (non-pending) absence requests
      const {
        data: processed
      } = await supabase.from('absence_requests').select('*, analyst_profile:profiles!absence_requests_analyst_id_fkey(name, avatar_url)').in('status', ['approved', 'rejected', 'cancelled']).order('updated_at', {
        ascending: false
      });

      // Fetch approved absences for today
      const today = new Date().toISOString().split('T')[0];
      const {
        data: absences
      } = await supabase.from('absence_requests').select('*').eq('status', 'approved').lte('start_date', today).gte('end_date', today);

      // Fetch all tasks
      const {
        data: tasks
      } = await supabase.from('tasks').select('*, assigned_to_profile:profiles!tasks_assigned_to_fkey(name, avatar_url)').order('created_at', {
        ascending: false
      });

      // Fetch all analysts
      const {
        data: allAnalysts
      } = await supabase.from('profiles').select('*').eq('role', 'analyst');

      // Fetch the lead's own profile (for self-service shift editing)
      const {
        data: ownProfile
      } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      setPendingRequests(requests || []);
      setProcessedRequests(processed || []);
      setApprovedAbsences(absences || []);
      setAllTasks(tasks || []);
      setAnalysts(allAnalysts || []);
      setMyProfile(ownProfile || null);
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
        title: "Request approved",
        description: "The absence request has been approved"
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Could not approve request",
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
        title: "Request rejected",
        description: "The absence request has been rejected"
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Could not reject request",
        variant: "destructive"
      });
    }
  };
  const approveCancellation = async (requestId: string, comment = '') => {
    try {
      const { error } = await supabase
        .from('absence_requests')
        .update({ status: 'cancelled', canceled_at: new Date().toISOString(), lead_comment: comment })
        .eq('id', requestId);
      if (error) throw error;
      toast({ title: 'Cancellation approved', description: 'The absence has been canceled.' });
      fetchData();
    } catch (error) {
      console.error('Error approving cancellation:', error);
      toast({ title: 'Error', description: 'Could not approve cancellation', variant: 'destructive' });
    }
  };
  const rejectCancellation = async (requestId: string, comment: string) => {
    try {
      const { error } = await supabase
        .from('absence_requests')
        .update({ status: 'approved', lead_comment: comment })
        .eq('id', requestId);
      if (error) throw error;
      toast({ title: 'Cancellation rejected', description: 'The absence remains approved.' });
      fetchData();
    } catch (error) {
      console.error('Error rejecting cancellation:', error);
      toast({ title: 'Error', description: 'Could not reject cancellation', variant: 'destructive' });
    }
  };
  const deleteAnalyst = async (analystId: string, analystName: string) => {
    if (!confirm(`Are you sure you want to delete ${analystName}? This will permanently remove all their data including tasks and absence requests.`)) {
      return;
    }
    try {
      // Delete all related data first
      await supabase.from('tasks').delete().eq('assigned_to', analystId);
      await supabase.from('absence_requests').delete().eq('analyst_id', analystId);

      // Finally delete the profile
      const {
        error
      } = await supabase.from('profiles').delete().eq('user_id', analystId);
      if (error) throw error;
      toast({
        title: "Analyst deleted",
        description: `${analystName} has been successfully removed from the system`
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting analyst:', error);
      toast({
        title: "Error",
        description: "Could not delete analyst",
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
        label: 'Pending',
        variant: 'secondary' as const,
        className: 'bg-orange-500 text-white'
      },
      in_progress: {
        label: 'In progress',
        variant: 'default' as const,
        className: ''
      },
      completed: {
        label: 'Completed',
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
        label: 'Approved',
        variant: 'success' as const
      },
      rejected: {
        label: 'Rejected',
        variant: 'destructive' as const
      },
      cancelled: {
        label: 'Cancelled',
        variant: 'outline' as const
      },
      pending: {
        label: 'Pending',
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
    return <div className="p-6">Loading dashboard...</div>;
  }
  return <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card onClick={() => setActiveTab('requests')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('requests')} tabIndex={0} className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${pendingRequests.length > 0 ? 'text-[hsl(var(--destructive))]' : ''}`}>{pendingRequests.length}</div>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab('tasks')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('tasks')} tabIndex={0} className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
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
            <CardTitle className="text-sm font-medium">Online Analysts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${onlineAnalysts.length > 0 ? 'text-[hsl(var(--success))]' : ''}`}>{onlineAnalysts.length}</div>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab('team')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('team')} tabIndex={0} className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analysts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Absence Requests</TabsTrigger>
          <TabsTrigger value="tasks">Task Management</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Absence Requests</CardTitle>
              <CardDescription>
                Requests that require your approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? <p className="text-center text-muted-foreground py-4">No pending requests</p> : <div className="space-y-4">
                  {pendingRequests.map(request => <div key={request.id} className="p-4 border rounded-lg bg-[hsl(var(--panel))]">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <UserAvatar src={request.analyst_profile?.avatar_url} name={request.analyst_profile?.name} size="sm" />
                            <h4 className="font-medium">{request.analyst_profile?.name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(request.start_date), 'PPP')} - {' '}
                            {format(new Date(request.end_date), 'PPP')}
                          </p>
                          <p className="text-sm mt-1">{request.reason}</p>
                        </div>
                        <Badge variant="secondary" className="bg-orange-500">{request.status === 'cancel_requested' ? 'Cancellation requested' : 'Pending'}</Badge>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={() => setSelectedRequest(request)}>
                          Review
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
                <CardTitle>Task Management</CardTitle>
                <CardDescription>
                  Assign and supervise team tasks
                </CardDescription>
              </div>
              <Button onClick={() => setShowTaskForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Task
              </Button>
            </CardHeader>
            <CardContent>
              {allTasks.filter(task => task.status === 'pending').length === 0 ? <p className="text-center text-muted-foreground py-4">
                  No pending tasks
                </p> : <div className="space-y-4">
                  {allTasks.filter(task => task.status === 'pending').map(task => <div key={task.id} className="p-4 border rounded-lg bg-[hsl(var(--panel))]">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span>Assigned to:</span>
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
                            {task.assigned_by === task.assigned_to ? 'Self-assigned' : 'Lead-assigned'}
                          </Badge>
                        </div>
                      </div>
                      {task.due_date && <p className="text-xs text-muted-foreground">
                          Due: {format(new Date(task.due_date), 'PPp')}
                        </p>}
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Shift</CardTitle>
              <CardDescription>
                Your own work schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myProfile ? <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    <p>Schedule: {myProfile.start_time} - {myProfile.end_time}</p>
                    <p>Lunch: {myProfile.lunch_start} - {myProfile.lunch_end}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedAnalyst(myProfile)}>
                    Edit My Schedule
                  </Button>
                </div> : <p className="text-sm text-muted-foreground">Loading your schedule...</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Status</CardTitle>
              <CardDescription>
                General view of the analyst team
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
                               {isOnline ? 'Online' : 'Offline'}
                             </p>
                           </div>
                         </div>
                       </div>
                       {todaySchedule?.active && <div className="text-sm text-muted-foreground mb-3">
                           <p>Schedule: {analyst.start_time} - {analyst.end_time}</p>
                           <p>Mode: {todaySchedule.mode === 'home' ? 'Home' : 'Office'}</p>
                         </div>}
                       {!todaySchedule?.active && <div className="text-sm text-muted-foreground mb-3">
                           <p>Not scheduled today</p>
                         </div>}
                        <div className="space-y-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedAnalyst(analyst)} className="w-full">
                            Edit Schedule
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteAnalyst(analyst.user_id, analyst.name)} className="w-full">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Analyst
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
              <CardTitle>Completed Tasks</CardTitle>
              <CardDescription>All tasks marked as completed</CardDescription>
            </CardHeader>
            <CardContent>
              {allTasks.filter(task => task.status === 'completed').length === 0 ? <p className="text-center text-muted-foreground py-4">No completed tasks</p> : <div className="space-y-4">
                  {allTasks.filter(task => task.status === 'completed').map(task => <div key={task.id} className="p-4 border rounded-lg bg-[hsl(var(--panel))]">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{task.title}</h4>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <span>Assigned to:</span>
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
                              {task.assigned_by === task.assigned_to ? 'Self-assigned' : 'Lead-assigned'}
                            </Badge>
                          </div>
                        </div>
                        {task.due_date && <p className="text-xs text-muted-foreground">
                            Due: {format(new Date(task.due_date), 'PPp')}
                          </p>}
                      </div>)}
                </div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Processed Absence Requests</CardTitle>
              <CardDescription>Approved, rejected or canceled</CardDescription>
            </CardHeader>
            <CardContent>
              {processedRequests.length === 0 ? <p className="text-center text-muted-foreground py-4">No processed requests</p> : <div className="space-y-4">
                  {processedRequests.map(request => <div key={request.id} className="p-4 border rounded-lg bg-[hsl(var(--panel))]">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <UserAvatar src={request.analyst_profile?.avatar_url} name={request.analyst_profile?.name} size="xs" />
                            <h4 className="font-medium">{request.analyst_profile?.name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(request.start_date), 'PPP')} - {' '}
                            {format(new Date(request.end_date), 'PPP')}
                          </p>
                          <p className="text-sm mt-1">{request.reason}</p>
                        </div>
                        <Badge {...getAbsenceStatusBadge(request.status)}>
                          {getAbsenceStatusBadge(request.status).label}
                        </Badge>
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