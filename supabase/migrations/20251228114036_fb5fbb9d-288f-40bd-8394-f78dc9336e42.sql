-- 1. Crear enum para tipo de superficie
CREATE TYPE public.field_surface AS ENUM ('cesped_artificial', 'cesped_natural');

-- 2. Crear tabla de instalaciones
CREATE TABLE public.facilities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    province text,
    city text,
    address text,
    google_maps_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Crear tabla de campos dentro de instalaciones
CREATE TABLE public.fields (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    name text NOT NULL DEFAULT 'Campo 1',
    surface field_surface NOT NULL DEFAULT 'cesped_artificial',
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Crear tabla de instalaciones por evento/torneo
CREATE TABLE public.event_facilities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(event_id, facility_id)
);

-- 5. Habilitar RLS
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_facilities ENABLE ROW LEVEL SECURITY;

-- 6. Políticas para facilities
CREATE POLICY "Facilities are viewable by everyone" 
ON public.facilities FOR SELECT USING (true);

CREATE POLICY "Admins can insert facilities" 
ON public.facilities FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update facilities" 
ON public.facilities FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete facilities" 
ON public.facilities FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Políticas para fields
CREATE POLICY "Fields are viewable by everyone" 
ON public.fields FOR SELECT USING (true);

CREATE POLICY "Admins can insert fields" 
ON public.fields FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update fields" 
ON public.fields FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete fields" 
ON public.fields FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- 8. Políticas para event_facilities
CREATE POLICY "Event facilities are viewable by everyone" 
ON public.event_facilities FOR SELECT USING (true);

CREATE POLICY "Admins can insert event facilities" 
ON public.event_facilities FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update event facilities" 
ON public.event_facilities FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete event facilities" 
ON public.event_facilities FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));