-- Phase 2 of the Learning module (see docs/learning-spec.md):
-- course content (courses, modules, materials, quizzes) and the private
-- storage bucket for uploaded files. Everything here is admin-only for
-- now; analyst read access and progress tracking come in phase 3.
--
-- Translatable text is stored as JSONB: { "en": "...", "es": "...", "pt": "..." }.
-- Any language may be missing; the app falls back to English.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

-- file:  document uploaded to storage (PDF, Word, PowerPoint, Excel)
-- video: video uploaded to storage (MP4, WebM)
-- link:  external URL, e.g. a SharePoint file or a Teams recording
CREATE TYPE public.material_kind AS ENUM ('file', 'video', 'link');

CREATE TYPE public.question_type AS ENUM ('single', 'multiple', 'true_false');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(title) = 'object'),
  description JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(description) = 'object'),
  published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Which projects can see a course.
CREATE TABLE public.course_projects (
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, project_id)
);

CREATE INDEX course_projects_project_id_idx ON public.course_projects(project_id);

CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  title JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(title) = 'object'),
  description JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(description) = 'object'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX modules_course_id_idx ON public.modules(course_id, position);

CREATE TABLE public.module_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  kind public.material_kind NOT NULL,
  title JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(title) = 'object'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX module_materials_module_id_idx ON public.module_materials(module_id, position);

-- One row per language a material is available in. Uploaded materials
-- point to a storage object; links point to a URL.
CREATE TABLE public.material_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.module_materials(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('en', 'es', 'pt')),
  storage_path TEXT,
  url TEXT CHECK (url IS NULL OR url ~* '^https://'),
  file_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (material_id, language),
  CHECK ((storage_path IS NULL) <> (url IS NULL))
);

