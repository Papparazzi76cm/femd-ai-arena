
-- MVP table for match MVPs
CREATE TABLE public.match_mvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id)
);

-- Enable RLS
ALTER TABLE public.match_mvps ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "MVPs are viewable by everyone" ON public.match_mvps
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins and mesas can insert MVPs" ON public.match_mvps
  FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'mesa'::app_role));

CREATE POLICY "Admins and mesas can update MVPs" ON public.match_mvps
  FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'mesa'::app_role));

CREATE POLICY "Admins can delete MVPs" ON public.match_mvps
  FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow anon to insert/update MVPs (for mesa panel via token)
CREATE POLICY "Anon can insert MVPs" ON public.match_mvps
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update MVPs" ON public.match_mvps
  FOR UPDATE TO anon USING (true);
