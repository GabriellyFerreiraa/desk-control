-- ONE-OFF, DESTRUCTIVE: deletes EVERY user account and all their data.
-- Run in the Supabase SQL Editor only while the project holds test data.
--
-- Deleting from auth.users cascades to public.profiles, and from there to
-- absence_requests, tasks and project_leads.
--
-- Avatar images are NOT removed by this script (Supabase blocks deleting
-- storage objects with SQL). Empty the "avatars" bucket from
-- Storage > avatars in the dashboard.

-- Preview what will be deleted:
SELECT u.email, p.name, p.role, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
ORDER BY u.created_at;

-- Then run:
-- DELETE FROM auth.users;
