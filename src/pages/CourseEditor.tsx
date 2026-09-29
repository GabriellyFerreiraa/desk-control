import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { toast } from '@/hooks/use-toast';
import { useLang, useT } from '@/i18n/lang';
import { Localized, cleanLocalized, pickLocalized, sameLocalized } from '@/lib/localized';
import { LocalizedFields } from '@/components/admin/course/LocalizedFields';
import { ModuleEditor } from '@/components/admin/course/ModuleEditor';
import { CourseTree, getPublishProblems, loadCourseTree, moveId } from '@/components/admin/course/courseTree';
import { publishedVariant } from '@/lib/status';

interface Project {
  id: string;
  name: string;
}

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

const CourseEditor = () => {
  const { courseId = '' } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const { lang } = useLang();
  const tc = t.admin.courses;

  const [course, setCourse] = useState<CourseTree | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState<Localized>({});
  const [description, setDescription] = useState<Localized>({});
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [savingDetails, setSavingDetails] = useState(false);
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [problems, setProblems] = useState<string[] | null>(null);
  const [publishing, setPublishing] = useState(false);

  const reload = useCallback(async () => {
    try {
      const tree = await loadCourseTree(courseId);
      setCourse(tree);
    } catch (error) {
      console.error('Error loading course:', error);
      toast({ title: tc.loadFailed, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [courseId, tc.loadFailed]);

  useEffect(() => {
    reload();
    supabase.from('projects').select('id, name').order('name').then(({ data }) => setProjects(data || []));
  }, [reload]);

  // Reset the details form only when the stored values change (see ModuleEditor).
  const savedTitle = JSON.stringify(course?.title ?? {});
  const savedDescription = JSON.stringify(course?.description ?? {});
  const savedProjects = JSON.stringify(course?.projectIds ?? []);
  useEffect(() => setTitle(JSON.parse(savedTitle)), [savedTitle]);
  useEffect(() => setDescription(JSON.parse(savedDescription)), [savedDescription]);
  useEffect(() => setProjectIds(JSON.parse(savedProjects)), [savedProjects]);

  const backToCourses = () => navigate('/admin?tab=courses');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg">{t.common.loading}</div>
      </div>;
  }

  if (!course) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-lg">{tc.notFound}</p>
        <Button variant="outline" onClick={backToCourses}>{tc.backToCourses}</Button>
      </div>;
  }

  const detailsDirty = !sameLocalized(title, course.title)
    || !sameLocalized(description, course.description)
    || !sameIds(projectIds, course.projectIds);

  const saveDetails = async () => {
    setSavingDetails(true);
    try {
      const { error } = await supabase.from('courses')
        .update({ title: cleanLocalized(title), description: cleanLocalized(description) })
        .eq('id', course.id);
      if (error) throw error;

      const removed = course.projectIds.filter((id) => !projectIds.includes(id));
      const added = projectIds.filter((id) => !course.projectIds.includes(id));
      if (removed.length > 0) {
        const { error: removeError } = await supabase.from('course_projects').delete().eq('course_id', course.id).in('project_id', removed);
        if (removeError) throw removeError;
      }
      if (added.length > 0) {
        const { error: addError } = await supabase.from('course_projects').insert(added.map((project_id) => ({ course_id: course.id, project_id })));
        if (addError) throw addError;
      }
      toast({ title: tc.saved });
    } catch (error) {
      console.error('Error saving course:', error);
      toast({ title: tc.saveFailed, variant: 'destructive' });
    } finally {
      setSavingDetails(false);
      reload();
    }
  };

  const setPublished = async (published: boolean) => {
    if (published) {
      if (detailsDirty) {
        toast({ title: tc.unsaved, variant: 'destructive' });
        return;
      }
      const found = getPublishProblems(course, tc);
      if (found.length > 0) {
        setProblems(found);
        return;
      }
    }
    setPublishing(true);
    const { error } = await supabase.from('courses').update({ published }).eq('id', course.id);
    setPublishing(false);
    if (error) {
      console.error('Error publishing course:', error);
      toast({ title: tc.saveFailed, variant: 'destructive' });
      return;
    }
    toast({ title: published ? tc.publishedToast : tc.unpublishedToast });
    reload();
  };

  const addModule = async () => {
    const position = Math.max(-1, ...course.modules.map((m) => m.position)) + 1;
    const { data, error } = await supabase.from('modules').insert({ course_id: course.id, position }).select('id').single();
    if (error) {
      console.error('Error adding module:', error);
      toast({ title: tc.saveFailed, variant: 'destructive' });
      return;
    }
    setOpenModules((prev) => [...prev, data.id]);
    reload();
  };

  const moveModule = async (index: number, direction: -1 | 1) => {
    const next = moveId(course.modules.map((m) => m.id), index, direction);
    if (!next) return;
    const { error } = await supabase.rpc('admin_reorder', { _kind: 'modules', _ids: next });
    if (error) {
      console.error('Error reordering modules:', error);
      toast({ title: tc.saveFailed, variant: 'destructive' });
    }
    reload();
  };

  const courseTitle = pickLocalized(course.title, lang) || tc.untitled;

  return <div className="min-h-screen bg-background">
      <AppHeader crumbs={[{ label: t.admin.title, to: '/admin' }, { label: tc.title, to: '/admin?tab=courses' }, { label: courseTitle }]} />

      <main className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{courseTitle}</h1>
            <Badge variant={publishedVariant(course.published)}>
              {course.published ? tc.published : tc.draft}
            </Badge>
          </div>
          <Button
            variant={course.published ? 'outline' : 'default'}
            onClick={() => setPublished(!course.published)}
            disabled={publishing}
          >
            {course.published ? tc.unpublish : tc.publish}
          </Button>
        </div>
        <Card className="bg-[hsl(var(--panel))]">
          <CardHeader className="bg-[hsl(var(--panel))]">
            <CardTitle>{tc.details}</CardTitle>
            <CardDescription>{tc.langHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 bg-[hsl(var(--panel))]">
            <LocalizedFields id="course-title" label={tc.titleLabel} value={title} onChange={setTitle} disabled={savingDetails} />
            <LocalizedFields id="course-description" label={tc.descriptionLabel} value={description} onChange={setDescription} multiline disabled={savingDetails} />

            <div className="space-y-2">
              <Label>{tc.projectsLabel}</Label>
              <p className="text-xs text-muted-foreground">{tc.projectsHint}</p>
              <div className="flex flex-wrap gap-4">
                {projects.map((project) => {
                  const id = `course-project-${project.id}`;
                  return <div key={project.id} className="flex items-center gap-2">
                      <Checkbox
                        id={id}
                        checked={projectIds.includes(project.id)}
                        onCheckedChange={(checked) => setProjectIds((prev) => (checked === true
                          ? [...prev, project.id]
                          : prev.filter((p) => p !== project.id)))}
                        disabled={savingDetails}
                      />
                      <Label htmlFor={id} className="font-normal cursor-pointer">{project.name}</Label>
                    </div>;
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={saveDetails} disabled={!detailsDirty || savingDetails}>
                {savingDetails ? t.common.saving : tc.saveDetails}
              </Button>
              {detailsDirty && <span className="text-xs text-muted-foreground">{tc.unsaved}</span>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[hsl(var(--panel))]">
          <CardHeader className="bg-[hsl(var(--panel))] flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>{tc.modules}</CardTitle>
              <CardDescription>{tc.modulesHint}</CardDescription>
            </div>
            <Button size="sm" onClick={addModule}>
              <Plus className="h-4 w-4 mr-2" />
              {tc.addModule}
            </Button>
          </CardHeader>
          <CardContent className="bg-[hsl(var(--panel))]">
            {course.modules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{tc.noModules}</p>
            ) : (
              <Accordion type="multiple" value={openModules} onValueChange={setOpenModules}>
                {course.modules.map((module, index) => (
                  <AccordionItem key={module.id} value={module.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left flex-wrap">
                        <span className="text-sm text-muted-foreground">{tc.moduleN(index + 1)}</span>
                        <span className="font-medium">{pickLocalized(module.title, lang) || tc.untitledModule}</span>
                        <span className="text-xs text-muted-foreground font-normal">
                          {tc.materialsCount(module.materials.length)} · {tc.questionsCount(module.questions.length)}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <ModuleEditor
                        courseId={course.id}
                        module={module}
                        index={index}
                        total={course.modules.length}
                        onMove={(direction) => moveModule(index, direction)}
                        onChanged={reload}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={problems !== null} onOpenChange={(open) => !open && setProblems(null)}>
        <DialogContent className="sm:max-w-md bg-[hsl(var(--panel))]">
          <DialogHeader>
            <DialogTitle>{tc.publishBlockedTitle}</DialogTitle>
            <DialogDescription>{tc.publishBlockedBody}</DialogDescription>
          </DialogHeader>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {problems?.map((problem) => <li key={problem}>{problem}</li>)}
          </ul>
          <DialogFooter>
            <Button onClick={() => setProblems(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};

export default CourseEditor;
