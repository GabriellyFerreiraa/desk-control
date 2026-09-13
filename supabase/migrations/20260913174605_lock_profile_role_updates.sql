-- Fix: self-service privilege escalation via the profiles UPDATE policies.
--
-- Both existing UPDATE policies on public.profiles have no WITH CHECK
-- clause, so a user could run
--   update({ role: 'admin' }).eq('user_id', myUserId)
-- and Postgres would accept it, since the USING predicate (which is
-- reused as the check when WITH CHECK is omitted) never references the
-- `role` column.
--
-- This migration adds an explicit WITH CHECK to both policies:
--   - A self-editing user can still update any of their own profile
--     fields, but the new row's `role` must equal the current one.
--   - A lead/admin retains full write access, including legitimately
--     promoting/demoting another user's role.

DROP POLICY "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY "Leads can update analyst profiles" ON public.profiles;
CREATE POLICY "Leads can update analyst profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'lead') OR
  public.has_role(auth.uid(), 'admin') OR
  auth.uid() = user_id
)
WITH CHECK (
  -- Leads/admins may change any field, including role (legitimate promotion path).
  public.has_role(auth.uid(), 'lead') OR
  public.has_role(auth.uid(), 'admin') OR
  -- A regular user only reaches this policy via the self-edit clause above,
  -- so role must stay unchanged for them too.
  (auth.uid() = user_id AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()))
);

-- Fix: signup trigger trusted client-supplied role metadata.
--
-- handle_new_user() previously read NEW.raw_user_meta_data->>'role' and
-- honored 'lead'/'admin' if the client's signup request included it —
-- exploitable via a raw API call outside the UI, independent of the
-- policy fix above. Every new signup now always gets 'analyst'; promoting
-- someone to lead/admin requires an already-privileged user to do it via
-- the "Leads can update analyst profiles" policy above.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    'analyst'::public.app_role
  );
  RETURN NEW;
END;
$$;
