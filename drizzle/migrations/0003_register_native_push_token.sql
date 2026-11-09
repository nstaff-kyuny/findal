CREATE OR REPLACE FUNCTION public.register_native_push_token(_token text, _platform text, _user_agent text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다'; END IF;
  IF _token IS NULL OR length(trim(_token)) < 20 OR length(_token) > 4096 THEN
    RAISE EXCEPTION '잘못된 알림 토큰입니다';
  END IF;
  IF _platform NOT IN ('ios','android') THEN RAISE EXCEPTION '지원하지 않는 기기입니다'; END IF;

  -- 한 기기(토큰)는 현재 로그인한 계정 하나에만 연결됩니다.
  INSERT INTO public.native_push_tokens(user_id, token, platform, user_agent, updated_at)
  VALUES (_uid, _token, _platform, LEFT(_user_agent, 500), now())
  ON CONFLICT (token) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        user_agent = EXCLUDED.user_agent,
        updated_at = now();
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.register_native_push_token(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_native_push_token(text, text, text) TO authenticated;