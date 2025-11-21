-- Note: storage.objects usually has RLS enabled by default.
-- We skip 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;' to avoid ownership errors.

-- 1. Policy for 'attachments' bucket
DROP POLICY IF EXISTS "Public Access to Attachments" ON storage.objects;
CREATE POLICY "Public Access to Attachments"
ON storage.objects FOR SELECT
USING ( bucket_id = 'attachments' );

DROP POLICY IF EXISTS "Authenticated Users can Upload Attachments" ON storage.objects;
CREATE POLICY "Authenticated Users can Upload Attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'attachments' );

DROP POLICY IF EXISTS "Users can Update their own Attachments" ON storage.objects;
CREATE POLICY "Users can Update their own Attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'attachments' AND owner = auth.uid() );

DROP POLICY IF EXISTS "Users can Delete their own Attachments" ON storage.objects;
CREATE POLICY "Users can Delete their own Attachments"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'attachments' AND owner = auth.uid() );


-- 2. Policy for 'protocols' bucket
DROP POLICY IF EXISTS "Public Access to Protocols" ON storage.objects;
CREATE POLICY "Public Access to Protocols"
ON storage.objects FOR SELECT
USING ( bucket_id = 'protocols' );

DROP POLICY IF EXISTS "Authenticated Users can Upload Protocols" ON storage.objects;
CREATE POLICY "Authenticated Users can Upload Protocols"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'protocols' );

DROP POLICY IF EXISTS "Users can Update their own Protocols" ON storage.objects;
CREATE POLICY "Users can Update their own Protocols"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'protocols' AND owner = auth.uid() );

DROP POLICY IF EXISTS "Users can Delete their own Protocols" ON storage.objects;
CREATE POLICY "Users can Delete their own Protocols"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'protocols' AND owner = auth.uid() );


-- 3. Policy for 'gel-images' bucket
DROP POLICY IF EXISTS "Public Access to Gel Images" ON storage.objects;
CREATE POLICY "Public Access to Gel Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'gel-images' );

DROP POLICY IF EXISTS "Authenticated Users can Upload Gel Images" ON storage.objects;
CREATE POLICY "Authenticated Users can Upload Gel Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'gel-images' );

DROP POLICY IF EXISTS "Users can Update their own Gel Images" ON storage.objects;
CREATE POLICY "Users can Update their own Gel Images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'gel-images' AND owner = auth.uid() );

DROP POLICY IF EXISTS "Users can Delete their own Gel Images" ON storage.objects;
CREATE POLICY "Users can Delete their own Gel Images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'gel-images' AND owner = auth.uid() );
