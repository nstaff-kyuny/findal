DROP POLICY IF EXISTS "admins manage payment_settings" ON public.payment_settings;

REVOKE ALL ON public.payment_settings FROM authenticated;
REVOKE ALL ON public.payment_settings FROM anon;
GRANT ALL ON public.payment_settings TO service_role;

DROP POLICY IF EXISTS "admins update credit orders" ON public.credit_orders;
CREATE POLICY "admins update credit orders"
ON public.credit_orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admins delete credit orders" ON public.credit_orders;
CREATE POLICY "admins delete credit orders"
ON public.credit_orders
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));