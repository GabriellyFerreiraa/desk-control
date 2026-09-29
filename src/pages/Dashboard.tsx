import { useAuth } from '@/hooks/useAuth';
import { AnalystDashboard } from '@/components/dashboard/AnalystDashboard';
import { LeadDashboard } from '@/components/dashboard/LeadDashboard';
import { Button } from '@/components/ui/button';
import { LogOut, Hourglass, Ban } from 'lucide-react';
import { useT } from '@/i18n/lang';
import { AppHeader } from '@/components/layout/AppHeader';
const Dashboard = () => {
  const {
    userProfile,
    signOut,
    loading
  } = useAuth();
  const t = useT();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg">{t.common.loading}</div>
      </div>;
  }
  if (!userProfile) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t.profileMissing.title}</h1>
          <p className="text-muted-foreground mb-4">
            {t.profileMissing.body}
          </p>
          <Button onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {t.profileMissing.signOut}
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
      <AppHeader crumbs={[{ label: dashboardLabel }]} />
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
        {seesLeadView ? <LeadDashboard /> : <AnalystDashboard />}
      </main>
    </div>;
};
export default Dashboard;
