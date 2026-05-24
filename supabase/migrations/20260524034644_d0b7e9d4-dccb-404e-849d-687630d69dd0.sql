ALTER TABLE public.seeker_profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'ko';

ALTER TABLE public.seeker_profiles
  DROP CONSTRAINT IF EXISTS seeker_profiles_preferred_language_check;

ALTER TABLE public.seeker_profiles
  ADD CONSTRAINT seeker_profiles_preferred_language_check
  CHECK (preferred_language IN ('ko','en','mn','ru','zh'));