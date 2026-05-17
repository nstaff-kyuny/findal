
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('seeker','employer','admin');
CREATE TYPE public.nationality AS ENUM ('foreigner','korean');
CREATE TYPE public.experience_level AS ENUM ('lt5','gte5');
CREATE TYPE public.visa_status AS ENUM ('student','jobseeker','resident','other');
CREATE TYPE public.industry AS ENUM ('hotel','motel','resort','restaurant','hospital','nursing');
CREATE TYPE public.job_role AS ENUM ('room_cleaning','dish_cleaning','hall_serving','care');
CREATE TYPE public.application_status AS ENUM ('pending','approved','rejected','cancelled');
CREATE TYPE public.credit_tx_type AS ENUM ('purchase','approval_use','promotion_use','admin_grant','signup_bonus');
CREATE TYPE public.promotion_duration AS ENUM ('d2','d5','d10');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

-- ============ REFERRERS ============
CREATE TABLE public.referrers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  note TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrers ENABLE ROW LEVEL SECURITY;

-- ============ SEEKER PROFILES ============
CREATE TABLE public.seeker_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nationality nationality NOT NULL,
  experience experience_level NOT NULL,
  korean_ok BOOLEAN NOT NULL DEFAULT false,
  visa visa_status,
  referrer_code TEXT,
  preferred_region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seeker_profiles ENABLE ROW LEVEL SECURITY;

-- ============ EMPLOYER PROFILES ============
CREATE TABLE public.employer_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  location TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  credits INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;

-- ============ JOBS ============
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  industry industry NOT NULL,
  job_role job_role NOT NULL,
  title TEXT NOT NULL,
  place_name TEXT NOT NULL,
  location TEXT NOT NULL,
  region TEXT,
  photo_url TEXT,
  daily_wage INT NOT NULL,
  pay_day TEXT NOT NULL,
  preparations TEXT,
  contact_phone TEXT NOT NULL,
  work_dates DATE[] NOT NULL DEFAULT '{}',
  rooms_per_day INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX jobs_active_idx ON public.jobs(is_active, created_at DESC);

-- enforce: hotel/motel/resort + room_cleaning -> rooms_per_day required
CREATE OR REPLACE FUNCTION public.validate_job() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.industry IN ('hotel','motel','resort') AND NEW.job_role = 'room_cleaning' THEN
    IF NEW.rooms_per_day IS NULL OR NEW.rooms_per_day <= 0 THEN
      RAISE EXCEPTION '객실청소 공고는 일일 객실수를 입력해야 합니다';
    END IF;
  END IF;
  -- max 20 active jobs per employer
  IF NEW.is_active AND (TG_OP = 'INSERT' OR (TG_OP='UPDATE' AND OLD.is_active = false)) THEN
    IF (SELECT COUNT(*) FROM public.jobs WHERE employer_id = NEW.employer_id AND is_active = true) >= 20 THEN
      RAISE EXCEPTION '활성 공고는 최대 20개까지만 등록할 수 있습니다';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_job BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.validate_job();

-- ============ JOB APPLICATIONS ============
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  seeker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  UNIQUE(job_id, seeker_id)
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE INDEX app_seeker_idx ON public.job_applications(seeker_id, created_at DESC);
CREATE INDEX app_employer_idx ON public.job_applications(employer_id, created_at DESC);

-- ============ CREDIT TRANSACTIONS ============
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INT NOT NULL,
  type credit_tx_type NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- ============ PROMOTED JOBS ============
CREATE TABLE public.promoted_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration promotion_duration NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  credits_spent INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.promoted_jobs ENABLE ROW LEVEL SECURITY;

-- ============ AD BANNERS ============
CREATE TABLE public.ad_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_banners ENABLE ROW LEVEL SECURITY;

-- ============ CREDIT PURCHASE REQUESTS ============
CREATE TABLE public.credit_purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack INT NOT NULL, -- 20, 50, 100
  amount_krw INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_purchase_requests ENABLE ROW LEVEL SECURITY;

-- ============ TRIGGER: handle_new_user ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============
-- profiles
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own role at signup" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND role <> 'admin');
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- referrers: anyone authenticated can read active codes for validation; admin manages
CREATE POLICY "read referrers" ON public.referrers FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage referrers" ON public.referrers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- seeker_profiles
CREATE POLICY "seeker read own" ON public.seeker_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "seeker insert own" ON public.seeker_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "seeker update own" ON public.seeker_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- employer_profiles
CREATE POLICY "employer read own" ON public.employer_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "employer insert own" ON public.employer_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "employer update own" ON public.employer_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin update employer" ON public.employer_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- jobs: anyone authenticated can see active jobs; employer manages own
CREATE POLICY "read active jobs" ON public.jobs FOR SELECT TO authenticated USING (is_active = true OR employer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "employer insert job" ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = employer_id AND public.has_role(auth.uid(),'employer'));
CREATE POLICY "employer update own job" ON public.jobs FOR UPDATE TO authenticated USING (auth.uid() = employer_id);
CREATE POLICY "employer delete own job" ON public.jobs FOR DELETE TO authenticated USING (auth.uid() = employer_id);

