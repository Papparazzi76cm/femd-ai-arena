-- Create table for tracking individual goals with scorer information
CREATE TABLE public.match_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  minute INTEGER,
  is_own_goal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.match_goals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Goals are viewable by everyone"
ON public.match_goals FOR SELECT
USING (true);

CREATE POLICY "Admins and assigned mesas can insert goals"
ON public.match_goals FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'mesa'::app_role)
);

CREATE POLICY "Admins and assigned mesas can update goals"
ON public.match_goals FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'mesa'::app_role)
);

CREATE POLICY "Admins and assigned mesas can delete goals"
ON public.match_goals FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'mesa'::app_role)
);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_goals;