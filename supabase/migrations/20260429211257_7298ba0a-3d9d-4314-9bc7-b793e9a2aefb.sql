ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS home_event_team_id uuid,
ADD COLUMN IF NOT EXISTS away_event_team_id uuid;

CREATE INDEX IF NOT EXISTS idx_matches_home_event_team_id ON public.matches(home_event_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_event_team_id ON public.matches(away_event_team_id);

UPDATE public.matches m
SET home_event_team_id = et.id
FROM public.event_teams et
WHERE m.home_event_team_id IS NULL
  AND m.home_team_id IS NOT NULL
  AND et.event_id = m.event_id
  AND et.team_id = m.home_team_id
  AND (m.category_id IS NULL OR et.category_id = m.category_id)
  AND NOT EXISTS (
    SELECT 1
    FROM public.event_teams et2
    WHERE et2.event_id = m.event_id
      AND et2.team_id = m.home_team_id
      AND (m.category_id IS NULL OR et2.category_id = m.category_id)
      AND et2.id <> et.id
  );

UPDATE public.matches m
SET away_event_team_id = et.id
FROM public.event_teams et
WHERE m.away_event_team_id IS NULL
  AND m.away_team_id IS NOT NULL
  AND et.event_id = m.event_id
  AND et.team_id = m.away_team_id
  AND (m.category_id IS NULL OR et.category_id = m.category_id)
  AND NOT EXISTS (
    SELECT 1
    FROM public.event_teams et2
    WHERE et2.event_id = m.event_id
      AND et2.team_id = m.away_team_id
      AND (m.category_id IS NULL OR et2.category_id = m.category_id)
      AND et2.id <> et.id
  );