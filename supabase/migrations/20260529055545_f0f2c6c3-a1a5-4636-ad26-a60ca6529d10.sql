
-- 1) Ensure existing contact_phone values are migrated to job_contacts before dropping
INSERT INTO public.job_contacts (job_id, employer_id, contact_phone)
SELECT j.id, j.employer_id, j.contact_phone
FROM public.jobs j
WHERE j.contact_phone IS NOT NULL AND j.contact_phone <> ''
ON CONFLICT (job_id) DO UPDATE
  SET contact_phone = EXCLUDED.contact_phone,
      employer_id   = EXCLUDED.employer_id,
      updated_at    = now();

-- Drop sync trigger that depends on the column, then drop the column
DROP TRIGGER IF EXISTS jobs_sync_contact ON public.jobs;
DROP FUNCTION IF EXISTS public.sync_job_contact();
ALTER TABLE public.jobs DROP COLUMN IF EXISTS contact_phone;

-- 2) Remove client-side insert on notifications (system-generated only via SECURITY DEFINER triggers)
DROP POLICY IF EXISTS "insert own notifications" ON public.notifications;

-- 3) Restrict manager read on user_roles so they cannot see admin assignments
DROP POLICY IF EXISTS "manager read user_roles" ON public.user_roles;
CREATE POLICY "manager read user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) AND role <> 'admin'::app_role);
