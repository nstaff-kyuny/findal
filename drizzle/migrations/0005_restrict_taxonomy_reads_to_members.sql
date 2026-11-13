DROP POLICY IF EXISTS "read custom_industries" ON public.custom_industries;
CREATE POLICY "members read custom_industries"
ON public.custom_industries
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'seeker'::public.app_role)
  OR public.has_role(auth.uid(), 'employer'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);

DROP POLICY IF EXISTS "read custom_job_roles" ON public.custom_job_roles;
CREATE POLICY "members read custom_job_roles"
ON public.custom_job_roles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'seeker'::public.app_role)
  OR public.has_role(auth.uid(), 'employer'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);