-- One quiz per module, created automatically with the module.
CREATE TABLE public.quizzes (
  module_id UUID NOT NULL PRIMARY KEY REFERENCES public.modules(id) ON DELETE CASCADE,
  pass_score INTEGER NOT NULL DEFAULT 70 CHECK (pass_score BETWEEN 70 AND 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.quizzes(module_id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  type public.question_type NOT NULL,
  prompt JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(prompt) = 'object'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX quiz_questions_module_id_idx ON public.quiz_questions(module_id, position);

-- is_correct must never reach analysts: in phase 3 they get questions
-- through a function that strips it, never through a policy on this table.
CREATE TABLE public.quiz_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  label JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(label) = 'object'),
  is_correct BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX quiz_options_question_id_idx ON public.quiz_options(question_id, position);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_module_materials_updated_at BEFORE UPDATE ON public.module_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_material_versions_updated_at BEFORE UPDATE ON public.material_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quiz_questions_updated_at BEFORE UPDATE ON public.quiz_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Every module has a quiz; creating it here means the app never has to
-- handle a module without one.
CREATE OR REPLACE FUNCTION public.create_module_quiz()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.quizzes (module_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_module_quiz
  AFTER INSERT ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.create_module_quiz();

-- Materials of kind "link" hold URLs; uploaded kinds hold storage paths.
CREATE OR REPLACE FUNCTION public.check_material_version_kind()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_kind public.material_kind;
BEGIN
  SELECT kind INTO v_kind FROM public.module_materials WHERE id = NEW.material_id;
  IF (v_kind = 'link') <> (NEW.url IS NOT NULL) THEN
    RAISE EXCEPTION 'Links need a URL and uploaded materials need a file'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_material_version_kind
  BEFORE INSERT OR UPDATE ON public.material_versions
  FOR EACH ROW EXECUTE FUNCTION public.check_material_version_kind();

-- ---------------------------------------------------------------------------
-- Row level security: admins only for now.
-- ---------------------------------------------------------------------------

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage courses" ON public.courses
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage course projects" ON public.course_projects
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage modules" ON public.modules
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage module materials" ON public.module_materials
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage material versions" ON public.material_versions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage quizzes" ON public.quizzes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage quiz questions" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage quiz options" ON public.quiz_options
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Admin functions
-- ---------------------------------------------------------------------------

-- Saves a question and replaces its options in one transaction, so a
-- question is never left half-edited (e.g. with no correct option).
-- _options: [{ "label": { "en": "..." }, "is_correct": true }, ...]
CREATE OR REPLACE FUNCTION public.admin_save_question(
  _module_id UUID,
  _question_id UUID,
  _type public.question_type,
  _prompt JSONB,
  _options JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
  v_count INTEGER;
  v_correct INTEGER;
  v_option JSONB;
  v_position INTEGER := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF _prompt IS NULL OR jsonb_typeof(_prompt) <> 'object' OR _prompt = '{}'::jsonb THEN
    RAISE EXCEPTION 'The question needs a prompt' USING ERRCODE = '22023';
  END IF;
  IF _options IS NULL OR jsonb_typeof(_options) <> 'array' THEN
    RAISE EXCEPTION 'Options must be a list' USING ERRCODE = '22023';
  END IF;

  v_count := jsonb_array_length(_options);
  SELECT count(*) INTO v_correct
  FROM jsonb_array_elements(_options) AS o
  WHERE COALESCE((o ->> 'is_correct')::BOOLEAN, false);

  IF v_count < 2 THEN
    RAISE EXCEPTION 'A question needs at least two options' USING ERRCODE = '22023';
  END IF;
  IF _type = 'true_false' AND v_count <> 2 THEN
    RAISE EXCEPTION 'True/false questions have exactly two options' USING ERRCODE = '22023';
  END IF;
  IF _type IN ('single', 'true_false') AND v_correct <> 1 THEN
    RAISE EXCEPTION 'This question needs exactly one correct option' USING ERRCODE = '22023';
  END IF;
  IF _type = 'multiple' AND v_correct < 1 THEN
    RAISE EXCEPTION 'This question needs at least one correct option' USING ERRCODE = '22023';
  END IF;

  IF _question_id IS NULL THEN
    INSERT INTO public.quiz_questions (module_id, position, type, prompt)
    VALUES (
      _module_id,
      COALESCE((SELECT max(position) + 1 FROM public.quiz_questions WHERE module_id = _module_id), 0),
      _type,
      _prompt
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.quiz_questions
    SET type = _type, prompt = _prompt
    WHERE id = _question_id AND module_id = _module_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Question not found' USING ERRCODE = 'P0002';
    END IF;

    DELETE FROM public.quiz_options WHERE question_id = v_id;
  END IF;

  FOR v_option IN SELECT * FROM jsonb_array_elements(_options) LOOP
    INSERT INTO public.quiz_options (question_id, position, label, is_correct)
    VALUES (
      v_id,
      v_position,
      COALESCE(v_option -> 'label', '{}'::jsonb),
      COALESCE((v_option ->> 'is_correct')::BOOLEAN, false)
    );
    v_position := v_position + 1;
  END LOOP;

  RETURN v_id;
END;
$$;

-- Rewrites positions 0..n-1 in the given order, in one statement.
-- _kind: 'modules' | 'materials' | 'questions'
CREATE OR REPLACE FUNCTION public.admin_reorder(_kind TEXT, _ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF _kind = 'modules' THEN
    UPDATE public.modules t SET position = o.ord - 1
    FROM unnest(_ids) WITH ORDINALITY AS o(id, ord) WHERE t.id = o.id;
  ELSIF _kind = 'materials' THEN
    UPDATE public.module_materials t SET position = o.ord - 1
    FROM unnest(_ids) WITH ORDINALITY AS o(id, ord) WHERE t.id = o.id;
  ELSIF _kind = 'questions' THEN
    UPDATE public.quiz_questions t SET position = o.ord - 1
    FROM unnest(_ids) WITH ORDINALITY AS o(id, ord) WHERE t.id = o.id;
  ELSE
    RAISE EXCEPTION 'Unknown kind: %', _kind USING ERRCODE = '22023';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_save_question(UUID, UUID, public.question_type, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_question(UUID, UUID, public.question_type, JSONB, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reorder(TEXT, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reorder(TEXT, UUID[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for uploaded materials.
-- 50 MB is the per-file ceiling on the Supabase free plan.
-- Paths: courses/{course_id}/{material_id}/{language}-{random}.{ext}
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'learning-materials',
  'learning-materials',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'video/mp4',
    'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Admins manage learning materials"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'learning-materials' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'learning-materials' AND public.is_admin(auth.uid()));
