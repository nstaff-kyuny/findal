-- 6번: 필요인원 초과 승인 차단 - approve_application 함수 강화
CREATE OR REPLACE FUNCTION public.approve_application(_app_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _emp UUID; _credits INT; _status application_status;
  _job_id UUID; _headcount INT; _approved_count INT;
BEGIN
  SELECT employer_id, status, job_id INTO _emp, _status, _job_id FROM public.job_applications WHERE id = _app_id;
  IF _emp IS NULL THEN RAISE EXCEPTION '신청을 찾을 수 없습니다'; END IF;
  IF _emp <> auth.uid() THEN RAISE EXCEPTION '권한 없음'; END IF;
  IF _status <> 'pending' THEN RAISE EXCEPTION '이미 처리된 신청입니다'; END IF;

  -- 필요인원 초과 차단
  SELECT headcount INTO _headcount FROM public.jobs WHERE id = _job_id;
  SELECT count(*) INTO _approved_count FROM public.job_applications
    WHERE job_id = _job_id AND status IN ('approved','confirmed');
  IF _approved_count >= COALESCE(_headcount, 1) THEN
    RAISE EXCEPTION 'HEADCOUNT_FULL: 필요인원(%)을 모두 채웠습니다. 더 이상 승인할 수 없습니다.', _headcount;
  END IF;

  SELECT credits INTO _credits FROM public.employer_profiles WHERE user_id = _emp FOR UPDATE;
  IF _credits IS NULL OR _credits < 1 THEN RAISE EXCEPTION '크레딧이 부족합니다'; END IF;

  UPDATE public.employer_profiles SET credits = credits - 1 WHERE user_id = _emp;
  UPDATE public.job_applications SET status='approved', approved_at = now() WHERE id = _app_id;
  INSERT INTO public.credit_transactions(employer_id, delta, type, note) VALUES (_emp, -1, 'approval_use', '신청 승인: '||_app_id);

  -- 정원이 모두 차면 공고 자동 비활성화
  IF (_approved_count + 1) >= COALESCE(_headcount, 1) THEN
    UPDATE public.jobs SET is_active = false WHERE id = _job_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'remaining', _credits - 1);
END $function$;