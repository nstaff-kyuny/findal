-- Allow employer to read applicant profile/seeker_profile for no_show as well (so names stay visible after marking no-show)
DROP POLICY IF EXISTS "employer read applicant profile" ON public.profiles;
CREATE POLICY "employer read applicant profile"
ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.job_applications ja
  WHERE ja.seeker_id = profiles.id
    AND ja.employer_id = auth.uid()
    AND ja.status IN ('approved','confirmed','no_show')
));

DROP POLICY IF EXISTS "employer read applicant seeker profile" ON public.seeker_profiles;
CREATE POLICY "employer read applicant seeker profile"
ON public.seeker_profiles FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.job_applications ja
  WHERE ja.seeker_id = seeker_profiles.user_id
    AND ja.employer_id = auth.uid()
    AND ja.status IN ('approved','confirmed','no_show')
));

-- RPC to revert a no_show application back to its prior approved/confirmed state
CREATE OR REPLACE FUNCTION public.unmark_no_show(_app_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _emp UUID;
  _status application_status;
  _confirmed_at TIMESTAMPTZ;
  _new_status application_status;
BEGIN
  SELECT employer_id, status, confirmed_at
    INTO _emp, _status, _confirmed_at
  FROM public.job_applications WHERE id = _app_id;
  IF _emp IS NULL THEN RAISE EXCEPTION '신청을 찾을 수 없습니다'; END IF;
  IF _emp <> auth.uid() THEN RAISE EXCEPTION '권한 없음'; END IF;
  IF _status <> 'no_show' THEN RAISE EXCEPTION '노쇼 상태인 신청만 복구할 수 있습니다'; END IF;

  _new_status := CASE WHEN _confirmed_at IS NOT NULL THEN 'confirmed'::application_status ELSE 'approved'::application_status END;

  UPDATE public.job_applications
     SET status = _new_status, no_show_at = NULL
   WHERE id = _app_id;

  RETURN jsonb_build_object('ok', true, 'status', _new_status);
END $$;