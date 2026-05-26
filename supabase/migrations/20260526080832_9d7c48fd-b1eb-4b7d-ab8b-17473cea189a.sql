CREATE OR REPLACE FUNCTION public.seeker_reapply_application(_app_id uuid, _message text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _seeker uuid; _status application_status;
BEGIN
  SELECT seeker_id, status INTO _seeker, _status FROM public.job_applications WHERE id = _app_id;
  IF _seeker IS NULL THEN RAISE EXCEPTION '신청을 찾을 수 없습니다'; END IF;
  IF _seeker <> auth.uid() THEN RAISE EXCEPTION '권한 없음'; END IF;
  IF _status <> 'cancelled' THEN RAISE EXCEPTION '취소된 신청만 재신청 가능합니다'; END IF;
  UPDATE public.job_applications
    SET status = 'pending', message = _message, approved_at = NULL, confirmed_at = NULL, no_show_at = NULL, created_at = now()
   WHERE id = _app_id;
  RETURN jsonb_build_object('ok', true);
END $$;