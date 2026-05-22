
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-banners', 'ad-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ad banners public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-banners');

CREATE POLICY "admin upload ad banners"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ad-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update ad banners"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ad-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete ad banners"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ad-banners' AND public.has_role(auth.uid(), 'admin'));
