ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.match_goals REPLICA IDENTITY FULL;
ALTER TABLE public.match_cards REPLICA IDENTITY FULL;
ALTER TABLE public.match_mvps REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_mvps;