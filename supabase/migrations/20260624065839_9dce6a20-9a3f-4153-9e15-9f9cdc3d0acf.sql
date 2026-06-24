
CREATE POLICY "admin delete credit_purchase_requests"
ON public.credit_purchase_requests FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
