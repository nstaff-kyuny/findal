CREATE TABLE public.legal_documents (
  kind text PRIMARY KEY,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.legal_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_documents TO authenticated;
GRANT ALL ON public.legal_documents TO service_role;

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_documents readable by all"
ON public.legal_documents FOR SELECT
USING (true);

CREATE POLICY "legal_documents admin insert"
ON public.legal_documents FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "legal_documents admin update"
ON public.legal_documents FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "legal_documents admin delete"
ON public.legal_documents FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER legal_documents_touch_updated_at
BEFORE UPDATE ON public.legal_documents
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.legal_documents (kind, content) VALUES
('terms', ''),
('privacy', ''),
('refund', '')
ON CONFLICT (kind) DO NOTHING;