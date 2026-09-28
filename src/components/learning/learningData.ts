import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { DEFAULT_LANG, Lang } from '@/i18n/strings';
import { Localized, asLocalized } from '@/lib/localized';

type MaterialKind = Database['public']['Enums']['material_kind'];
type QuestionType = Database['public']['Enums']['question_type'];

// ---------------------------------------------------------------------------
// Course list
// ---------------------------------------------------------------------------

export type CourseStatus = 'notStarted' | 'inProgress' | 'completed';

export interface CourseSummary {
  id: string;
  title: Localized;
  description: Localized;
  totalModules: number;
  passedModules: number;
  status: CourseStatus;
  completedAt: string | null;
}

export const loadMyCourses = async (userId: string): Promise<CourseSummary[]> => {
  const [coursesRes, progressRes, enrollmentsRes] = await Promise.all([
    supabase.from('courses').select('id, title, description, modules(id)').eq('published', true).order('created_at'),
    supabase.from('module_progress').select('module_id').eq('user_id', userId),
    supabase.from('course_enrollments').select('course_id, completed_at').eq('user_id', userId),
  ]);
  const error = coursesRes.error || progressRes.error || enrollmentsRes.error;
  if (error) throw error;

  const passed = new Set((progressRes.data || []).map((p) => p.module_id));
  const enrollments = new Map((enrollmentsRes.data || []).map((e) => [e.course_id, e.completed_at]));

  return (coursesRes.data || []).map((course) => {
    const moduleIds = (course.modules as { id: string }[]).map((m) => m.id);
    const completedAt = enrollments.get(course.id) ?? null;
    const status: CourseStatus = completedAt ? 'completed' : enrollments.has(course.id) ? 'inProgress' : 'notStarted';
    return {
      id: course.id,
      title: asLocalized(course.title),
      description: asLocalized(course.description),
      totalModules: moduleIds.length,
      passedModules: moduleIds.filter((id) => passed.has(id)).length,
      status,
      completedAt,
    };
  });
};

// ---------------------------------------------------------------------------
// Course player
// ---------------------------------------------------------------------------

export interface PlayVersion {
  id: string;
  language: string;
  url: string | null;
  storage_path: string | null;
  file_name: string | null;
}

export interface PlayMaterial {
  id: string;
  kind: MaterialKind;
  title: Localized;
  versions: PlayVersion[];
  completed: boolean;
  watchedPercent: number;
}

export interface PlayModule {
  id: string;
  title: Localized;
  description: Localized;
  passScore: number;
  materials: PlayMaterial[];
  passed: boolean;
  unlocked: boolean;
}

export interface PlayCourse {
  id: string;
  title: Localized;
  description: Localized;
  completedAt: string | null;
  modules: PlayModule[];
}

interface RawPlayCourse {
  id: string;
  title: Json;
  description: Json;
  modules: {
    id: string;
    position: number;
    title: Json;
    description: Json;
    quizzes: { pass_score: number } | { pass_score: number }[] | null;
    module_materials: {
      id: string;
      position: number;
      kind: MaterialKind;
      title: Json;
      material_versions: PlayVersion[];
    }[];
  }[];
}

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

export const loadCoursePlay = async (courseId: string, userId: string): Promise<PlayCourse | null> => {
  const [courseRes, progressRes, viewsRes, enrollmentRes] = await Promise.all([
    supabase
      .from('courses')
      .select(`
        id, title, description,
        modules(
          id, position, title, description,
          quizzes(pass_score),
          module_materials(id, position, kind, title, material_versions(id, language, url, storage_path, file_name))
        )
      `)
      .eq('id', courseId)
      .eq('published', true)
      .maybeSingle(),
    supabase.from('module_progress').select('module_id').eq('user_id', userId),
    supabase.from('material_views').select('material_id, completed, watched_percent').eq('user_id', userId),
    supabase.from('course_enrollments').select('completed_at').eq('user_id', userId).eq('course_id', courseId).maybeSingle(),
  ]);
  const error = courseRes.error || progressRes.error || viewsRes.error || enrollmentRes.error;
  if (error) throw error;
  if (!courseRes.data) return null;

  const raw = courseRes.data as unknown as RawPlayCourse;
  const passed = new Set((progressRes.data || []).map((p) => p.module_id));
  const views = new Map((viewsRes.data || []).map((v) => [v.material_id, v]));
  const completedAt = enrollmentRes.data?.completed_at ?? null;

  // Mirrors is_module_unlocked() in the database, which has the final say.
  let previousAllPassed = true;
  const modules = [...raw.modules].sort(byPosition).map((m) => {
    const quiz = Array.isArray(m.quizzes) ? m.quizzes[0] : m.quizzes;
    const module: PlayModule = {
      id: m.id,
      title: asLocalized(m.title),
      description: asLocalized(m.description),
      passScore: quiz?.pass_score ?? 70,
      passed: passed.has(m.id),
      unlocked: !!completedAt || previousAllPassed,
      materials: [...m.module_materials].sort(byPosition).map((mat) => ({
        id: mat.id,
        kind: mat.kind,
        title: asLocalized(mat.title),
        versions: mat.material_versions,
        completed: views.get(mat.id)?.completed ?? false,
        watchedPercent: views.get(mat.id)?.watched_percent ?? 0,
      })),
    };
    previousAllPassed = previousAllPassed && module.passed;
    return module;
  });

  return {
    id: raw.id,
    title: asLocalized(raw.title),
    description: asLocalized(raw.description),
    completedAt,
    modules,
  };
};

// Materials without any version can't be opened, so they don't block the quiz
// (same rule as module_materials_done() in the database).
export const pendingMaterials = (module: PlayModule) =>
  module.materials.filter((m) => m.versions.length > 0 && !m.completed);

// The viewer's language, else English, else whatever exists.
export const pickVersion = (versions: PlayVersion[], lang: Lang): PlayVersion | null =>
  versions.find((v) => v.language === lang)
  ?? versions.find((v) => v.language === DEFAULT_LANG)
  ?? versions[0]
  ?? null;

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: Localized;
  options: { id: string; label: Localized }[];
}

export interface QuizPayload {
  passScore: number;
  questions: QuizQuestion[];
}

export interface QuizResult {
  score: number;
  passScore: number;
  passed: boolean;
  courseCompleted: boolean;
}

export const fetchQuiz = async (moduleId: string): Promise<QuizPayload> => {
  const { data, error } = await supabase.rpc('learning_get_quiz', { _module_id: moduleId });
  if (error) throw error;
  const raw = data as { pass_score: number; questions: { id: string; type: QuestionType; prompt: Json; options: { id: string; label: Json }[] | null }[] };
  return {
    passScore: raw.pass_score,
    questions: raw.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: asLocalized(q.prompt),
      options: (q.options ?? []).map((o) => ({ id: o.id, label: asLocalized(o.label) })),
    })),
  };
};

export const submitQuiz = async (moduleId: string, answers: Record<string, string[]>): Promise<QuizResult> => {
  const { data, error } = await supabase.rpc('learning_submit_quiz', { _module_id: moduleId, _answers: answers });
  if (error) throw error;
  const raw = data as { score: number; pass_score: number; passed: boolean; course_completed: boolean };
  return { score: raw.score, passScore: raw.pass_score, passed: raw.passed, courseCompleted: raw.course_completed };
};

export const recordView = async (materialId: string, watchedPercent?: number): Promise<boolean> => {
  const { data, error } = await supabase.rpc('learning_record_view', {
    _material_id: materialId,
    _watched_percent: watchedPercent ?? null,
  });
  if (error) throw error;
  return data === true;
};
