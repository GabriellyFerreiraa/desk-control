import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import type { Dict } from '@/i18n/strings';
import { Localized, asLocalized, hasText } from '@/lib/localized';

export type MaterialKind = Database['public']['Enums']['material_kind'];
export type QuestionType = Database['public']['Enums']['question_type'];
export type VersionNode = Database['public']['Tables']['material_versions']['Row'];

export interface MaterialNode {
  id: string;
  position: number;
  kind: MaterialKind;
  title: Localized;
  versions: VersionNode[];
}

export interface OptionNode {
  id: string;
  position: number;
  label: Localized;
  is_correct: boolean;
}

export interface QuestionNode {
  id: string;
  position: number;
  type: QuestionType;
  prompt: Localized;
  options: OptionNode[];
}

export interface ModuleNode {
  id: string;
  position: number;
  title: Localized;
  description: Localized;
  materials: MaterialNode[];
  passScore: number;
  questions: QuestionNode[];
}

export interface CourseTree {
  id: string;
  title: Localized;
  description: Localized;
  published: boolean;
  projectIds: string[];
  modules: ModuleNode[];
}

// Shape returned by the nested select below (PostgREST embeds).
interface RawCourse {
  id: string;
  title: Json;
  description: Json;
  published: boolean;
  course_projects: { project_id: string }[];
  modules: {
    id: string;
    position: number;
    title: Json;
    description: Json;
    module_materials: {
      id: string;
      position: number;
      kind: MaterialKind;
      title: Json;
      material_versions: VersionNode[];
    }[];
    quizzes: RawQuiz | RawQuiz[] | null;
  }[];
}

interface RawQuiz {
  pass_score: number;
  quiz_questions: {
    id: string;
    position: number;
    type: QuestionType;
    prompt: Json;
    quiz_options: { id: string; position: number; label: Json; is_correct: boolean }[];
  }[];
}

// PostgREST returns a one-to-one embed as an object, but falls back to an
// array if it can't prove the relationship is one-to-one.
const singleQuiz = (quiz: RawQuiz | RawQuiz[] | null): RawQuiz | null =>
  Array.isArray(quiz) ? quiz[0] ?? null : quiz;

const COURSE_TREE_SELECT = `
  id, title, description, published,
  course_projects(project_id),
  modules(
    id, position, title, description,
    module_materials(id, position, kind, title, material_versions(*)),
    quizzes(pass_score, quiz_questions(id, position, type, prompt, quiz_options(id, position, label, is_correct)))
  )
`;

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

export const loadCourseTree = async (courseId: string): Promise<CourseTree | null> => {
  const { data, error } = await supabase.from('courses').select(COURSE_TREE_SELECT).eq('id', courseId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const raw = data as unknown as RawCourse;

  return {
    id: raw.id,
    title: asLocalized(raw.title),
    description: asLocalized(raw.description),
    published: raw.published,
    projectIds: raw.course_projects.map((cp) => cp.project_id),
    modules: [...raw.modules].sort(byPosition).map((m) => {
      const quiz = singleQuiz(m.quizzes);
      return {
        id: m.id,
        position: m.position,
        title: asLocalized(m.title),
        description: asLocalized(m.description),
        materials: [...m.module_materials].sort(byPosition).map((mat) => ({
          id: mat.id,
          position: mat.position,
          kind: mat.kind,
          title: asLocalized(mat.title),
          versions: mat.material_versions,
        })),
        passScore: quiz?.pass_score ?? 70,
        questions: [...(quiz?.quiz_questions ?? [])].sort(byPosition).map((q) => ({
          id: q.id,
          position: q.position,
          type: q.type,
          prompt: asLocalized(q.prompt),
          options: [...q.quiz_options].sort(byPosition).map((o) => ({
            id: o.id,
            position: o.position,
            label: asLocalized(o.label),
            is_correct: o.is_correct,
          })),
        })),
      };
    }),
  };
};

// Everything that must be fixed before analysts can see the course.
export const getPublishProblems = (course: CourseTree, t: Dict['admin']['courses']): string[] => {
  const problems: string[] = [];
  if (!hasText(course.title)) problems.push(t.problems.noTitle);
  if (course.projectIds.length === 0) problems.push(t.problems.noProjects);
  if (course.modules.length === 0) problems.push(t.problems.noModules);
  course.modules.forEach((module, index) => {
    if (!hasText(module.title)) problems.push(t.problems.moduleNoTitle(index + 1));
    if (module.questions.length === 0) problems.push(t.problems.moduleNoQuestions(index + 1));
  });
  return problems;
};

export const storagePathsOf = (materials: MaterialNode[]): string[] =>
  materials.flatMap((m) => m.versions.map((v) => v.storage_path)).filter((p): p is string => !!p);

// New order of `ids` after moving the item at `index` one step up or down.
export const moveId = (ids: string[], index: number, direction: -1 | 1): string[] | null => {
  const target = index + direction;
  if (target < 0 || target >= ids.length) return null;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};
