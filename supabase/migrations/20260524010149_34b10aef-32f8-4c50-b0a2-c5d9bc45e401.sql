
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('M','F')),
  ADD COLUMN IF NOT EXISTS staff_no TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_staff_no(_gender TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _g TEXT;
  _yy TEXT;
  _mm TEXT;
  _prefix TEXT;
  _next INT;
  _candidate TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION '관리자 권한 필요';
  END IF;
  IF _gender NOT IN ('M','F') THEN
    RAISE EXCEPTION '성별은 M 또는 F 이어야 합니다';
  END IF;
  _g := CASE _gender WHEN 'M' THEN '1' ELSE '2' END;
  _yy := to_char(now() AT TIME ZONE 'Asia/Seoul', 'YY');
  _mm := to_char(now() AT TIME ZONE 'Asia/Seoul', 'MM');
  _prefix := _g || _yy || _mm;

  SELECT COALESCE(MAX( (substring(staff_no from 6 for 3))::int ), 0) + 1
    INTO _next
  FROM public.profiles
  WHERE staff_no LIKE _prefix || '%' AND length(staff_no) = 8;

  IF _next > 999 THEN
    RAISE EXCEPTION '해당 월 사번이 모두 소진되었습니다';
  END IF;

  _candidate := _prefix || lpad(_next::text, 3, '0');
  RETURN _candidate;
END
$$;

REVOKE EXECUTE ON FUNCTION public.generate_staff_no(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_staff_no(TEXT) TO authenticated;
