-- 1) A user with the Lead role leads the project assigned to them in the
--    admin Users tab. The Projects tab still adds extra projects.
-- 2) Admin-only deletion of a user account with all of its data.

-- ---------------------------------------------------------------------------
-- Keep project_leads in sync with a lead's profile.
--   * role becomes lead, or a lead gets a project -> lead of that project
--   * a lead moves to another project -> stops leading the previous one
--     (projects added from the Projects tab are left alone)
--   * role becomes analyst -> stops leading every project
-- Admins are never touched: they can be project leads from the Projects tab.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_lead_projects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'analyst' THEN
    DELETE FROM public.project_leads WHERE lead_id = NEW.user_id;
    RETURN NEW;
  END IF;

  IF NEW.role <> 'lead' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.role = 'lead'
     AND OLD.project_id IS NOT NULL
     AND OLD.project_id IS DISTINCT FROM NEW.project_id THEN
    DELETE FROM public.project_leads
    WHERE lead_id = NEW.user_id AND project_id = OLD.project_id;
  END IF;

  IF NEW.project_id IS NOT NULL THEN
    INSERT INTO public.project_leads (project_id, lead_id)
    VALUES (NEW.project_id, NEW.user_id)
    ON CONFLICT (project_id, lead_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_lead_projects
  AFTER INSERT OR UPDATE OF role, project_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_lead_projects();

-- Bring existing data in line with the rule above.
INSERT INTO public.project_leads (project_id, lead_id)
SELECT project_id, user_id FROM public.profiles
WHERE role = 'lead' AND project_id IS NOT NULL
ON CONFLICT (project_id, lead_id) DO NOTHING;

DELETE FROM public.project_leads pl
USING public.profiles p
WHERE p.user_id = pl.lead_id AND p.role = 'analyst';

-- ---------------------------------------------------------------------------
-- Delete a user account (login included) and everything that cascades
-- from it: profile, tasks, absence requests, learning progress,
-- notifications. Admin accounts can't be deleted this way; demote first.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE user_id = _user_id;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_role = 'admin' THEN
    RAISE EXCEPTION 'Admins cannot be deleted; change their role first' USING ERRCODE = '42501';
  END IF;

  -- approved_by has no ON DELETE rule; keep the absences, drop the link.
  UPDATE public.absence_requests SET approved_by = NULL WHERE approved_by = _user_id;

  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