-- job_applications
CREATE POLICY "see related apps" ON public.job_applications FOR SELECT TO authenticated USING (seeker_id = auth.uid() OR employer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "seeker create app" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (seeker_id = auth.uid() AND public.has_role(auth.uid(),'seeker'));
CREATE POLICY "seeker cancel own app" ON public.job_applications FOR UPDATE TO authenticated USING (seeker_id = auth.uid());
CREATE POLICY "employer update app" ON public.job_applications FOR UPDATE TO authenticated USING (employer_id = auth.uid());

-- credit_transactions
CREATE POLICY "employer read own tx" ON public.credit_transactions FOR SELECT TO authenticated USING (employer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert tx" ON public.credit_transactions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- promoted_jobs (public to authenticated)
CREATE POLICY "read promotions" ON public.promoted_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "employer insert own promotion" ON public.promoted_jobs FOR INSERT TO authenticated WITH CHECK (employer_id = auth.uid());

-- ad_banners
CREATE POLICY "read banners" ON public.ad_banners FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage banners" ON public.ad_banners FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- credit_purchase_requests
CREATE POLICY "employer see own req" ON public.credit_purchase_requests FOR SELECT TO authenticated USING (employer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "employer insert own req" ON public.credit_purchase_requests FOR INSERT TO authenticated WITH CHECK (employer_id = auth.uid());
CREATE POLICY "admin update req" ON public.credit_purchase_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ APPROVE APPLICATION FUNCTION (atomic) ============
CREATE OR REPLACE FUNCTION public.approve_application(_app_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _emp UUID; _credits INT; _status application_status;
BEGIN
  SELECT employer_id, status INTO _emp, _status FROM public.job_applications WHERE id = _app_id;
  IF _emp IS NULL THEN RAISE EXCEPTION '신청을 찾을 수 없습니다'; END IF;
  IF _emp <> auth.uid() THEN RAISE EXCEPTION '권한 없음'; END IF;
  IF _status <> 'pending' THEN RAISE EXCEPTION '이미 처리된 신청입니다'; END IF;

  SELECT credits INTO _credits FROM public.employer_profiles WHERE user_id = _emp FOR UPDATE;
  IF _credits IS NULL OR _credits < 1 THEN RAISE EXCEPTION '크레딧이 부족합니다'; END IF;

  UPDATE public.employer_profiles SET credits = credits - 1 WHERE user_id = _emp;
  UPDATE public.job_applications SET status='approved', approved_at = now() WHERE id = _app_id;
  INSERT INTO public.credit_transactions(employer_id, delta, type, note) VALUES (_emp, -1, 'approval_use', '신청 승인: '||_app_id);
  RETURN jsonb_build_object('ok', true, 'remaining', _credits - 1);
END $$;

-- ============ PROMOTE JOB FUNCTION ============
CREATE OR REPLACE FUNCTION public.promote_job(_job_id UUID, _duration promotion_duration)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _emp UUID; _cost INT; _days INT; _credits INT;
BEGIN
  SELECT employer_id INTO _emp FROM public.jobs WHERE id = _job_id;
  IF _emp <> auth.uid() THEN RAISE EXCEPTION '권한 없음'; END IF;
  _cost := CASE _duration WHEN 'd2' THEN 10 WHEN 'd5' THEN 20 WHEN 'd10' THEN 25 END;
  _days := CASE _duration WHEN 'd2' THEN 2 WHEN 'd5' THEN 5 WHEN 'd10' THEN 10 END;

  SELECT credits INTO _credits FROM public.employer_profiles WHERE user_id = _emp FOR UPDATE;
  IF _credits < _cost THEN RAISE EXCEPTION '크레딧이 부족합니다'; END IF;

  UPDATE public.employer_profiles SET credits = credits - _cost WHERE user_id = _emp;
  INSERT INTO public.promoted_jobs(job_id, employer_id, duration, ends_at, credits_spent)
    VALUES (_job_id, _emp, _duration, now() + (_days||' days')::interval, _cost);
  INSERT INTO public.credit_transactions(employer_id, delta, type, note) VALUES (_emp, -_cost, 'promotion_use', '광고: '||_days||'일');
  RETURN jsonb_build_object('ok', true);
END $$;

-- ============ ADMIN GRANT CREDITS ============
CREATE OR REPLACE FUNCTION public.admin_grant_credits(_employer UUID, _amount INT, _note TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION '관리자 권한 필요'; END IF;
  UPDATE public.employer_profiles SET credits = credits + _amount WHERE user_id = _employer;
  INSERT INTO public.credit_transactions(employer_id, delta, type, note) VALUES (_employer, _amount, 'admin_grant', COALESCE(_note,'관리자 지급'));
  RETURN jsonb_build_object('ok', true);
END $$;

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('job-photos','job-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read job photos" ON storage.objects FOR SELECT USING (bucket_id = 'job-photos');
CREATE POLICY "auth upload job photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "owner update job photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "owner delete job photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- signup bonus: when employer profile is created, log signup bonus
CREATE OR REPLACE FUNCTION public.log_signup_bonus() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.credit_transactions(employer_id, delta, type, note) VALUES (NEW.user_id, NEW.credits, 'signup_bonus', '가입 보너스');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_employer_signup_bonus AFTER INSERT ON public.employer_profiles
FOR EACH ROW EXECUTE FUNCTION public.log_signup_bonus();
