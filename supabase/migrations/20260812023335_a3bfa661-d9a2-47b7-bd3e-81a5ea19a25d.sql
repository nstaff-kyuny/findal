REVOKE ALL ON public.payment_settings FROM anon, authenticated;
REVOKE ALL ON public.push_dispatch_config FROM anon, authenticated;
GRANT ALL ON public.payment_settings TO service_role;
GRANT ALL ON public.push_dispatch_config TO service_role;