import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppHeader } from '@/components/layout/AppHeader';
import { UsersPanel } from '@/components/admin/UsersPanel';
import { ProjectsPanel } from '@/components/admin/ProjectsPanel';
import { CoursesPanel } from '@/components/admin/CoursesPanel';
import { useT } from '@/i18n/lang';

const TABS = ['users', 'projects', 'courses'] as const;
type Tab = (typeof TABS)[number];

const Admin = () => {
  const t = useT();
  // The tab lives in the URL so "back" from the course editor lands on Courses.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : 'users';

  return <div className="min-h-screen bg-background">
      <AppHeader crumbs={[{ label: t.admin.title }]} />

      <main className="p-4 sm:p-6 max-w-7xl mx-auto">
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
