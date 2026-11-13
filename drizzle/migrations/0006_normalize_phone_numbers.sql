CREATE OR REPLACE FUNCTION public.format_kr_phone(_v text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  d text;
  n int;
BEGIN
  IF _v IS NULL THEN RETURN NULL; END IF;
  d := regexp_replace(_v, '\D', '', 'g');
  n := length(d);
  IF d ~ '^02[0-9]{7,8}$' THEN
    RETURN '02-' || substr(d, 3, n - 6) || '-' || right(d, 4);
  ELSIF d ~ '^0[0-9]{9,10}$' THEN
    RETURN substr(d, 1, 3) || '-' || substr(d, 4, n - 7) || '-' || right(d, 4);
  ELSIF d ~ '^1[0-9]{7}$' THEN
    RETURN left(d, 4) || '-' || right(d, 4);
  END IF;
  RETURN btrim(_v);
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  col text := TG_ARGV[0];
  cur text;
BEGIN
  cur := to_jsonb(NEW) ->> col;
  IF cur IS NOT NULL THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object(col, public.format_kr_phone(cur)));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_phone ON public.profiles;
CREATE TRIGGER trg_normalize_phone BEFORE INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_column('phone');

DROP TRIGGER IF EXISTS trg_normalize_phone ON public.employer_profiles;
CREATE TRIGGER trg_normalize_phone BEFORE INSERT OR UPDATE OF contact_phone ON public.employer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_column('contact_phone');

DROP TRIGGER IF EXISTS trg_normalize_phone ON public.job_contacts;
CREATE TRIGGER trg_normalize_phone BEFORE INSERT OR UPDATE OF contact_phone ON public.job_contacts
  FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_column('contact_phone');

DROP TRIGGER IF EXISTS trg_normalize_phone ON public.referrers;
CREATE TRIGGER trg_normalize_phone BEFORE INSERT OR UPDATE OF phone ON public.referrers
  FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_column('phone');

DROP TRIGGER IF EXISTS trg_normalize_phone ON public.company_info;
CREATE TRIGGER trg_normalize_phone BEFORE INSERT OR UPDATE OF phone ON public.company_info
  FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_column('phone');