import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AppHeader } from '@/components/layout/AppHeader';
import { format } from 'date-fns';
import { useDateLocale } from '@/i18n/dates';
import { CheckCircle2, Circle, FileText, Link2, Lock, PartyPopper, Video } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLang, useT } from '@/i18n/lang';
import { pickLocalized } from '@/lib/localized';
import { openMaterialFile } from '@/lib/learningFiles';
import { VideoPlayer } from '@/components/learning/VideoPlayer';
import { QuizRunner } from '@/components/learning/QuizRunner';
import { PlayCourse, PlayMaterial, QuizResult, loadCoursePlay, pendingMaterials, pickVersion, recordView } from '@/components/learning/learningData';

const KIND_ICONS = { file: FileText, video: Video, link: Link2 };

const CoursePlayer = () => {
  const { courseId = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLang();
  const dateLocale = useDateLocale();
  const t = useT();
  const tl = t.learning;

  const [course, setCourse] = useState<PlayCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openVideoId, setOpenVideoId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return null;
    try {
      const data = await loadCoursePlay(courseId, user.id);
      setCourse(data);
      return data;
    } catch (error) {
      console.error('Error loading course:', error);
      toast({ title: tl.loadFailed, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [courseId, user, tl.loadFailed]);

  useEffect(() => {
    reload().then((data) => {
      if (!data) return;
      // Start on the first open module not yet passed.
      const current = data.modules.find((m) => m.unlocked && !m.passed) ?? data.modules[0];
      setSelectedId(current?.id ?? null);
    });
  }, [reload]);

  const backToList = () => navigate('/dashboard?tab=learning');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg">{t.common.loading}</div>
      </div>;
  }

  if (!course) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-lg">{tl.notFound}</p>
        <Button variant="outline" onClick={backToList}>{tl.back}</Button>
      </div>;
  }

  const selectedIndex = Math.max(0, course.modules.findIndex((m) => m.id === selectedId));
  const selected = course.modules[selectedIndex];
  const nextModule = course.modules[selectedIndex + 1];

  const markMaterial = (materialId: string, patch: Partial<PlayMaterial>) => {
    setCourse((prev) => prev && {
      ...prev,
      modules: prev.modules.map((m) => ({
        ...m,
        materials: m.materials.map((mat) => (mat.id === materialId ? { ...mat, ...patch } : mat)),
      })),
    });
  };

  const openMaterial = async (material: PlayMaterial) => {
    const version = pickVersion(material.versions, lang);
    if (!version) return;
    if (material.kind === 'video') {
      setOpenVideoId((id) => (id === material.id ? null : material.id));
      return;
    }
    try {
      if (material.kind === 'link' && version.url) {
        window.open(version.url, '_blank', 'noopener,noreferrer');
      } else if (version.storage_path) {
        await openMaterialFile(version.storage_path);
      }
      if (await recordView(material.id)) markMaterial(material.id, { completed: true });
    } catch (error) {
      console.error('Error opening material:', error);
      toast({ title: tl.openFailed, variant: 'destructive' });
    }
  };

  const videoProgress = async (material: PlayMaterial, percent: number) => {
    try {
      const done = await recordView(material.id, percent);
      markMaterial(material.id, { watchedPercent: Math.max(material.watchedPercent, percent), completed: done });
    } catch (error) {
      console.error('Error saving video progress:', error);
    }
  };

  const quizFinished = async (result: QuizResult) => {
    if (!result.passed) return;
    await reload();
    if (result.courseCompleted) setShowCompleted(true);
  };

  const goToNextModule = () => {
    if (!nextModule) return;
    setSelectedId(nextModule.id);
    setOpenVideoId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const courseTitle = pickLocalized(course.title, lang);
  const passedCount = course.modules.filter((m) => m.passed).length;

  return <div className="min-h-screen bg-background">
      <AppHeader crumbs={[{ label: t.learning.tab, to: '/dashboard?tab=learning' }, { label: courseTitle }]} />

      <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{courseTitle}</h1>
          {course.completedAt && <Badge variant="success">{tl.completedOn(format(new Date(course.completedAt), 'P', { locale: dateLocale }))}</Badge>}
        </div>
        {pickLocalized(course.description, lang) && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{pickLocalized(course.description, lang)}</p>}
      </div>

      <main className="p-4 sm:p-6 max-w-6xl mx-auto grid gap-6 md:grid-cols-[280px_1fr]">
        {/* Module list */}
        <nav aria-label={courseTitle} className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">{tl.modulesDone(passedCount, course.modules.length)}</p>
          <ol className="space-y-1">
            {course.modules.map((module, index) => {
              const Icon = module.passed ? CheckCircle2 : module.unlocked ? Circle : Lock;
              const active = module.id === selected?.id;
              return <li key={module.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(module.id);
                      setOpenVideoId(null);
                    }}
                    aria-current={active ? 'step' : undefined}
                    className={`w-full flex items-start gap-3 rounded-md p-3 text-left transition-colors ${active ? 'bg-muted' : 'hover:bg-muted/60'}`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${module.passed ? 'text-status-success-fg' : 'text-muted-foreground'}`} />
                    <span className="min-w-0">
                      <span className="block text-xs text-muted-foreground">
                        {tl.moduleN(index + 1)}
                        {!module.unlocked && ` · ${tl.locked}`}
                        {module.passed && ` · ${tl.passed}`}
                      </span>
                      <span className={`block text-sm ${module.unlocked ? 'font-medium' : 'text-muted-foreground'}`}>
                        {pickLocalized(module.title, lang)}
                      </span>
                    </span>
                  </button>
                </li>;
            })}
          </ol>
        </nav>

        {/* Selected module */}
        {selected && <Card>
            <CardHeader>
              <p className="text-xs text-muted-foreground">{tl.moduleN(selectedIndex + 1)}</p>
              <CardTitle className="flex items-center gap-2">
                {pickLocalized(selected.title, lang)}
                {selected.passed && <Badge variant="success">{tl.passed}</Badge>}
              </CardTitle>
              {pickLocalized(selected.description, lang) && <CardDescription className="whitespace-pre-line">
                  {pickLocalized(selected.description, lang)}
                </CardDescription>}
            </CardHeader>
            <CardContent className="space-y-6">
              {!selected.unlocked ? (
                <div className="flex items-center gap-3 rounded-md border p-4 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 shrink-0" />
                  {tl.lockedHint}
                </div>
              ) : <>
                  <section className="space-y-3" aria-labelledby="materials-heading">
                    <div>
                      <h2 id="materials-heading" className="text-sm font-semibold">{tl.materials}</h2>
                      {selected.materials.length > 0 && !selected.passed && <p className="text-xs text-muted-foreground">{tl.materialsHint}</p>}
                    </div>
                    {selected.materials.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{tl.noMaterials}</p>
                    ) : (
                      <ul className="space-y-2">
                        {selected.materials.map((material) => {
                          const Icon = KIND_ICONS[material.kind];
                          const version = pickVersion(material.versions, lang);
                          const isVideoOpen = openVideoId === material.id;
                          return <li key={material.id} className="rounded-md border p-3 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium">{pickLocalized(material.title, lang)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {material.completed
                                        ? tl.done
                                        : material.kind === 'video' && material.watchedPercent > 0
                                          ? tl.watched(material.watchedPercent)
                                          : ''}
                                      {version && version.language !== lang && ` ${tl.otherLanguage(version.language.toUpperCase())}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {material.completed && <CheckCircle2 className="h-4 w-4 text-status-success-fg" aria-label={tl.done} />}
                                  <Button size="sm" variant={material.completed ? 'outline' : 'default'} onClick={() => openMaterial(material)} disabled={!version}>
                                    {material.kind === 'video' ? (isVideoOpen ? tl.hideVideo : tl.watch) : tl.open}
                                  </Button>
                                </div>
                              </div>
                              {isVideoOpen && version?.storage_path && (
                                <VideoPlayer
                                  storagePath={version.storage_path}
                                  initialPercent={material.watchedPercent}
                                  onProgress={(percent) => videoProgress(material, percent)}
                                />
                              )}
                            </li>;
                        })}
                      </ul>
                    )}
                  </section>

                  <Separator />

                  <section className="space-y-3" aria-labelledby="quiz-heading">
                    <h2 id="quiz-heading" className="text-sm font-semibold">{tl.quiz}</h2>
                    <QuizRunner
                      key={selected.id}
                      moduleId={selected.id}
                      passScore={selected.passScore}
                      locked={pendingMaterials(selected).length > 0}
                      passed={selected.passed}
                      bestScore={selected.bestScore}
                      hasNextModule={!!nextModule}
                      onFinished={quizFinished}
                      onNextModule={goToNextModule}
                    />
                  </section>
                </>}
            </CardContent>
          </Card>}
      </main>

      <Dialog open={showCompleted} onOpenChange={setShowCompleted}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <PartyPopper className="h-10 w-10 text-primary mb-2" />
            <DialogTitle>{tl.courseDoneTitle}</DialogTitle>
            <DialogDescription>{tl.courseDoneBody(courseTitle)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleted(false)}>{tl.close}</Button>
            <Button onClick={backToList}>{tl.back}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};

export default CoursePlayer;
