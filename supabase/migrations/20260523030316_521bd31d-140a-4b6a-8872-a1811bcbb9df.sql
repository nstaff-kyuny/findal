
-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
-- Allow inserts from triggers (SECURITY DEFINER functions) and from any authenticated context for self
CREATE POLICY "insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Application status notifier
CREATE OR REPLACE FUNCTION public.notify_application_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job_title TEXT;
  _place TEXT;
  _seeker_name TEXT;
BEGIN
  SELECT title, place_name INTO _job_title, _place FROM public.jobs WHERE id = NEW.job_id;

  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO _seeker_name FROM public.profiles WHERE id = NEW.seeker_id;
    INSERT INTO public.notifications(user_id, type, title, body, link_url)
    VALUES (NEW.employer_id, 'new_application',
      '새 일하기 신청',
      COALESCE(_seeker_name,'구직자') || '님이 ['|| COALESCE(_place,_job_title,'공고') ||']에 신청했습니다',
      '/employer/applications');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link_url)
      VALUES (NEW.seeker_id, 'approved', '신청이 승인되었습니다',
        '['|| COALESCE(_place,_job_title,'공고') ||'] 신청이 승인되었습니다. 확정해 주세요.',
        '/seeker/applications');
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link_url)
      VALUES (NEW.seeker_id, 'rejected', '신청이 거절되었습니다',
        '['|| COALESCE(_place,_job_title,'공고') ||'] 신청이 거절되었습니다.',
        '/seeker/applications');
    ELSIF NEW.status = 'confirmed' THEN
      SELECT full_name INTO _seeker_name FROM public.profiles WHERE id = NEW.seeker_id;
      INSERT INTO public.notifications(user_id, type, title, body, link_url)
      VALUES (NEW.employer_id, 'confirmed', '구직자가 확정했습니다',
        COALESCE(_seeker_name,'구직자') || '님이 ['|| COALESCE(_place,_job_title,'공고') ||'] 근무를 확정했습니다.',
        '/employer/applications');
    ELSIF NEW.status = 'cancelled' THEN
      SELECT full_name INTO _seeker_name FROM public.profiles WHERE id = NEW.seeker_id;
      INSERT INTO public.notifications(user_id, type, title, body, link_url)
      VALUES (NEW.employer_id, 'cancelled', '신청이 취소되었습니다',
        COALESCE(_seeker_name,'구직자') || '님이 ['|| COALESCE(_place,_job_title,'공고') ||'] 신청을 취소했습니다.',
        '/employer/applications');
    ELSIF NEW.status = 'no_show' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link_url)
      VALUES (NEW.seeker_id, 'no_show', '노쇼 처리되었습니다',
        '['|| COALESCE(_place,_job_title,'공고') ||']에서 노쇼 처리되었습니다.',
        '/seeker/applications');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_application_insert ON public.job_applications;
CREATE TRIGGER trg_notify_application_insert
  AFTER INSERT ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_event();

DROP TRIGGER IF EXISTS trg_notify_application_update ON public.job_applications;
CREATE TRIGGER trg_notify_application_update
  AFTER UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_event();

-- Event/marketing broadcast
CREATE OR REPLACE FUNCTION public.broadcast_event_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.active = true THEN
    INSERT INTO public.notifications(user_id, type, title, body, link_url)
    SELECT sp.user_id, 'marketing', '🎁 ' || NEW.title, NEW.body, COALESCE(NEW.link_url, '/events')
    FROM public.seeker_profiles sp WHERE sp.notify_marketing = true;
    INSERT INTO public.notifications(user_id, type, title, body, link_url)
    SELECT ep.user_id, 'marketing', '🎁 ' || NEW.title, NEW.body, COALESCE(NEW.link_url, '/events')
    FROM public.employer_profiles ep WHERE ep.notify_marketing = true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_broadcast_event ON public.events;
CREATE TRIGGER trg_broadcast_event
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_event_notification();

-- Notice broadcast (all users)
CREATE OR REPLACE FUNCTION public.broadcast_notice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.active = true THEN
    INSERT INTO public.notifications(user_id, type, title, body, link_url)
    SELECT p.id, 'notice', '📢 ' || NEW.title, LEFT(NEW.body, 200), '/notices'
    FROM public.profiles p;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_broadcast_notice ON public.notices;
CREATE TRIGGER trg_broadcast_notice
  AFTER INSERT ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_notice();
