import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AnalystDashboard } from '@/components/dashboard/AnalystDashboard';
import { LeadDashboard } from '@/components/dashboard/LeadDashboard';
import { Button } from '@/components/ui/button';
import { LogOut, User, Settings, ChevronDown, ShieldCheck, Hourglass, Ban } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useT } from '@/i18n/lang';
import { NotificationBell } from '@/components/learning/NotificationBell';
const Dashboard = () => {
  const {
    userProfile,
    signOut,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg">{t.common.loading}</div>
      </div>;
  }
  if (!userProfile) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
          <p className="text-muted-foreground mb-4">
            Please contact the administrator to set up your profile.
          </p>
          <Button onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>;
  }
  if (userProfile.status !== 'active') {
    const isPending = userProfile.status === 'pending';
    const Icon = isPending ? Hourglass : Ban;
    return <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <Icon className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-3">
            {isPending ? t.access.pendingTitle : t.access.inactiveTitle}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isPending ? t.access.pendingBody : t.access.inactiveBody}
          </p>
          <Button onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {t.access.signOut}
          </Button>
        </div>
      </div>;
  }
  const isAdmin = userProfile.role === 'admin';
  // Admins supervise everything, so they get the lead view of the team.
  const seesLeadView = userProfile.role === 'lead' || isAdmin;
  const dashboardLabel = isAdmin ? t.header.adminDashboard : seesLeadView ? t.header.leadDashboard : t.header.analystDashboard;
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6 bg-[hsl(var(--panel))]">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">DeskControl</h1>
            <div className="hidden md:block text-sm text-muted-foreground">
              {dashboardLabel}
            </div>
          </div>

          <div className="flex items-center gap-1">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userProfile.avatar_url} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{userProfile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.roles[userProfile.role as keyof typeof t.roles]}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 border shadow-lg bg-[hsl(var(--panel))]">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{userProfile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.roles[userProfile.role as keyof typeof t.roles]}
                </p>
              </div>

              <DropdownMenuSeparator />

              {isAdmin && <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/admin')}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {t.header.admin}
                </DropdownMenuItem>}

              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                {t.header.settings}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive hover:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t.header.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {seesLeadView ? <LeadDashboard /> : <AnalystDashboard />}
      </main>
    </div>;
};
export default Dashboard;
