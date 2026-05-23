
-- 1) company_info: authenticated only
DROP POLICY IF EXISTS "company_info_select_all" ON public.company_info;
CREATE POLICY "company_info_select_authenticated"
  ON public.company_info FOR SELECT
  TO authenticated USING (true);

-- 2) job_applications employer UPDATE — lock identity columns
DROP POLICY IF EXISTS "employer update app" ON public.job_applications;
CREATE POLICY "employer update app"
  ON public.job_applications FOR UPDATE
  TO authenticated
  USING (employer_id = auth.uid())
  WITH CHECK (
    employer_id = auth.uid()
    AND seeker_id = (SELECT seeker_id FROM public.job_applications ja WHERE ja.id = job_applications.id)
    AND job_id   = (SELECT job_id   FROM public.job_applications ja WHERE ja.id = job_applications.id)
  );

-- 3) job_applications seeker UPDATE — only cancel
DROP POLICY IF EXISTS "seeker cancel own app" ON public.job_applications;
CREATE POLICY "seeker cancel own app"
  ON public.job_applications FOR UPDATE
  TO authenticated
  USING (seeker_id = auth.uid())
  WITH CHECK (
    seeker_id = auth.uid()
    AND status = 'cancelled'::application_status
    AND employer_id = (SELECT employer_id FROM public.job_applications ja WHERE ja.id = job_applications.id)
    AND job_id      = (SELECT job_id      FROM public.job_applications ja WHERE ja.id = job_applications.id)
  );

-- 4) notifications INSERT — restrict to self
DROP POLICY IF EXISTS "insert notifications" ON public.notifications;
CREATE POLICY "insert own notifications"
  ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
