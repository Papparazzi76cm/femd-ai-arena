-- 1. Crear enum para modalidades de fútbol
CREATE TYPE public.football_modality AS ENUM ('futbol_7', 'futbol_11');

-- 2. Crear tabla de categorías
CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    age_group text,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Insertar categorías estándar
INSERT INTO public.categories (name, age_group, display_order) VALUES
    ('Senior', 'Senior', 1),
    ('Juvenil U19', 'Sub-19', 2),
    ('Juvenil U18', 'Sub-18', 3),
    ('Juvenil U17', 'Sub-17', 4),
    ('Cadete U16', 'Sub-16', 5),
    ('Cadete U15', 'Sub-15', 6),
    ('Infantil U14', 'Sub-14', 7),
    ('Infantil U13', 'Sub-13', 8),
    ('Alevín U12', 'Sub-12', 9),
    ('Alevín U11', 'Sub-11', 10),
    ('Benjamín U10', 'Sub-10', 11),
    ('Benjamín U9', 'Sub-9', 12),
    ('Prebenjamín U8', 'Sub-8', 13),
    ('Prebenjamín U7', 'Sub-7', 14),
    ('Escuela', 'Escuela', 15);

-- 3. Crear tabla de categorías por evento/torneo
CREATE TABLE public.event_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    modality football_modality NOT NULL DEFAULT 'futbol_7',
    match_duration_minutes integer NOT NULL DEFAULT 40,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(event_id, category_id)
);

-- 4. Habilitar RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

-- 5. Políticas para categories
CREATE POLICY "Categories are viewable by everyone" 
ON public.categories FOR SELECT USING (true);

CREATE POLICY "Admins can insert categories" 
ON public.categories FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories" 
ON public.categories FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories" 
ON public.categories FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Políticas para event_categories
CREATE POLICY "Event categories are viewable by everyone" 
ON public.event_categories FOR SELECT USING (true);

CREATE POLICY "Admins can insert event categories" 
ON public.event_categories FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update event categories" 
ON public.event_categories FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete event categories" 
ON public.event_categories FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));