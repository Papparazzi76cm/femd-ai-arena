-- Create table for player team history
CREATE TABLE public.player_team_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  category TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  season TEXT,
  matches_played INTEGER DEFAULT 0,
  goals_scored INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_team_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Player team history viewable by everyone" 
ON public.player_team_history 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert player team history" 
ON public.player_team_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update player team history" 
ON public.player_team_history 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete player team history" 
ON public.player_team_history 
FOR DELETE 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_player_team_history_player ON public.player_team_history(player_id);
CREATE INDEX idx_player_team_history_team ON public.player_team_history(team_id);
CREATE INDEX idx_player_team_history_dates ON public.player_team_history(start_date, end_date);