CREATE TABLE IF NOT EXISTS public.native_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS native_push_tokens_user_idx ON public.native_push_tokens(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.native_push_tokens TO authenticated;
GRANT ALL ON public.native_push_tokens TO service_role;

ALTER TABLE public.native_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own native tokens select" ON public.native_push_tokens;
DROP POLICY IF EXISTS "own native tokens insert" ON public.native_push_tokens;
DROP POLICY IF EXISTS "own native tokens update" ON public.native_push_tokens;
DROP POLICY IF EXISTS "own native tokens delete" ON public.native_push_tokens;

CREATE POLICY "own native tokens select" ON public.native_push_tokens FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own native tokens insert" ON public.native_push_tokens FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own native tokens update" ON public.native_push_tokens FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own native tokens delete" ON public.native_push_tokens FOR DELETE TO authenticated USING (user_id = auth.uid());