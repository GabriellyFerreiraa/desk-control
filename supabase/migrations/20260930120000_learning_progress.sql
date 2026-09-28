-- Phase 3 of the Learning module (see docs/learning-spec.md):
-- analysts take courses. Adds progress tables, read access to published
-- content, and the functions that record views, serve quizzes without
-- their answers, grade attempts and unlock the next module.
--
-- Progress rows are only written by the SECURITY DEFINER functions below;
-- no table here has an INSERT/UPDATE policy for regular users.

-- ---------------------------------------------------------------------------
-- Progress tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.course_enrollments (
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (user_id, course_id)
);

CREATE INDEX course_enrollments_course_id_idx ON public.course_enrollments(course_id);

CREATE TABLE public.material_views (
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.module_materials(id) ON DELETE CASCADE,
  first_opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  watched_percent INTEGER NOT NULL DEFAULT 0 CHECK (watched_percent BETWEEN 0 AND 100),
  completed BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, material_id)
);

CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  pass_score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX quiz_attempts_user_module_idx ON public.quiz_attempts(user_id, module_id);
CREATE INDEX quiz_attempts_module_id_idx ON public.quiz_attempts(module_id);

CREATE TABLE public.module_progress (
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  passed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_id)
);

CREATE INDEX module_progress_module_id_idx ON public.module_progress(module_id);

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX notifications_recipient_idx ON public.notifications(recipient_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- Admins see every course. Active analysts see published courses of their
-- project; active leads see published courses of the projects they lead.
CREATE OR REPLACE FUNCTION public.can_view_course(_user_id UUID, _course_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_admin(_user_id) OR EXISTS (
    SELECT 1
    FROM public.courses c
    JOIN public.course_projects cp ON cp.course_id = c.id
    JOIN public.profiles p ON p.user_id = _user_id AND p.status = 'active'
    WHERE c.id = _course_id
      AND c.published
      AND (
        cp.project_id = p.project_id
        OR EXISTS (
          SELECT 1 FROM public.project_leads pl
          WHERE pl.lead_id = _user_id AND pl.project_id = cp.project_id
        )
      )
  )
$$;

-- A module is open when every earlier module of the course was passed.
-- Once a course is completed, all of it stays open for review, even
-- modules the admin adds later.
CREATE OR REPLACE FUNCTION public.is_module_unlocked(_user_id UUID, _module_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.modules m
    WHERE m.id = _module_id
      AND public.can_view_course(_user_id, m.course_id)
      AND (
        EXISTS (
          SELECT 1 FROM public.course_enrollments e
          WHERE e.user_id = _user_id AND e.course_id = m.course_id AND e.completed_at IS NOT NULL
        )
        OR NOT EXISTS (
          SELECT 1
          FROM public.modules prev
          WHERE prev.course_id = m.course_id
            AND prev.position < m.position
            AND NOT EXISTS (
              SELECT 1 FROM public.module_progress mp
              WHERE mp.user_id = _user_id AND mp.module_id = prev.id
            )
        )
      )
  )
$$;

-- True when every material of the module (that has at least one version)
-- was opened, or watched to 90% for uploaded videos.
CREATE OR REPLACE FUNCTION public.module_materials_done(_user_id UUID, _module_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.module_materials mm
    WHERE mm.module_id = _module_id
      AND EXISTS (SELECT 1 FROM public.material_versions v WHERE v.material_id = mm.id)
      AND NOT EXISTS (
        SELECT 1 FROM public.material_views mv
        WHERE mv.user_id = _user_id AND mv.material_id = mm.id AND mv.completed
      )
  )
$$;

-- Lead of the project the analyst belongs to.
CREATE OR REPLACE FUNCTION public.is_lead_of(_lead_id UUID, _analyst_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_leads pl
    JOIN public.profiles p ON p.project_id = pl.project_id
    WHERE pl.lead_id = _lead_id AND p.user_id = _analyst_id
  )
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Progress: your own rows, your team's rows if you lead their project,
-- everything if you are an admin. Read-only for everyone.
CREATE POLICY "View own or team enrollments" ON public.course_enrollments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_lead_of(auth.uid(), user_id));
CREATE POLICY "View own or team material views" ON public.material_views
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_lead_of(auth.uid(), user_id));
CREATE POLICY "View own or team quiz attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_lead_of(auth.uid(), user_id));
CREATE POLICY "View own or team module progress" ON public.module_progress
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_lead_of(auth.uid(), user_id));

CREATE POLICY "View own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

