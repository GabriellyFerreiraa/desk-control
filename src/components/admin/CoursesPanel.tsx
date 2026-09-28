import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLang, useT } from '@/i18n/lang';
import { asLocalized, pickLocalized } from '@/lib/localized';
import { removeMaterialFiles } from '@/lib/learningFiles';
import { ConfirmAction } from './course/ConfirmAction';

interface CourseRow {
  id: string;
  title: Json;
  published: boolean;
  updated_at: string;
  course_projects: { project_id: string }[];
  modules: { count: number }[];
}

export const CoursesPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT();
  const tc = t.admin.courses;
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const [{ data: courseRows, error: coursesError }, { data: projectRows, error: projectsError }] = await Promise.all([
        supabase
          .from('courses')
          .select('id, title, published, updated_at, course_projects(project_id), modules(count)')
          .order('created_at', { ascending: false }),
        supabase.from('projects').select('id, name'),
      ]);
      if (coursesError || projectsError) throw coursesError || projectsError;
      setCourses((courseRows || []) as unknown as CourseRow[]);
      setProjectNames(Object.fromEntries((projectRows || []).map((p) => [p.id, p.name])));
    } catch (error) {
      console.error('Error loading courses:', error);
      toast({ title: tc.loadFailed, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createCourse = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.from('courses').insert({ created_by: user?.id }).select('id').single();
      if (error) throw error;
      navigate(`/admin/courses/${data.id}`);
    } catch (error) {
      console.error('Error creating course:', error);
      toast({ title: tc.createFailed, variant: 'destructive' });
      setCreating(false);
    }
  };

  const deleteCourse = async (course: CourseRow) => {
    try {
      // Collect uploaded files first: the rows that point to them are
      // removed by the cascade.
      const { data: files, error: filesError } = await supabase
        .from('modules')
        .select('module_materials(material_versions(storage_path))')
        .eq('course_id', course.id);
      if (filesError) throw filesError;
      const paths = ((files || []) as unknown as { module_materials: { material_versions: { storage_path: string | null }[] }[] }[])
        .flatMap((m) => m.module_materials.flatMap((mat) => mat.material_versions.map((v) => v.storage_path)));

      const { error } = await supabase.from('courses').delete().eq('id', course.id);
      if (error) throw error;
      await removeMaterialFiles(paths);

      setCourses((prev) => prev.filter((c) => c.id !== course.id));
      toast({ title: tc.deleted });
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({ title: tc.deleteFailed, variant: 'destructive' });
    }
  };

  return <Card className="bg-[hsl(var(--panel))]">
      <CardHeader className="bg-[hsl(var(--panel))] flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{tc.title}</CardTitle>
          <CardDescription>{tc.description}</CardDescription>
        </div>
        <Button onClick={createCourse} size="sm" disabled={creating}>
          <Plus className="h-4 w-4 mr-2" />
          {tc.new}
        </Button>
      </CardHeader>
      <CardContent className="bg-[hsl(var(--panel))]">
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t.common.loading}</p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{tc.empty}</p>
        ) : (
          <ul className="divide-y">
            {courses.map((course) => {
              const title = pickLocalized(asLocalized(course.title), lang) || tc.untitled;
              const projects = course.course_projects.map((cp) => projectNames[cp.project_id]).filter(Boolean);
              const moduleCount = course.modules[0]?.count ?? 0;
              return <li key={course.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <BookOpen className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{title}</span>
                        <Badge variant={course.published ? 'default' : 'outline'}>
                          {course.published ? tc.published : tc.draft}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tc.modulesCount(moduleCount)} · {projects.length > 0 ? projects.join(', ') : tc.noProjects} · {format(new Date(course.updated_at), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/courses/${course.id}`)} aria-label={`${tc.edit}: ${title}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmAction
                      trigger={<Button variant="outline" size="sm" aria-label={`${tc.delete}: ${title}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>}
                      title={tc.deleteTitle}
                      description={tc.deleteBody}
                      confirmLabel={tc.confirmDelete}
                      onConfirm={() => deleteCourse(course)}
                    />
                  </div>
                </li>;
            })}
          </ul>
        )}
      </CardContent>
    </Card>;
};
