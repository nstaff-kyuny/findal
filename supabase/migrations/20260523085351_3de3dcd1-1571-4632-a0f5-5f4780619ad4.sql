
DROP VIEW IF EXISTS public.promoted_jobs_public;

CREATE OR REPLACE FUNCTION public.get_active_promoted_jobs()
RETURNS TABLE(job_id uuid, starts_at timestamptz, ends_at timestamptz, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT job_id, starts_at, ends_at, created_at
  FROM public.promoted_jobs
  WHERE ends_at > now()
  ORDER BY created_at DESC
  LIMIT 100
$$;

REVOKE EXECUTE ON FUNCTION public.get_active_promoted_jobs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_promoted_jobs() TO authenticated;
