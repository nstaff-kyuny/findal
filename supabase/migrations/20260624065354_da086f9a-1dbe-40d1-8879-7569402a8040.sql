
CREATE TABLE public.cron_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cron_config TO authenticated;
GRANT ALL ON public.cron_config TO service_role;

ALTER TABLE public.cron_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage cron_config"
ON public.cron_config FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.cron_config (key, value)
VALUES ('backup_secret', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
ON CONFLICT (key) DO NOTHING;
