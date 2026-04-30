UPDATE public.matches m
SET home_event_team_id = (
  SELECT et.id
  FROM public.event_teams et
  WHERE et.event_id = m.event_id
    AND et.team_id = m.home_team_id
    AND (
      et.category_id = m.category_id
      OR (
        NOT EXISTS (
          SELECT 1
          FROM public.event_teams exact
          WHERE exact.event_id = m.event_id
            AND exact.team_id = m.home_team_id
            AND exact.category_id = m.category_id
        )
        AND (
          et.category_id IS NULL
          OR (
            SELECT COUNT(*)
            FROM public.event_teams only_et
            WHERE only_et.event_id = m.event_id
              AND only_et.team_id = m.home_team_id
          ) = 1
        )
      )
    )
  ORDER BY CASE WHEN et.category_id = m.category_id THEN 0 ELSE 1 END
  LIMIT 1
)
WHERE m.home_event_team_id IS NULL
  AND m.home_team_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.event_teams et
    WHERE et.event_id = m.event_id
      AND et.team_id = m.home_team_id
      AND (
        et.category_id = m.category_id
        OR (
          NOT EXISTS (
            SELECT 1
            FROM public.event_teams exact
            WHERE exact.event_id = m.event_id
              AND exact.team_id = m.home_team_id
              AND exact.category_id = m.category_id
          )
          AND (
            et.category_id IS NULL
            OR (
              SELECT COUNT(*)
              FROM public.event_teams only_et
              WHERE only_et.event_id = m.event_id
                AND only_et.team_id = m.home_team_id
            ) = 1
          )
        )
      )
  );

UPDATE public.matches m
SET away_event_team_id = (
  SELECT et.id
  FROM public.event_teams et
  WHERE et.event_id = m.event_id
    AND et.team_id = m.away_team_id
    AND (
      et.category_id = m.category_id
      OR (
        NOT EXISTS (
          SELECT 1
          FROM public.event_teams exact
          WHERE exact.event_id = m.event_id
            AND exact.team_id = m.away_team_id
            AND exact.category_id = m.category_id
        )
        AND (
          et.category_id IS NULL
          OR (
            SELECT COUNT(*)
            FROM public.event_teams only_et
            WHERE only_et.event_id = m.event_id
              AND only_et.team_id = m.away_team_id
          ) = 1
        )
      )
    )
  ORDER BY CASE WHEN et.category_id = m.category_id THEN 0 ELSE 1 END
  LIMIT 1
)
WHERE m.away_event_team_id IS NULL
  AND m.away_team_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.event_teams et
    WHERE et.event_id = m.event_id
      AND et.team_id = m.away_team_id
      AND (
        et.category_id = m.category_id
        OR (
          NOT EXISTS (
            SELECT 1
            FROM public.event_teams exact
            WHERE exact.event_id = m.event_id
              AND exact.team_id = m.away_team_id
              AND exact.category_id = m.category_id
          )
          AND (
            et.category_id IS NULL
            OR (
              SELECT COUNT(*)
              FROM public.event_teams only_et
              WHERE only_et.event_id = m.event_id
                AND only_et.team_id = m.away_team_id
            ) = 1
          )
        )
      )
  );