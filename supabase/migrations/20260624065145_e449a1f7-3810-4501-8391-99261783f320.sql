
CREATE TABLE public.backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'manual',
  file_path TEXT,
  size_bytes BIGINT,
  row_counts JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backup_jobs TO authenticated;
GRANT ALL ON public.backup_jobs TO service_role;

ALTER TABLE public.backup_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage backup_jobs"
ON public.backup_jobs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read backups"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'backups' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write backups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'backups' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete backups"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'backups' AND public.has_role(auth.uid(), 'admin'));
