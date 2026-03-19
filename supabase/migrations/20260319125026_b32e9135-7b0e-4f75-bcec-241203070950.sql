
-- Add placeholder columns for knockout matches where teams aren't yet determined
ALTER TABLE public.matches 
  ADD COLUMN IF NOT EXISTS home_placeholder text,
  ADD COLUMN IF NOT EXISTS away_placeholder text;

-- Make team IDs nullable for knockout matches with placeholders
ALTER TABLE public.matches 
  ALTER COLUMN home_team_id DROP NOT NULL,
  ALTER COLUMN away_team_id DROP NOT NULL;
