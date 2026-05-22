
CREATE OR REPLACE FUNCTION public.promote_job(_job_id uuid, _duration promotion_duration)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _emp UUID; _cost INT; _days INT; _credits INT; _active INT;
BEGIN
  SELECT employer_id INTO _emp FROM public.jobs WHERE id = _job_id;
  IF _emp <> auth.uid() THEN RAISE EXCEPTION '권한 없음'; END IF;

  SELECT count(*) INTO _active FROM public.promoted_jobs WHERE ends_at > now();
  IF _active >= 8 THEN
    RAISE EXCEPTION 'SLOTS_FULL';
  END IF;

  _cost := CASE _duration WHEN 'd2' THEN 10 WHEN 'd5' THEN 20 WHEN 'd10' THEN 25 END;
  _days := CASE _duration WHEN 'd2' THEN 2 WHEN 'd5' THEN 5 WHEN 'd10' THEN 10 END;

  SELECT credits INTO _credits FROM public.employer_profiles WHERE user_id = _emp FOR UPDATE;
  IF _credits < _cost THEN RAISE EXCEPTION '크레딧이 부족합니다'; END IF;

  UPDATE public.employer_profiles SET credits = credits - _cost WHERE user_id = _emp;
  INSERT INTO public.promoted_jobs(job_id, employer_id, duration, ends_at, credits_spent)
    VALUES (_job_id, _emp, _duration, now() + (_days||' days')::interval, _cost);
  INSERT INTO public.credit_transactions(employer_id, delta, type, note) VALUES (_emp, -_cost, 'promotion_use', '광고: '||_days||'일');
  RETURN jsonb_build_object('ok', true);
END $function$;
