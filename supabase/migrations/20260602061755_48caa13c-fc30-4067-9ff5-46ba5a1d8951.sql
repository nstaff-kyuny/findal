
-- 1) Convert jobs.industry / jobs.job_role from enum to TEXT so admins can add custom values
ALTER TABLE public.jobs ALTER COLUMN industry TYPE TEXT USING industry::text;
ALTER TABLE public.jobs ALTER COLUMN job_role TYPE TEXT USING job_role::text;

-- 2) Add contract type columns to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS contract_type TEXT NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS monthly_wage INTEGER,
  ADD COLUMN IF NOT EXISTS contract_months INTEGER;

ALTER TABLE public.jobs ALTER COLUMN daily_wage DROP NOT NULL;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_contract_type_check CHECK (contract_type IN ('daily','monthly'));

-- 3) Validation trigger for contract type wages
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
  IF NEW.contract_type = 'monthly' THEN
    IF NEW.monthly_wage IS NULL OR NEW.monthly_wage <= 0 THEN
      RAISE EXCEPTION '단기계약 공고는 월급여를 입력해야 합니다';
    END IF;
  ELSE
    IF NEW.daily_wage IS NULL OR NEW.daily_wage <= 0 THEN
      RAISE EXCEPTION '일당 공고는 일당을 입력해야 합니다';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $function$;

-- 4) Custom industries table
CREATE TABLE IF NOT EXISTS public.custom_industries (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.custom_industries TO authenticated;
GRANT ALL ON public.custom_industries TO service_role;
ALTER TABLE public.custom_industries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read custom_industries" ON public.custom_industries FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage custom_industries" ON public.custom_industries FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 5) Custom job roles table
CREATE TABLE IF NOT EXISTS public.custom_job_roles (
  key TEXT PRIMARY KEY,
  industry_key TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.custom_job_roles TO authenticated;
GRANT ALL ON public.custom_job_roles TO service_role;
ALTER TABLE public.custom_job_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read custom_job_roles" ON public.custom_job_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage custom_job_roles" ON public.custom_job_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_custom_job_roles_industry ON public.custom_job_roles(industry_key);
