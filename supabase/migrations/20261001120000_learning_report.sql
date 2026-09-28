-- Phase 4 of the Learning module (see docs/learning-spec.md):
-- lead follow-up. A progress report (one row per analyst and course) and
-- a way to mark notifications as read.

-- Rows the caller may see: admins get every active analyst; leads get the
-- active analysts of the projects they lead. Anyone else gets no rows.
-- A course appears for an analyst when it is published for their project,
-- or when they already completed it (so unpublishing doesn't erase history).
CREATE OR REPLACE FUNCTION public.learning_progress_report()
RETURNS TABLE (
  analyst_id UUID,
  analyst_name TEXT,
  project_id UUID,
  project_name TEXT,
  course_id UUID,
  course_title JSONB,
  total_modules INTEGER,
  passed_modules INTEGER,
  current_module INTEGER,
  total_attempts INTEGER,
  attempts_by_module JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH viewer AS (
    SELECT auth.uid() AS id, public.is_admin(auth.uid()) AS is_admin
    WHERE public.is_active_user(auth.uid())
  ),
  analysts AS (
    SELECT p.user_id, p.name, p.project_id, pr.name AS project_name
    FROM public.profiles p
    JOIN public.projects pr ON pr.id = p.project_id
    CROSS JOIN viewer v
    WHERE p.role = 'analyst'
      AND p.status = 'active'
      AND (
        v.is_admin
        OR EXISTS (
          SELECT 1 FROM public.project_leads pl
          WHERE pl.lead_id = v.id AND pl.project_id = p.project_id
        )
      )
  ),
  pairs AS (
    SELECT a.user_id, a.name, a.project_id, a.project_name, c.id AS course_id, c.title
    FROM analysts a
    JOIN public.course_projects cp ON cp.project_id = a.project_id
    JOIN public.courses c ON c.id = cp.course_id
    WHERE c.published
       OR EXISTS (
         SELECT 1 FROM public.course_enrollments e
         WHERE e.user_id = a.user_id AND e.course_id = c.id AND e.completed_at IS NOT NULL
       )
  ),
  numbered_modules AS (
    SELECT m.id, m.course_id, row_number() OVER (PARTITION BY m.course_id ORDER BY m.position, m.created_at)::INTEGER AS number
    FROM public.modules m
  )
  SELECT
    pa.user_id,
    pa.name,
    pa.project_id,
    pa.project_name,
    pa.course_id,
    pa.title,
    (SELECT count(*)::INTEGER FROM numbered_modules nm WHERE nm.course_id = pa.course_id),
    (SELECT count(*)::INTEGER
       FROM numbered_modules nm
       JOIN public.module_progress mp ON mp.module_id = nm.id AND mp.user_id = pa.user_id
       WHERE nm.course_id = pa.course_id),
    -- First module not passed yet (NULL once every module is passed).
    (SELECT min(nm.number)
       FROM numbered_modules nm
       WHERE nm.course_id = pa.course_id
         AND NOT EXISTS (
           SELECT 1 FROM public.module_progress mp
           WHERE mp.module_id = nm.id AND mp.user_id = pa.user_id
         )),
    (SELECT count(*)::INTEGER
       FROM public.quiz_attempts qa
       JOIN numbered_modules nm ON nm.id = qa.module_id
       WHERE nm.course_id = pa.course_id AND qa.user_id = pa.user_id),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('module', x.number, 'attempts', x.attempts) ORDER BY x.number)
      FROM (
        SELECT nm.number, count(qa.id)::INTEGER AS attempts
        FROM numbered_modules nm
        JOIN public.quiz_attempts qa ON qa.module_id = nm.id AND qa.user_id = pa.user_id
        WHERE nm.course_id = pa.course_id
        GROUP BY nm.number
      ) x
    ), '[]'::jsonb),
    e.started_at,
    e.completed_at
  FROM pairs pa
  LEFT JOIN public.course_enrollments e ON e.user_id = pa.user_id AND e.course_id = pa.course_id
  ORDER BY pa.name, pa.course_id
$$;

-- Marks the caller's notifications as read: the given ones, or all of them.
CREATE OR REPLACE FUNCTION public.mark_notifications_read(_ids UUID[] DEFAULT NULL)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.notifications
  SET read_at = now()
  WHERE recipient_id = auth.uid()
    AND read_at IS NULL
    AND (_ids IS NULL OR id = ANY(_ids))
$$;

REVOKE EXECUTE ON FUNCTION public.learning_progress_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.learning_progress_report() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_notifications_read(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(UUID[]) TO authenticated;
