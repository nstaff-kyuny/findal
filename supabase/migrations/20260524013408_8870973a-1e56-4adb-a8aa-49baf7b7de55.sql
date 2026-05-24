DROP POLICY IF EXISTS "public read job photos" ON storage.objects;
CREATE POLICY "public read job photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'job-photos');