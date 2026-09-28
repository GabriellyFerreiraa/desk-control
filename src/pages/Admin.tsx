import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { UsersPanel } from '@/components/admin/UsersPanel';
import { ProjectsPanel } from '@/components/admin/ProjectsPanel';
import { CoursesPanel } from '@/components/admin/CoursesPanel';
import { useT } from '@/i18n/lang';

const TABS = ['users', 'projects', 'courses'] as const;
type Tab = (typeof TABS)[number];

const Admin = () => {
  const navigate = useNavigate();
  const t = useT();
  // The tab lives in the URL so "back" from the course editor lands on Courses.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : 'users';

  return <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6 bg-[hsl(var(--panel))]">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.header.backToDashboard}
            </Button>
            <h1 className="text-xl font-bold">{t.admin.title}</h1>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <Tabs value={tab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })} className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">{t.admin.tabUsers}</TabsTrigger>
            <TabsTrigger value="projects">{t.admin.tabProjects}</TabsTrigger>
            <TabsTrigger value="courses">{t.admin.tabCourses}</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersPanel />
          </TabsContent>

          <TabsContent value="projects">
            <ProjectsPanel />
          </TabsContent>

          <TabsContent value="courses">
            <CoursesPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>;
};

export default Admin;
