-- Phase 5 (see docs/learning-spec.md): the language picked on the sign-up
-- page becomes the new profile's language, so the app doesn't switch back
-- to English on the first sign-in.
--
-- Same function as 20260913174605_lock_profile_role_updates.sql plus the
-- language column: every signup is still an analyst (the role is never
-- read from client metadata) and starts as 'pending' (column default).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    'analyst'::public.app_role,
    CASE
      WHEN NEW.raw_user_meta_data ->> 'language' IN ('en', 'es', 'pt')
        THEN NEW.raw_user_meta_data ->> 'language'
      ELSE 'en'
    END
  );
  RETURN NEW;
END;
$$;
