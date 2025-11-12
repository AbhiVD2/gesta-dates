-- Add email column to profiles so we can store and lookup email by phone
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

-- Optionally add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone);
