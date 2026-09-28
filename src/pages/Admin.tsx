import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { UsersPanel } from '@/components/admin/UsersPanel';
import { ProjectsPanel } from '@/components/admin/ProjectsPanel';
import { useT } from '@/i18n/lang';

const Admin = () => {
  const navigate = useNavigate();
  const t = useT();

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
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">{t.admin.tabUsers}</TabsTrigger>
            <TabsTrigger value="projects">{t.admin.tabProjects}</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersPanel />
          </TabsContent>

          <TabsContent value="projects">
            <ProjectsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>;
};

export default Admin;