-- Published content, for the people who can take or follow the course.
-- Module and material titles are visible even when locked, so the course
-- outline can be shown; the material versions (files and links) are not.
CREATE POLICY "View visible courses" ON public.courses
  FOR SELECT TO authenticated
  USING (public.can_view_course(auth.uid(), id));

CREATE POLICY "View modules of visible courses" ON public.modules
  FOR SELECT TO authenticated
  USING (public.can_view_course(auth.uid(), course_id));

CREATE POLICY "View materials of visible courses" ON public.module_materials
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = module_id AND public.can_view_course(auth.uid(), m.course_id)
  ));

CREATE POLICY "View versions of unlocked materials" ON public.material_versions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.module_materials mm
    WHERE mm.id = material_id AND public.is_module_unlocked(auth.uid(), mm.module_id)
  ));

-- Only the passing score; questions and options go through learning_get_quiz.
CREATE POLICY "View quizzes of visible courses" ON public.quizzes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = module_id AND public.can_view_course(auth.uid(), m.course_id)
  ));

-- Uploaded files of unlocked modules (needed to create signed URLs).
CREATE POLICY "View files of unlocked materials"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'learning-materials'
  AND EXISTS (
    SELECT 1
    FROM public.material_versions v
    JOIN public.module_materials mm ON mm.id = v.material_id
    WHERE v.storage_path = storage.objects.name
      AND public.is_module_unlocked(auth.uid(), mm.module_id)
  )
);

-- ---------------------------------------------------------------------------
-- Learning functions (called by analysts)
-- ---------------------------------------------------------------------------

