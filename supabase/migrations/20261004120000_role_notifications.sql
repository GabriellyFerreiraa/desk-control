-- Design stage 4: notifications that matter to each role.
--   Leads    <- an analyst asks for an absence, or asks to cancel one
--   Analysts <- their absence or cancellation is decided, a task is assigned
--   Admins   <- anything meant for leads when the project has no lead,
--               including a course completed in a project without a lead
-- Nobody is notified about their own action (auth.uid() is the actor).
-- All of this runs in triggers, so every way of changing the data (app,
-- SQL editor, future integrations) produces the same notifications.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Leads of the analyst's project; the active admins if the project has none.
CREATE OR REPLACE FUNCTION public.notify_supervisors(_analyst_id UUID, _type TEXT, _payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sent INTEGER;
BEGIN
  INSERT INTO public.notifications (recipient_id, type, payload)
  SELECT pl.lead_id, _type, _payload
  FROM public.profiles p
  JOIN public.project_leads pl ON pl.project_id = p.project_id
  WHERE p.user_id = _analyst_id
    AND pl.lead_id IS DISTINCT FROM auth.uid();
  GET DIAGNOSTICS v_sent = ROW_COUNT;

  IF v_sent = 0 THEN
    INSERT INTO public.notifications (recipient_id, type, payload)
    SELECT a.user_id, _type, _payload || jsonb_build_object('no_lead', true)
    FROM public.profiles a
    WHERE a.role = 'admin' AND a.status = 'active'
      AND a.user_id IS DISTINCT FROM auth.uid()
      AND a.user_id <> _analyst_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_user(_user_id UUID, _type TEXT, _payload JSONB)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.notifications (recipient_id, type, payload)
  SELECT _user_id, _type, _payload
  WHERE _user_id IS DISTINCT FROM auth.uid()
$$;

-- Only triggers call these.
REVOKE EXECUTE ON FUNCTION public.notify_supervisors(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Absence requests
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_absence_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payload JSONB;
BEGIN
  SELECT jsonb_build_object(
    'request_id', NEW.id,
    'analyst_id', NEW.analyst_id,
    'analyst_name', p.name,
    'start_date', NEW.start_date,
    'end_date', NEW.end_date,
    'lead_comment', NEW.lead_comment
  )
  INTO v_payload
  FROM public.profiles p
  WHERE p.user_id = NEW.analyst_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' THEN
      PERFORM public.notify_supervisors(NEW.analyst_id, 'absence_requested', v_payload);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    PERFORM public.notify_user(NEW.analyst_id, 'absence_approved', v_payload);
  ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    PERFORM public.notify_user(NEW.analyst_id, 'absence_rejected', v_payload);
  ELSIF OLD.status = 'approved' AND NEW.status = 'cancel_requested' THEN
    PERFORM public.notify_supervisors(NEW.analyst_id, 'cancellation_requested', v_payload);
  ELSIF OLD.status = 'cancel_requested' AND NEW.status = 'cancelled' THEN
    PERFORM public.notify_user(NEW.analyst_id, 'cancellation_approved', v_payload);
  ELSIF OLD.status = 'cancel_requested' AND NEW.status = 'approved' THEN
    PERFORM public.notify_user(NEW.analyst_id, 'cancellation_rejected', v_payload);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_absence_change
  AFTER INSERT OR UPDATE OF status ON public.absence_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_absence_change();

-- ---------------------------------------------------------------------------
-- Tasks assigned by someone else
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.assigned_by IS DISTINCT FROM NEW.assigned_to THEN
    PERFORM public.notify_user(
      NEW.assigned_to,
      'task_assigned',
      jsonb_build_object(
        'task_id', NEW.id,
        'title', NEW.title,
        'due_date', NEW.due_date,
        'priority', NEW.priority,
        'assigned_by_name', (SELECT name FROM public.profiles WHERE user_id = NEW.assigned_by)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_task_assigned
  AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

-- ---------------------------------------------------------------------------
-- Course completed in a project without a lead: learning_submit_quiz already
-- notifies the project's leads; when there are none, tell the admins.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_course_completed_without_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.profiles p
       JOIN public.project_leads pl ON pl.project_id = p.project_id
       WHERE p.user_id = NEW.user_id
     ) THEN
    INSERT INTO public.notifications (recipient_id, type, payload)
    SELECT a.user_id,
           'course_completed',
           jsonb_build_object(
             'analyst_id', p.user_id,
             'analyst_name', p.name,
             'course_id', c.id,
             'course_title', c.title,
             'no_lead', true
           )
    FROM public.profiles a
    CROSS JOIN public.profiles p
    JOIN public.courses c ON c.id = NEW.course_id
    WHERE a.role = 'admin' AND a.status = 'active'
      AND p.user_id = NEW.user_id
      AND a.user_id <> NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_course_completed_without_lead
  AFTER UPDATE OF completed_at ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.notify_course_completed_without_lead();

-- ---------------------------------------------------------------------------
-- Live updates for the bell (Supabase Realtime respects RLS: each user only
-- receives their own rows). Skipped where the publication doesn't exist.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
