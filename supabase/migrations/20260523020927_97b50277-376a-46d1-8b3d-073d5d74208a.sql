
-- 구직자 즐겨찾기 (일하는 장소 단위)
CREATE TABLE public.seeker_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seeker_id UUID NOT NULL,
  employer_id UUID NOT NULL,
  place_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (seeker_id, employer_id, place_name)
);

ALTER TABLE public.seeker_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seeker read own favorites"
  ON public.seeker_favorites FOR SELECT TO authenticated
  USING (seeker_id = auth.uid());

CREATE POLICY "seeker insert own favorites"
  ON public.seeker_favorites FOR INSERT TO authenticated
  WITH CHECK (seeker_id = auth.uid());

CREATE POLICY "seeker delete own favorites"
  ON public.seeker_favorites FOR DELETE TO authenticated
  USING (seeker_id = auth.uid());

CREATE INDEX idx_seeker_favorites_seeker ON public.seeker_favorites(seeker_id);
CREATE INDEX idx_seeker_favorites_place ON public.seeker_favorites(employer_id, place_name);
