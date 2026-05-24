
DROP FUNCTION IF EXISTS public.generate_staff_no(TEXT);
ALTER TABLE public.profiles DROP COLUMN IF EXISTS staff_no;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS gender;
