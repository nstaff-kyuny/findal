
-- Fix ineffective self-referential RLS checks by enforcing immutability via trigger
CREATE OR REPLACE FUNCTION public.enforce_job_application_immutable_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.seeker_id IS DISTINCT FROM OLD.seeker_id THEN
    RAISE EXCEPTION 'seeker_id cannot be changed';
  END IF;
  IF NEW.job_id IS DISTINCT FROM OLD.job_id THEN
    RAISE EXCEPTION 'job_id cannot be changed';
  END IF;
  IF NEW.employer_id IS DISTINCT FROM OLD.employer_id THEN
    RAISE EXCEPTION 'employer_id cannot be changed';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS job_applications_immutable_fields ON public.job_applications;
CREATE TRIGGER job_applications_immutable_fields
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_job_application_immutable_fields();

-- Replace ineffective WITH CHECK subqueries with simple owner check (trigger enforces immutability)
DROP POLICY IF EXISTS "employer update app" ON public.job_applications;
CREATE POLICY "employer update app" ON public.job_applications
  FOR UPDATE TO authenticated
  USING (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

DROP POLICY IF EXISTS "seeker cancel own app" ON public.job_applications;
CREATE POLICY "seeker cancel own app" ON public.job_applications
  FOR UPDATE TO authenticated
  USING (seeker_id = auth.uid())
  WITH CHECK (seeker_id = auth.uid() AND status = 'cancelled'::application_status);

-- Restrict company_info: remove broad authenticated SELECT; expose safe fields via SECURITY DEFINER RPC
DROP POLICY IF EXISTS "company_info_select_authenticated" ON public.company_info;

CREATE OR REPLACE FUNCTION public.get_company_info()
RETURNS TABLE(
  name text, ceo text, biz_no text, mail_order_no text, app_name text,
  address text, phone text, email text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT name, ceo, biz_no, mail_order_no, app_name, address, phone, email
  FROM public.company_info WHERE id = true LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_company_info() TO anon, authenticated;
