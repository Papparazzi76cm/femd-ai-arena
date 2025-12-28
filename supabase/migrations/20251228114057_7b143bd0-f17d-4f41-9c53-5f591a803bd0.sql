-- 1. Añadir campo field_id a matches para asignar campo de juego
ALTER TABLE public.matches ADD COLUMN field_id uuid REFERENCES public.fields(id) ON DELETE SET NULL;

-- 2. Añadir category_id a matches para vincular con categoría
ALTER TABLE public.matches ADD COLUMN category_id uuid REFERENCES public.event_categories(id) ON DELETE SET NULL;

-- 3. Añadir category_id a event_teams para vincular equipo con categoría específica
ALTER TABLE public.event_teams ADD COLUMN category_id uuid REFERENCES public.event_categories(id) ON DELETE SET NULL;

-- 4. Añadir letra de equipo (A, B, C, D...) para equipos duplicados del mismo club
ALTER TABLE public.event_teams ADD COLUMN team_letter text;

-- 5. Crear enum para fases del torneo más completo
CREATE TYPE public.tournament_phase AS ENUM (
    'group',
    'round_of_16',
    'quarter_final',
    'semi_final',
    'third_place',
    'final',
    'gold_round_of_16',
    'gold_quarter_final',
    'gold_semi_final',
    'gold_third_place',
    'gold_final',
    'silver_round_of_16',
    'silver_quarter_final',
    'silver_semi_final',
    'silver_third_place',
    'silver_final',
    'bronze_round_of_16',
    'bronze_quarter_final',
    'bronze_semi_final',
    'bronze_third_place',
    'bronze_final'
);

-- 6. Crear tabla de configuración de fases por categoría de evento
CREATE TABLE public.event_category_phases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_category_id uuid NOT NULL REFERENCES public.event_categories(id) ON DELETE CASCADE,
    phase_type text NOT NULL, -- 'group', 'gold', 'silver', 'bronze'
    num_groups integer DEFAULT 0,
    teams_per_group integer DEFAULT 0,
    tiebreaker_rules text, -- JSON con reglas de desempate
    qualification_rules text, -- JSON con reglas de clasificación
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(event_category_id, phase_type)
);

-- 7. Habilitar RLS
ALTER TABLE public.event_category_phases ENABLE ROW LEVEL SECURITY;

-- 8. Políticas para event_category_phases
CREATE POLICY "Event category phases are viewable by everyone" 
ON public.event_category_phases FOR SELECT USING (true);

CREATE POLICY "Admins can insert event category phases" 
ON public.event_category_phases FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update event category phases" 
ON public.event_category_phases FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete event category phases" 
ON public.event_category_phases FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));