
-- 1) job_contacts table
CREATE TABLE IF NOT EXISTS public.job_contacts (
  job_id UUID PRIMARY KEY,
  employer_id UUID NOT NULL,
  contact_phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill from existing jobs
INSERT INTO public.job_contacts (job_id, employer_id, contact_phone)
SELECT id, employer_id, contact_phone FROM public.jobs
WHERE contact_phone IS NOT NULL
ON CONFLICT (job_id) DO NOTHING;

ALTER TABLE public.job_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manage job contacts"
  ON public.job_contacts FOR ALL TO authenticated
  USING (employer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (employer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "approved seekers read contact"
  ON public.job_contacts FOR SELECT TO authenticated
  USING (
    employer_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.job_applications ja
      WHERE ja.job_id = job_contacts.job_id
        AND ja.seeker_id = auth.uid()
        AND ja.status IN ('approved'::application_status, 'confirmed'::application_status)
    )
  );

-- Keep job_contacts in sync when jobs is created/updated/deleted (so existing code keeps working)
CREATE OR REPLACE FUNCTION public.sync_job_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.job_contacts WHERE job_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.contact_phone IS NOT NULL AND NEW.contact_phone <> '' THEN
    INSERT INTO public.job_contacts(job_id, employer_id, contact_phone)
    VALUES (NEW.id, NEW.employer_id, NEW.contact_phone)
    ON CONFLICT (job_id) DO UPDATE
      SET contact_phone = EXCLUDED.contact_phone,
          employer_id = EXCLUDED.employer_id,
          updated_at = now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS jobs_sync_contact ON public.jobs;
CREATE TRIGGER jobs_sync_contact
AFTER INSERT OR UPDATE OF contact_phone, employer_id OR DELETE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.sync_job_contact();

-- Hide contact_phone from base jobs table for general SELECT.
-- Remove column-level read access; owners/admins read it via job_contacts.
REVOKE SELECT (contact_phone) ON public.jobs FROM anon, authenticated;

-- 2) Tighten seeker_profiles employer access to approved/confirmed only
DROP POLICY IF EXISTS "employer read applicant seeker profile" ON public.seeker_profiles;
CREATE POLICY "employer read applicant seeker profile"
  ON public.seeker_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      WHERE ja.seeker_id = seeker_profiles.user_id
        AND ja.employer_id = auth.uid()
        AND ja.status IN ('approved'::application_status, 'confirmed'::application_status)
    )
  );
