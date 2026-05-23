-- Restrict employer's read access to applicant profiles (full_name, phone)
-- to applications that have been approved or confirmed. Before approval,
-- employers should only see the non-PII seeker profile info (experience,
-- nationality, visa, korean_ok) from seeker_profiles, not the seeker's name
-- and phone number.

DROP POLICY IF EXISTS "employer read applicant profile" ON public.profiles;

CREATE POLICY "employer read applicant profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.job_applications ja
    WHERE ja.seeker_id = profiles.id
      AND ja.employer_id = auth.uid()
      AND ja.status IN ('approved'::application_status, 'confirmed'::application_status)
  )
);