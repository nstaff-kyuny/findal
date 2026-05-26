
-- 1. push_subscriptions 테이블
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user manage own push subs" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin read push subs" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER push_subs_touch
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. pg_net 확장 활성화 (HTTP 호출용)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 3. 푸시 디스패치 설정 저장 (URL + HMAC 시크릿)
CREATE TABLE IF NOT EXISTS public.push_dispatch_config (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  endpoint_url TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.push_dispatch_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage push cfg" ON public.push_dispatch_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.push_dispatch_config(id, endpoint_url, webhook_secret)
VALUES (true,
  'https://findal.lovable.app/api/public/send-push',
  '9151273fafda726f32ff856a013a195fd8de59be1fc2c61c7482fce569ae304e')
ON CONFLICT (id) DO UPDATE SET
  endpoint_url = EXCLUDED.endpoint_url,
  webhook_secret = EXCLUDED.webhook_secret,
  updated_at = now();

-- 4. notifications 생성 시 푸시 디스패치 트리거
CREATE OR REPLACE FUNCTION public.dispatch_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _cfg public.push_dispatch_config%ROWTYPE;
  _payload JSONB;
  _sig TEXT;
  _body TEXT;
BEGIN
  SELECT * INTO _cfg FROM public.push_dispatch_config LIMIT 1;
  IF _cfg.endpoint_url IS NULL THEN RETURN NEW; END IF;

  _payload := jsonb_build_object(
    'notification_id', NEW.id,
    'user_id', NEW.user_id,
    'title', NEW.title,
    'body', COALESCE(NEW.body, ''),
    'link_url', NEW.link_url,
    'type', NEW.type
  );
  _body := _payload::text;
  _sig := encode(extensions.hmac(_body, _cfg.webhook_secret, 'sha256'), 'hex');

  PERFORM net.http_post(
    url := _cfg.endpoint_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-signature', _sig
    ),
    body := _payload
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 푸시 실패가 알림 생성을 막지 않도록
  RETURN NEW;
END $$;

CREATE TRIGGER notifications_dispatch_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_push_notification();
