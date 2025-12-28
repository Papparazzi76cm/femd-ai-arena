-- 1. Crear tabla de histórico de participación de clubes en torneos
CREATE TABLE public.club_tournament_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    position integer, -- Posición final (1 = campeón, 2 = subcampeón, etc.)
    phase_reached text, -- 'champion', 'runner_up', 'semi_final', 'quarter_final', 'group_stage', etc.
    total_matches integer DEFAULT 0,
    wins integer DEFAULT 0,
    draws integer DEFAULT 0,
    losses integer DEFAULT 0,
    goals_for integer DEFAULT 0,
    goals_against integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(team_id, event_id, category_id)
);

-- 2. Habilitar RLS
ALTER TABLE public.club_tournament_history ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para club_tournament_history
CREATE POLICY "Club tournament history is viewable by everyone" 
ON public.club_tournament_history FOR SELECT USING (true);

CREATE POLICY "Admins can insert club tournament history" 
ON public.club_tournament_history FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update club tournament history" 
ON public.club_tournament_history FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete club tournament history" 
ON public.club_tournament_history FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Crear función para detectar conflictos de horarios en partidos
CREATE OR REPLACE FUNCTION public.check_match_schedule_conflict(
    p_event_id uuid,
    p_field_id uuid,
    p_match_date timestamp with time zone,
    p_duration_minutes integer,
    p_exclude_match_id uuid DEFAULT NULL
)
RETURNS TABLE (
    conflicting_match_id uuid,
    home_team_id uuid,
    away_team_id uuid,
    scheduled_date timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        m.id as conflicting_match_id,
        m.home_team_id,
        m.away_team_id,
        m.match_date as scheduled_date
    FROM public.matches m
    WHERE m.event_id = p_event_id
      AND m.field_id = p_field_id
      AND m.match_date IS NOT NULL
      AND (p_exclude_match_id IS NULL OR m.id != p_exclude_match_id)
      AND (
          -- El nuevo partido empieza durante otro partido existente
          (p_match_date >= m.match_date AND p_match_date < m.match_date + (p_duration_minutes || ' minutes')::interval)
          OR
          -- El nuevo partido termina durante otro partido existente
          (p_match_date + (p_duration_minutes || ' minutes')::interval > m.match_date 
           AND p_match_date + (p_duration_minutes || ' minutes')::interval <= m.match_date + (p_duration_minutes || ' minutes')::interval)
          OR
          -- El nuevo partido engloba completamente otro partido
          (p_match_date <= m.match_date AND p_match_date + (p_duration_minutes || ' minutes')::interval >= m.match_date + (p_duration_minutes || ' minutes')::interval)
      )
$$;