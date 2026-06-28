GRANT SELECT ON public.jobs TO anon;
CREATE POLICY "public read active jobs" ON public.jobs FOR SELECT TO anon USING (is_active = true);