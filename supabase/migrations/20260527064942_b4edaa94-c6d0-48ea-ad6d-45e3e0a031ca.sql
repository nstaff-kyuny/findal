
CREATE TABLE public.credit_orders (
  id TEXT PRIMARY KEY,
  employer_id UUID NOT NULL,
  pack INTEGER NOT NULL,
  amount_krw INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_key TEXT,
  method TEXT,
  approved_at TIMESTAMPTZ,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.credit_orders TO authenticated;
GRANT ALL ON public.credit_orders TO service_role;

ALTER TABLE public.credit_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employer insert own credit order"
ON public.credit_orders FOR INSERT TO authenticated
WITH CHECK (employer_id = auth.uid());

CREATE POLICY "employer read own credit order"
ON public.credit_orders FOR SELECT TO authenticated
USING (employer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER credit_orders_touch
BEFORE UPDATE ON public.credit_orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
