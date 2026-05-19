-- Remove 20 active-jobs limit and add referrer_code to employer_profiles
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
  NEW.updated_at := now();
  RETURN NEW;
END $function$;

ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS referrer_code text;