
ALTER TABLE public.matches 
  ADD COLUMN IF NOT EXISTS match_halves integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS match_duration_minutes integer NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone DEFAULT NULL;
