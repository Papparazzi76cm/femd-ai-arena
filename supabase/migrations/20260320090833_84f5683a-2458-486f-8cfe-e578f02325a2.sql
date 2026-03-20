-- Add roster_role column to team_rosters to distinguish players from staff
ALTER TABLE public.team_rosters 
  ADD COLUMN IF NOT EXISTS roster_role text NOT NULL DEFAULT 'player';

-- Add staff_position for coaching staff details
ALTER TABLE public.team_rosters
  ADD COLUMN IF NOT EXISTS staff_position text;

-- Comment: roster_role values: 'player', 'staff'
-- staff_position values: 'primer_entrenador', 'segundo_entrenador', 'delegado', 'auxiliar'