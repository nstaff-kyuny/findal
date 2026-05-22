
CREATE TABLE public.company_info (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  name text NOT NULL DEFAULT '',
  ceo text NOT NULL DEFAULT '',
  biz_no text NOT NULL DEFAULT '',
  mail_order_no text NOT NULL DEFAULT '',
  app_name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_info_select_all" ON public.company_info FOR SELECT USING (true);
CREATE POLICY "company_info_admin_insert" ON public.company_info FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "company_info_admin_update" ON public.company_info FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

INSERT INTO public.company_info (id, name, ceo, biz_no, mail_order_no, app_name)
VALUES (true, '(주)엔스태프', '김학균', '000-00-00000', '000-000-00000', 'Find AR (파인달)')
ON CONFLICT (id) DO NOTHING;
