-- 1. Añadir DNI como identificador único a participantes
ALTER TABLE public.participants ADD COLUMN dni text UNIQUE;

-- 2. Crear tabla de plantillas de equipo por categoría en torneo
-- Esto vincula jugadores con un equipo específico en una categoría específica de un torneo
CREATE TABLE public.team_rosters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_team_id uuid NOT NULL REFERENCES public.event_teams(id) ON DELETE CASCADE,
    participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    jersey_number integer,
    is_captain boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(event_team_id, participant_id)
);

-- 3. Habilitar RLS
ALTER TABLE public.team_rosters ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para team_rosters
CREATE POLICY "Team rosters are viewable by everyone" 
ON public.team_rosters FOR SELECT USING (true);

CREATE POLICY "Admins can insert team rosters" 
ON public.team_rosters FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update team rosters" 
ON public.team_rosters FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete team rosters" 
ON public.team_rosters FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Crear índice para búsqueda rápida por DNI
CREATE INDEX idx_participants_dni ON public.participants(dni);