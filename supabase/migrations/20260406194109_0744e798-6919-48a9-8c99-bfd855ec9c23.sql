
-- 1. Add end_date to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_date timestamp with time zone;

-- 2. Create match_cards table for individual card records
CREATE TABLE public.match_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id),
  player_id uuid REFERENCES public.participants(id),
  card_type text NOT NULL CHECK (card_type IN ('yellow', 'red')),
  minute integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.match_cards ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Match cards viewable by everyone" ON public.match_cards FOR SELECT TO public USING (true);
-- Admin/mesa insert
CREATE POLICY "Admins and mesas can insert cards" ON public.match_cards FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'mesa'::app_role));
-- Admin/mesa update
CREATE POLICY "Admins and mesas can update cards" ON public.match_cards FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'mesa'::app_role));
-- Admin delete
CREATE POLICY "Admins can delete cards" ON public.match_cards FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
-- Anon insert/update/delete for mesa token access
CREATE POLICY "Anon can insert cards" ON public.match_cards FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update cards" ON public.match_cards FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete cards" ON public.match_cards FOR DELETE TO anon USING (true);
