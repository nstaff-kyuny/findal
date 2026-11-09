ALTER TABLE public.ad_banners
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'seeker';

ALTER TABLE public.ad_banners
  DROP CONSTRAINT IF EXISTS ad_banners_audience_check;
ALTER TABLE public.ad_banners
  ADD CONSTRAINT ad_banners_audience_check CHECK (audience IN ('seeker','employer'));

CREATE INDEX IF NOT EXISTS ad_banners_audience_idx ON public.ad_banners (audience, active, ends_at);