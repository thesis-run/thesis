-- Drop existing policies for documents bucket
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;

-- Recreate with has_role() function (SECURITY DEFINER bypasses RLS)
CREATE POLICY "Admins can upload documents"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update documents"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete documents"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);