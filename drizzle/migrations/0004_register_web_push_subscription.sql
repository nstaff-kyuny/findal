CREATE OR REPLACE FUNCTION public.register_web_push_subscription(_endpoint text, _p256dh text, _auth text, _user_agent text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다'; END IF;
  IF _endpoint IS NULL OR _endpoint !~ '^https://' OR length(_endpoint) > 2048 THEN
    RAISE EXCEPTION '잘못된 알림 주소입니다';
  END IF;
  IF coalesce(_p256dh,'') = '' OR coalesce(_auth,'') = '' OR length(_p256dh) > 512 OR length(_auth) > 512 THEN
    RAISE EXCEPTION '잘못된 알림 키입니다';
  END IF;

  INSERT INTO public.push_subscriptions(user_id, endpoint, p256dh, auth, user_agent)
  VALUES (_uid, _endpoint, _p256dh, _auth, LEFT(_user_agent, 500))
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.register_web_push_subscription(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_web_push_subscription(text, text, text, text) TO authenticated;