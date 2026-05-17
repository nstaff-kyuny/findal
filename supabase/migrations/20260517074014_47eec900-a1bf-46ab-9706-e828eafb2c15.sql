-- 1. Restrict referrers SELECT to admins only
DROP POLICY IF EXISTS "read referrers" ON public.referrers;
CREATE POLICY "admin read referrers" ON public.referrers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Remove broad SELECT policy on job-photos bucket (public URLs still work)
DROP POLICY IF EXISTS "public read job photos" ON storage.objects;

-- 3. Set fixed search_path on validate_job
CREATE OR REPLACE FUNCTION public.validate_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.industry IN ('hotel','motel','resort') AND NEW.job_role = 'room_cleaning' THEN
    IF NEW.rooms_per_day IS NULL OR NEW.rooms_per_day <= 0 THEN
      RAISE EXCEPTION '객실청소 공고는 일일 객실수를 입력해야 합니다';
    END IF;
  END IF;
  IF NEW.is_active AND (TG_OP = 'INSERT' OR (TG_OP='UPDATE' AND OLD.is_active = false)) THEN
    IF (SELECT COUNT(*) FROM public.jobs WHERE employer_id = NEW.employer_id AND is_active = true) >= 20 THEN
      RAISE EXCEPTION '활성 공고는 최대 20개까지만 등록할 수 있습니다';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $function$;