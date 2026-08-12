ALTER TYPE public.credit_tx_type ADD VALUE IF NOT EXISTS 'refund';

CREATE TABLE public.refund_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  amount_krw integer NOT NULL,
  credits integer NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  processed_by uuid,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX refund_requests_employer_idx ON public.refund_requests(employer_id, created_at DESC);
CREATE UNIQUE INDEX refund_requests_open_order_idx ON public.refund_requests(order_id) WHERE status IN ('pending','approved');

GRANT SELECT, INSERT, UPDATE ON public.refund_requests TO authenticated;
GRANT ALL ON public.refund_requests TO service_role;

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employer reads own refund requests"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (auth.uid() = employer_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "employer creates own refund request"
  ON public.refund_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = employer_id AND status = 'pending');

CREATE POLICY "employer cancels own pending request"
  ON public.refund_requests FOR UPDATE TO authenticated
  USING (auth.uid() = employer_id AND status = 'pending')
  WITH CHECK (auth.uid() = employer_id AND status IN ('pending','cancelled'));

CREATE POLICY "admin updates refund requests"
  ON public.refund_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER refund_requests_touch
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();