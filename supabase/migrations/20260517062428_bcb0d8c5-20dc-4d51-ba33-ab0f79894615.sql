
-- Notification prefs
ALTER TABLE public.seeker_profiles ADD COLUMN IF NOT EXISTS notify_push boolean NOT NULL DEFAULT true;
ALTER TABLE public.seeker_profiles ADD COLUMN IF NOT EXISTS notify_marketing boolean NOT NULL DEFAULT false;
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS notify_push boolean NOT NULL DEFAULT true;
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS notify_marketing boolean NOT NULL DEFAULT false;

-- Purchase: add payment reference (online purchase)
ALTER TABLE public.credit_purchase_requests ADD COLUMN IF NOT EXISTS payment_ref text;
ALTER TABLE public.credit_purchase_requests ADD COLUMN IF NOT EXISTS payment_method text;

-- App version
CREATE TABLE IF NOT EXISTS public.app_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  notes text,
  is_latest boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_version ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read app_version" ON public.app_version FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage app_version" ON public.app_version FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.app_version (version, notes, is_latest) VALUES ('1.0.0', '최초 릴리즈', true) ON CONFLICT DO NOTHING;

-- Notices
CREATE TABLE IF NOT EXISTS public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read notices" ON public.notices FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage notices" ON public.notices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Events (popup)
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  image_url text,
  link_url text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read events" ON public.events FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage events" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- FAQs
CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read faqs" ON public.faqs FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage faqs" ON public.faqs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 1:1 Inquiries
CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  answer text,
  answered_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user read own inquiry" ON public.inquiries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user create own inquiry" ON public.inquiries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin update inquiry" ON public.inquiries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
