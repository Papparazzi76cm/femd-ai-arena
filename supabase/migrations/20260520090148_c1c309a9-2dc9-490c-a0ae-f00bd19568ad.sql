
-- Create sponsor_events join table to associate sponsors with one or many events
CREATE TABLE IF NOT EXISTS public.sponsor_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (sponsor_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_sponsor_events_event_id ON public.sponsor_events(event_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_events_sponsor_id ON public.sponsor_events(sponsor_id);

ALTER TABLE public.sponsor_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsor events are viewable by everyone"
  ON public.sponsor_events FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert sponsor events"
  ON public.sponsor_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sponsor events"
  ON public.sponsor_events FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete sponsor events"
  ON public.sponsor_events FOR DELETE TO authenticated USING (true);
