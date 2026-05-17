CREATE POLICY "employer read applicant profile"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.job_applications ja
    WHERE ja.seeker_id = profiles.id AND ja.employer_id = auth.uid()
  )
);

CREATE POLICY "employer read applicant seeker profile"
ON public.seeker_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.job_applications ja
    WHERE ja.seeker_id = seeker_profiles.user_id AND ja.employer_id = auth.uid()
  )
);