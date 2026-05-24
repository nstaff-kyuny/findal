
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TABLE IF NOT EXISTS public.partner_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL UNIQUE,
  monthly_credits INTEGER NOT NULL DEFAULT 0,
  auto_recharge_threshold INTEGER NOT NULL DEFAULT 0,
  auto_recharge_amount INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  last_monthly_grant_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage partner programs" ON public.partner_programs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "manager read partner programs" ON public.partner_programs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "employer read own partner program" ON public.partner_programs
  FOR SELECT TO authenticated USING (employer_id = auth.uid());

CREATE TRIGGER partner_programs_updated_at
BEFORE UPDATE ON public.partner_programs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.partner_auto_recharge()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _prog public.partner_programs%ROWTYPE;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.credits >= OLD.credits THEN RETURN NEW; END IF;
  SELECT * INTO _prog FROM public.partner_programs WHERE employer_id = NEW.user_id AND active = true;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF _prog.auto_recharge_amount <= 0 THEN RETURN NEW; END IF;
  IF NEW.credits >= _prog.auto_recharge_threshold THEN RETURN NEW; END IF;
  UPDATE public.employer_profiles SET credits = credits + _prog.auto_recharge_amount WHERE user_id = NEW.user_id;
  INSERT INTO public.credit_transactions(employer_id, delta, type, note)
    VALUES (NEW.user_id, _prog.auto_recharge_amount, 'partner_recharge'::public.credit_tx_type, '협력업체 자동충전');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS partner_auto_recharge_trg ON public.employer_profiles;
CREATE TRIGGER partner_auto_recharge_trg
AFTER UPDATE OF credits ON public.employer_profiles
FOR EACH ROW EXECUTE FUNCTION public.partner_auto_recharge();

CREATE OR REPLACE FUNCTION public.run_partner_monthly_grants()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r RECORD; _count INT := 0;
BEGIN
  FOR _r IN
    SELECT * FROM public.partner_programs
     WHERE active = true AND monthly_credits > 0
       AND (last_monthly_grant_at IS NULL OR date_trunc('month', last_monthly_grant_at) < date_trunc('month', now()))
  LOOP
    UPDATE public.employer_profiles SET credits = credits + _r.monthly_credits WHERE user_id = _r.employer_id;
    INSERT INTO public.credit_transactions(employer_id, delta, type, note)
      VALUES (_r.employer_id, _r.monthly_credits, 'partner_monthly'::public.credit_tx_type, '협력업체 월정액 지급');
    UPDATE public.partner_programs SET last_monthly_grant_at = now() WHERE id = _r.id;
    _count := _count + 1;
  END LOOP;
  RETURN jsonb_build_object('granted', _count);
END $$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$ BEGIN PERFORM cron.unschedule('partner-monthly-grants'); EXCEPTION WHEN others THEN NULL; END $$;
SELECT cron.schedule('partner-monthly-grants', '5 0 1 * *', $cron$ SELECT public.run_partner_monthly_grants(); $cron$);

CREATE POLICY "manager read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "manager read employer_profiles" ON public.employer_profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "manager read seeker_profiles" ON public.seeker_profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "manager read user_roles" ON public.user_roles
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "manager read credit_transactions" ON public.credit_transactions
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "manager read credit_purchase_requests" ON public.credit_purchase_requests
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "manager read referrers" ON public.referrers
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "manager read faqs" ON public.faqs
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'manager'::app_role));
