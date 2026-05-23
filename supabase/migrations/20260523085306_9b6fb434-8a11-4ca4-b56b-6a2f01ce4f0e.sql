
-- 1. user_roles: explicit admin-only DELETE policy to prevent role switching
CREATE POLICY "admin only delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Tighten insert: prevent users from inserting additional roles once they have one
DROP POLICY IF EXISTS "insert own role at signup" ON public.user_roles;
CREATE POLICY "insert own role at signup" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role <> 'admin'::app_role
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

-- 2. company_info: restrict admin INSERT/UPDATE policies from public to authenticated
DROP POLICY IF EXISTS "company_info_admin_insert" ON public.company_info;
DROP POLICY IF EXISTS "company_info_admin_update" ON public.company_info;

CREATE POLICY "company_info_admin_insert" ON public.company_info
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "company_info_admin_update" ON public.company_info
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. promoted_jobs: restrict full row access to owner/admin; expose minimal public view
DROP POLICY IF EXISTS "read promotions" ON public.promoted_jobs;
CREATE POLICY "owner or admin read promotions" ON public.promoted_jobs
  FOR SELECT TO authenticated
  USING ((employer_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Public-safe view: only job_id + time window (no employer_id, no credits_spent)
CREATE OR REPLACE VIEW public.promoted_jobs_public
WITH (security_invoker = false) AS
SELECT id, job_id, starts_at, ends_at, created_at
FROM public.promoted_jobs;

GRANT SELECT ON public.promoted_jobs_public TO authenticated, anon;
