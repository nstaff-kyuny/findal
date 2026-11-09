ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS cancelled_by text;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- 누가 취소했는지 서버에서 결정 (클라이언트 값 무시)
CREATE OR REPLACE FUNCTION public.set_application_cancelled_by()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    NEW.cancelled_by := CASE WHEN auth.uid() = NEW.employer_id THEN 'employer' ELSE 'seeker' END;
    NEW.cancelled_at := now();
  ELSIF NEW.status <> 'cancelled' THEN
    NEW.cancelled_by := NULL;
    NEW.cancelled_at := NULL;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS job_applications_cancelled_by ON public.job_applications;
CREATE TRIGGER job_applications_cancelled_by
BEFORE UPDATE ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.set_application_cancelled_by();

-- 구인자 출근 취소 (승인/출근확정 → 취소, 크레딧 반환 없음)
CREATE OR REPLACE FUNCTION public.employer_cancel_application(_app_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _emp UUID; _status application_status;
BEGIN
  SELECT employer_id, status INTO _emp, _status FROM public.job_applications WHERE id = _app_id;
  IF _emp IS NULL THEN RAISE EXCEPTION '신청을 찾을 수 없습니다'; END IF;
  IF _emp <> auth.uid() THEN RAISE EXCEPTION '권한 없음'; END IF;
  IF _status NOT IN ('approved','confirmed') THEN RAISE EXCEPTION '승인 또는 출근 확정된 신청만 출근 취소할 수 있습니다'; END IF;
  UPDATE public.job_applications SET status = 'cancelled' WHERE id = _app_id;
  RETURN jsonb_build_object('ok', true, 'credit_refunded', false);
END $function$;

REVOKE ALL ON FUNCTION public.employer_cancel_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employer_cancel_application(uuid) TO authenticated;

-- 알림: 구인자가 취소한 경우 구직자에게 알림
CREATE OR REPLACE FUNCTION public.notify_application_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _job_title TEXT;
  _place TEXT;
  _seeker_name TEXT;
BEGIN
  SELECT title, place_name INTO _job_title, _place FROM public.jobs WHERE id = NEW.job_id;

  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO _seeker_name FROM public.profiles WHERE id = NEW.seeker_id;
    INSERT INTO public.notifications(user_id, type, title, body, link_url)
    VALUES (NEW.employer_id, 'new_application',
      '새 일하기 신청',
      COALESCE(_seeker_name,'구직자') || '님이 ['|| COALESCE(_place,_job_title,'공고') ||']에 신청했습니다',
      '/employer/applications');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link_url)
      VALUES (NEW.seeker_id, 'approved', '신청이 승인되었습니다',
        '['|| COALESCE(_place,_job_title,'공고') ||'] 신청이 승인되었습니다. 확정해 주세요.',
        '/seeker/applications');
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link_url)
      VALUES (NEW.seeker_id, 'rejected', '신청이 거절되었습니다',
        '['|| COALESCE(_place,_job_title,'공고') ||'] 신청이 거절되었습니다.',
        '/seeker/applications');
    ELSIF NEW.status = 'confirmed' THEN
      SELECT full_name INTO _seeker_name FROM public.profiles WHERE id = NEW.seeker_id;
      INSERT INTO public.notifications(user_id, type, title, body, link_url)
      VALUES (NEW.employer_id, 'confirmed', '구직자가 확정했습니다',
        COALESCE(_seeker_name,'구직자') || '님이 ['|| COALESCE(_place,_job_title,'공고') ||'] 근무를 확정했습니다.',
        '/employer/applications');
    ELSIF NEW.status = 'cancelled' THEN
      IF NEW.cancelled_by = 'employer' THEN
        INSERT INTO public.notifications(user_id, type, title, body, link_url)
        VALUES (NEW.seeker_id, 'cancelled', '출근이 취소되었습니다',
          '['|| COALESCE(_place,_job_title,'공고') ||'] 구인처에서 출근을 취소했습니다.',
          '/seeker/applications');
      ELSE
        SELECT full_name INTO _seeker_name FROM public.profiles WHERE id = NEW.seeker_id;
        INSERT INTO public.notifications(user_id, type, title, body, link_url)
        VALUES (NEW.employer_id, 'cancelled', '신청이 취소되었습니다',
          COALESCE(_seeker_name,'구직자') || '님이 ['|| COALESCE(_place,_job_title,'공고') ||'] 신청을 취소했습니다.',
          '/employer/applications');
      END IF;
    ELSIF NEW.status = 'no_show' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link_url)
      VALUES (NEW.seeker_id, 'no_show', '노쇼 처리되었습니다',
        '['|| COALESCE(_place,_job_title,'공고') ||']에서 노쇼 처리되었습니다.',
        '/seeker/applications');
    END IF;
  END IF;
  RETURN NEW;
END $function$;