-- Records that a material was opened (files, links) or how much of it was
-- watched (uploaded videos). Returns whether the material now counts as done.
CREATE OR REPLACE FUNCTION public.learning_record_view(_material_id UUID, _watched_percent INTEGER DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_module_id UUID;
  v_course_id UUID;
  v_kind public.material_kind;
  v_percent INTEGER;
  v_done BOOLEAN;
BEGIN
  SELECT mm.module_id, mm.kind, m.course_id
  INTO v_module_id, v_kind, v_course_id
  FROM public.module_materials mm
  JOIN public.modules m ON m.id = mm.module_id
  WHERE mm.id = _material_id;

  IF v_module_id IS NULL OR NOT public.is_module_unlocked(auth.uid(), v_module_id) THEN
    RAISE EXCEPTION 'Material not available' USING ERRCODE = '42501';
  END IF;

  v_percent := LEAST(GREATEST(COALESCE(_watched_percent, 0), 0), 100);
  v_done := v_kind <> 'video' OR v_percent >= 90;

  INSERT INTO public.material_views (user_id, material_id, watched_percent, completed)
  VALUES (auth.uid(), _material_id, v_percent, v_done)
  ON CONFLICT (user_id, material_id) DO UPDATE SET
    last_opened_at = now(),
    watched_percent = GREATEST(public.material_views.watched_percent, EXCLUDED.watched_percent),
    completed = public.material_views.completed OR EXCLUDED.completed
  RETURNING completed INTO v_done;

  INSERT INTO public.course_enrollments (user_id, course_id)
  VALUES (auth.uid(), v_course_id)
  ON CONFLICT (user_id, course_id) DO NOTHING;

  RETURN v_done;
END;
$$;

-- Serves a module's quiz without the correct answers, in random order
-- (true/false options keep their order).
CREATE OR REPLACE FUNCTION public.learning_get_quiz(_module_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_course_id UUID;
  v_result JSONB;
BEGIN
  IF NOT public.is_module_unlocked(auth.uid(), _module_id) THEN
    RAISE EXCEPTION 'Module is locked' USING ERRCODE = '42501';
  END IF;
  IF NOT public.module_materials_done(auth.uid(), _module_id) THEN
    RAISE EXCEPTION 'Open every material before taking the quiz' USING ERRCODE = '42501';
  END IF;

  SELECT course_id INTO v_course_id FROM public.modules WHERE id = _module_id;
  INSERT INTO public.course_enrollments (user_id, course_id)
  VALUES (auth.uid(), v_course_id)
  ON CONFLICT (user_id, course_id) DO NOTHING;

  SELECT jsonb_build_object(
    'pass_score', q.pass_score,
    'questions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', qq.id,
          'type', qq.type,
          'prompt', qq.prompt,
          'options', (
            SELECT jsonb_agg(
              jsonb_build_object('id', o.id, 'label', o.label)
              ORDER BY CASE WHEN qq.type = 'true_false' THEN o.position::DOUBLE PRECISION ELSE random() END
            )
            FROM public.quiz_options o
            WHERE o.question_id = qq.id
          )
        )
        ORDER BY random()
      )
      FROM public.quiz_questions qq
      WHERE qq.module_id = _module_id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.quizzes q
  WHERE q.module_id = _module_id;

  RETURN v_result;
END;
$$;

-- Grades an attempt. _answers: { "<question_id>": ["<option_id>", ...], ... }
-- A question counts as right only when the selected options are exactly
-- the correct ones. Passing unlocks the next module; passing the last one
-- completes the course and notifies the leads of the analyst's project.
CREATE OR REPLACE FUNCTION public.learning_submit_quiz(_module_id UUID, _answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_course_id UUID;
  v_pass_score INTEGER;
  v_total INTEGER;
  v_correct INTEGER;
  v_score INTEGER;
  v_passed BOOLEAN;
  v_course_completed BOOLEAN := false;
BEGIN
  IF NOT public.is_module_unlocked(v_user_id, _module_id) THEN
    RAISE EXCEPTION 'Module is locked' USING ERRCODE = '42501';
  END IF;
  IF NOT public.module_materials_done(v_user_id, _module_id) THEN
    RAISE EXCEPTION 'Open every material before taking the quiz' USING ERRCODE = '42501';
  END IF;
  IF _answers IS NULL OR jsonb_typeof(_answers) <> 'object' THEN
    RAISE EXCEPTION 'Answers must be an object' USING ERRCODE = '22023';
  END IF;

  SELECT m.course_id, q.pass_score
  INTO v_course_id, v_pass_score
  FROM public.modules m
  JOIN public.quizzes q ON q.module_id = m.id
  WHERE m.id = _module_id;

  SELECT count(*) INTO v_total FROM public.quiz_questions WHERE module_id = _module_id;
  IF v_total = 0 THEN
    RAISE EXCEPTION 'This quiz has no questions yet' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_correct
  FROM public.quiz_questions qq
  WHERE qq.module_id = _module_id
    AND COALESCE((
          SELECT array_agg(o.id ORDER BY o.id)
          FROM public.quiz_options o
          WHERE o.question_id = qq.id AND o.is_correct
        ), '{}'::UUID[])
      = COALESCE((
          SELECT array_agg(DISTINCT s.value::UUID ORDER BY s.value::UUID)
          FROM jsonb_array_elements_text(
            CASE WHEN jsonb_typeof(_answers -> qq.id::TEXT) = 'array' THEN _answers -> qq.id::TEXT ELSE '[]'::jsonb END
          ) AS s(value)
        ), '{}'::UUID[]);

  v_score := round(100.0 * v_correct / v_total);
  v_passed := v_score >= v_pass_score;

  INSERT INTO public.quiz_attempts (user_id, module_id, score, pass_score, passed, answers)
  VALUES (v_user_id, _module_id, v_score, v_pass_score, v_passed, _answers);

  INSERT INTO public.course_enrollments (user_id, course_id)
  VALUES (v_user_id, v_course_id)
  ON CONFLICT (user_id, course_id) DO NOTHING;

  IF v_passed THEN
    INSERT INTO public.module_progress (user_id, module_id)
    VALUES (v_user_id, _module_id)
    ON CONFLICT (user_id, module_id) DO NOTHING;

    IF NOT EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.course_id = v_course_id
        AND NOT EXISTS (
          SELECT 1 FROM public.module_progress mp
          WHERE mp.user_id = v_user_id AND mp.module_id = m.id
        )
    ) THEN
      UPDATE public.course_enrollments
      SET completed_at = now()
      WHERE user_id = v_user_id AND course_id = v_course_id AND completed_at IS NULL;
      v_course_completed := FOUND;

      IF v_course_completed THEN
        INSERT INTO public.notifications (recipient_id, type, payload)
        SELECT pl.lead_id,
               'course_completed',
               jsonb_build_object(
                 'analyst_id', p.user_id,
                 'analyst_name', p.name,
                 'course_id', c.id,
                 'course_title', c.title
               )
        FROM public.profiles p
        JOIN public.project_leads pl ON pl.project_id = p.project_id
        JOIN public.courses c ON c.id = v_course_id
        WHERE p.user_id = v_user_id
          AND pl.lead_id <> v_user_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'score', v_score,
    'pass_score', v_pass_score,
    'passed', v_passed,
    'course_completed', v_course_completed
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.learning_record_view(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.learning_record_view(UUID, INTEGER) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.learning_get_quiz(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.learning_get_quiz(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.learning_submit_quiz(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.learning_submit_quiz(UUID, JSONB) TO authenticated;
