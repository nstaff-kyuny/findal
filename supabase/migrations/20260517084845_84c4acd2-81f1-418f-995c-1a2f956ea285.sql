
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-icons', 'app-icons', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "App icons public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-icons');

CREATE POLICY "Admins can upload app icons"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'app-icons' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app icons"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'app-icons' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete app icons"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'app-icons' AND public.has_role(auth.uid(), 'admin'));
