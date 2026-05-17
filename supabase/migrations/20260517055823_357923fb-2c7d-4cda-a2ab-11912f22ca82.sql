
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'no_show';

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.seeker_confirm_application(_app_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _seeker UUID; _status application_status;
BEGIN
  SELECT seeker_id, status INTO _seeker, _status FROM public.job_applications WHERE id=_app_id;
  IF _seeker <> auth.uid() THEN RAISE EXCEPTION '권한 없음'; END IF;
  IF _status <> 'approved' THEN RAISE EXCEPTION '승인된 신청만 확정 가능합니다'; END IF;
  UPDATE public.job_applications SET status='confirmed', confirmed_at=now() WHERE id=_app_id;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.mark_no_show(_app_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _emp UUID; _status application_status;
BEGIN
  SELECT employer_id, status INTO _emp, _status FROM public.job_applications WHERE id=_app_id;
  IF _emp <> auth.uid() THEN RAISE EXCEPTION '권한 없음'; END IF;
  IF _status NOT IN ('approved','confirmed') THEN RAISE EXCEPTION '승인/확정된 신청만 노쇼 처리 가능합니다'; END IF;
  UPDATE public.job_applications SET status='no_show', no_show_at=now() WHERE id=_app_id;
  RETURN jsonb_build_object('ok', true);
END $$;
