ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS admin_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_hidden_reason text,
  ADD COLUMN IF NOT EXISTS admin_hidden_at timestamptz;

-- Only admins may change the admin-hidden fields, and a hidden job cannot be re-activated by a non-admin
CREATE OR REPLACE FUNCTION public.guard_job_admin_hidden()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE _is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- server/service context
  _is_admin := public.has_role(auth.uid(), 'admin');
  IF _is_admin THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.admin_hidden := false;
    NEW.admin_hidden_reason := NULL;
    NEW.admin_hidden_at := NULL;
    RETURN NEW;
  END IF;
  IF NEW.admin_hidden IS DISTINCT FROM OLD.admin_hidden
     OR NEW.admin_hidden_reason IS DISTINCT FROM OLD.admin_hidden_reason
     OR NEW.admin_hidden_at IS DISTINCT FROM OLD.admin_hidden_at THEN
    RAISE EXCEPTION 'ADMIN_HIDDEN: 관리자 비노출 설정은 관리자만 변경할 수 있습니다';
  END IF;
  IF OLD.admin_hidden AND NEW.is_active THEN
    RAISE EXCEPTION 'ADMIN_HIDDEN: 관리자에 의해 비노출 처리된 공고입니다. 고객센터로 문의해 주세요.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_job_admin_hidden ON public.jobs;
CREATE TRIGGER trg_guard_job_admin_hidden
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.guard_job_admin_hidden();

-- Admin action: hide / unhide a job, and notify the employer
CREATE OR REPLACE FUNCTION public.admin_set_job_hidden(_job_id uuid, _hidden boolean, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _emp uuid; _title text; _place text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION '관리자 권한 필요'; END IF;
  SELECT employer_id, title, place_name INTO _emp, _title, _place FROM public.jobs WHERE id = _job_id;
  IF _emp IS NULL THEN RAISE EXCEPTION '공고를 찾을 수 없습니다'; END IF;

  IF _hidden THEN
    UPDATE public.jobs
       SET admin_hidden = true, is_active = false,
           admin_hidden_reason = NULLIF(trim(COALESCE(_reason, '')), ''),
           admin_hidden_at = now()
     WHERE id = _job_id;
    INSERT INTO public.notifications(user_id, type, title, body, link_url)
    VALUES (_emp, 'job_hidden', '공고가 비노출 처리되었습니다',
      '[' || COALESCE(_place, _title, '공고') || '] 공고가 관리자에 의해 비노출 처리되었습니다.'
        || COALESCE(' 사유: ' || NULLIF(trim(COALESCE(_reason, '')), ''), ''),
      '/employer/jobs');
  ELSE
    UPDATE public.jobs
       SET admin_hidden = false, admin_hidden_reason = NULL, admin_hidden_at = NULL, is_active = true
     WHERE id = _job_id;
    INSERT INTO public.notifications(user_id, type, title, body, link_url)
    VALUES (_emp, 'job_unhidden', '공고 노출이 다시 허용되었습니다',
      '[' || COALESCE(_place, _title, '공고') || '] 공고가 다시 노출됩니다.',
      '/employer/jobs');
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.admin_set_job_hidden(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_job_hidden(uuid, boolean, text) TO authenticated;

-- Hidden jobs never show to the public, even if is_active were somehow true
DROP POLICY IF EXISTS "public read active jobs" ON public.jobs;
CREATE POLICY "public read active jobs" ON public.jobs FOR SELECT TO anon
  USING (is_active = true AND admin_hidden = false);

DROP POLICY IF EXISTS "read active jobs" ON public.jobs;
CREATE POLICY "read active jobs" ON public.jobs FOR SELECT TO authenticated
  USING ((is_active = true AND admin_hidden = false) OR employer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));