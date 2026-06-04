DROP POLICY IF EXISTS "insert own role at signup" ON public.user_roles;

CREATE POLICY "insert own role at signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('seeker'::app_role, 'employer'::app_role)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  )
);