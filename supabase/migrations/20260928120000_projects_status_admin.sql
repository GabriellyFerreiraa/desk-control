-- Phase 1 of the Learning module (see docs/learning-spec.md):
-- projects, leads per project, user status/language, and admin-only
-- control over roles and access.
--
-- The production schema has drifted from the migration history (columns
-- and functions were added straight from the dashboard), so this migration
-- only ADDS objects and never drops policies by name. Access for
-- non-active users is cut with RESTRICTIVE policies, which are ANDed with
-- whatever permissive policies already exist on each table.

-- ---------------------------------------------------------------------------
-- Types and columns
-- ---------------------------------------------------------------------------

CREATE TYPE public.user_status AS ENUM ('pending', 'active', 'inactive');

CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- A project can have several leads and a lead can run several projects.
CREATE TABLE public.project_leads (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, lead_id)
);

CREATE INDEX project_leads_lead_id_idx ON public.project_leads(lead_id);

ALTER TABLE public.profiles
  ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN status public.user_status NOT NULL DEFAULT 'pending',
  ADD COLUMN language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'es', 'pt'));

CREATE INDEX profiles_project_id_idx ON public.profiles(project_id);

INSERT INTO public.projects (name) VALUES ('Merck SD')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = 'admin' AND status = 'active'
  )
$$;

-- ---------------------------------------------------------------------------
-- Only admins can change role, status or project.
--
-- Enforced with a trigger instead of policy WITH CHECK clauses: a trigger
-- sees OLD and NEW directly, so it doesn't depend on which UPDATE policies
-- exist in production (the existing lead policy lets leads edit any column,
-- including role). Requests without a user (SQL editor, service role) are
-- let through, which is how the first admin is bootstrapped.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin(auth.uid()) THEN
      NEW.role := 'analyst';
      NEW.status := 'pending';
      NEW.project_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be changed' USING ERRCODE = '42501';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can change role, status or project'
        USING ERRCODE = '42501';
    END IF;
    -- Keeps an admin from locking themselves out by accident.
    IF NEW.user_id = auth.uid()
       AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status) THEN
      RAISE EXCEPTION 'Admins cannot change their own role or status'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_admin_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_admin_fields();

-- A project's leads must be leads (or admins).
CREATE OR REPLACE FUNCTION public.check_project_lead_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = NEW.lead_id AND role IN ('lead', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only users with the lead or admin role can lead a project'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_project_lead_role
  BEFORE INSERT OR UPDATE ON public.project_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.check_project_lead_role();

-- ---------------------------------------------------------------------------
-- Non-active users (pending approval or deactivated) see nothing but their
-- own profile.
-- ---------------------------------------------------------------------------

CREATE POLICY "Active users only"
ON public.absence_requests
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_active_user(auth.uid()))
WITH CHECK (public.is_active_user(auth.uid()));

CREATE POLICY "Active users only"
ON public.tasks
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_active_user(auth.uid()))
WITH CHECK (public.is_active_user(auth.uid()));

CREATE POLICY "Active users or own profile (read)"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_active_user(auth.uid()));

CREATE POLICY "Active users or own profile (update)"
ON public.profiles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_active_user(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_active_user(auth.uid()));

-- Profiles are created by the signup trigger; only admins insert by hand.
CREATE POLICY "Only admins insert profiles"
ON public.profiles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Projects: readable by active users, managed by admins.
-- ---------------------------------------------------------------------------

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view projects"
ON public.projects
FOR SELECT
TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Admins manage projects"
ON public.projects
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Active users can view project leads"
ON public.project_leads
FOR SELECT
TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Admins manage project leads"
ON public.project_leads
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- User list for the admin screen. Emails live in auth.users, which the
-- client can't read, so this function exposes them to admins only.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  role public.app_role,
  status public.user_status,
  project_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.name, u.email::TEXT, p.avatar_url, p.role, p.status,
         p.project_id, p.created_at, u.last_sign_in_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
