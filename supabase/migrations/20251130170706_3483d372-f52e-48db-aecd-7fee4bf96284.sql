-- Drop version columns from petition_content table
ALTER TABLE public.petition_content DROP COLUMN IF EXISTS version;
ALTER TABLE public.petition_content DROP COLUMN IF EXISTS published_version;