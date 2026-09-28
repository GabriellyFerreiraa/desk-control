-- ONE-OFF: turns an existing account into the first admin.
-- Run in the Supabase SQL Editor after that account has signed up and
-- confirmed its email. From then on, roles are managed from /admin.
--
-- Replace the email below before running.

UPDATE public.profiles
SET role = 'admin',
    status = 'active',
    project_id = (SELECT id FROM public.projects WHERE name = 'Merck SD')
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE');

-- Should return one row with role = admin and status = active:
SELECT p.name, u.email, p.role, p.status
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'YOUR_EMAIL_HERE';
