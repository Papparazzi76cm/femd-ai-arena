CREATE TABLE public.tournament_brands (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, name text NOT NULL,
 logo_url text NOT NULL DEFAULT '', keywords text[] NOT NULL DEFAULT '{}',
 is_public boolean NOT NULL DEFAULT false, display_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.tournament_brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_brands TO authenticated;
GRANT ALL ON public.tournament_brands TO service_role;
ALTER TABLE public.tournament_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible brands and admin drafts" ON public.tournament_brands FOR SELECT TO anon, authenticated USING (is_public OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Administrators manage brands" ON public.tournament_brands FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.events ADD COLUMN brand_id uuid REFERENCES public.tournament_brands(id);
CREATE TABLE public.local_qualification_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_category_id uuid NOT NULL UNIQUE REFERENCES public.event_categories(id),
 target_category_id uuid NOT NULL REFERENCES public.event_categories(id), qualifiers_per_group integer NOT NULL DEFAULT 1 CHECK (qualifiers_per_group BETWEEN 1 AND 200),
 CHECK (source_category_id <> target_category_id)
);
GRANT SELECT ON public.local_qualification_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.local_qualification_rules TO authenticated;
GRANT ALL ON public.local_qualification_rules TO service_role;
ALTER TABLE public.local_qualification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualification rules readable" ON public.local_qualification_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Administrators manage qualification" ON public.local_qualification_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.local_qualification_transfers (
 rule_id uuid NOT NULL REFERENCES public.local_qualification_rules(id), source_event_team_id uuid NOT NULL REFERENCES public.event_teams(id),
 target_event_team_id uuid NOT NULL REFERENCES public.event_teams(id), PRIMARY KEY(rule_id, source_event_team_id)
);
GRANT SELECT ON public.local_qualification_transfers TO authenticated;
GRANT ALL ON public.local_qualification_transfers TO service_role;
ALTER TABLE public.local_qualification_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administrators read transfers" ON public.local_qualification_transfers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.transfer_local_qualifiers(p_rule_id uuid, p_assignments jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.local_qualification_rules%ROWTYPE; s public.event_teams%ROWTYPE; a jsonb; target_event uuid; target_id uuid; n integer := 0; source_event uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Solo administradores.'; END IF;
 SELECT * INTO STRICT r FROM public.local_qualification_rules WHERE id = p_rule_id FOR UPDATE;
 SELECT event_id INTO source_event FROM public.event_categories WHERE id = r.source_category_id;
 SELECT event_id INTO target_event FROM public.event_categories WHERE id = r.target_category_id;
 IF source_event = target_event THEN RAISE EXCEPTION 'Las fases local y nacional deben ser competiciones distintas.'; END IF;
 PERFORM 1 FROM public.events WHERE id = target_event FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.matches WHERE event_id = target_event AND category_id = r.target_category_id AND status <> 'scheduled') THEN RAISE EXCEPTION 'La fase nacional ya ha comenzado.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.matches WHERE event_id = source_event AND category_id = r.source_category_id) OR EXISTS(SELECT 1 FROM public.matches WHERE event_id = source_event AND category_id = r.source_category_id AND (status IS DISTINCT FROM 'finished' OR home_score IS NULL OR away_score IS NULL)) THEN RAISE EXCEPTION 'Finaliza todos los partidos de la fase local.'; END IF;
 IF jsonb_typeof(p_assignments) IS DISTINCT FROM 'array' OR jsonb_array_length(p_assignments) = 0 THEN RAISE EXCEPTION 'Selecciona los clasificados.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_assignments) GROUP BY value->>'source_id' HAVING count(*) > 1) THEN RAISE EXCEPTION 'Clasificados duplicados.'; END IF;
 FOR a IN SELECT value FROM jsonb_array_elements(p_assignments) LOOP
 SELECT * INTO STRICT s FROM public.event_teams WHERE id = (a->>'source_id')::uuid AND category_id = r.source_category_id AND event_id = source_event;
 IF nullif(btrim(a->>'group_name'), '') IS NULL THEN RAISE EXCEPTION 'Asigna un grupo nacional a cada clasificado.'; END IF;
 SELECT target_event_team_id INTO target_id FROM public.local_qualification_transfers WHERE rule_id = r.id AND source_event_team_id = s.id;
 IF target_id IS NOT NULL THEN CONTINUE; END IF;
 IF EXISTS(SELECT 1 FROM public.event_teams WHERE event_id = target_event AND category_id = r.target_category_id AND team_id = s.team_id AND team_letter IS NOT DISTINCT FROM s.team_letter) THEN RAISE EXCEPTION 'El equipo ya está inscrito en la fase nacional.'; END IF;
 INSERT INTO public.event_teams(event_id, category_id, team_id, team_letter, group_name) VALUES(target_event, r.target_category_id, s.team_id, s.team_letter, btrim(a->>'group_name')) RETURNING id INTO target_id;
 INSERT INTO public.team_rosters(event_team_id, participant_id, jersey_number, is_captain, roster_role, staff_position) SELECT target_id, participant_id, jersey_number, is_captain, roster_role, staff_position FROM public.team_rosters WHERE event_team_id = s.id;
 INSERT INTO public.local_qualification_transfers VALUES(r.id, s.id, target_id);
 n := n + 1;
 END LOOP;
 RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.transfer_local_qualifiers(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_local_qualifiers(uuid,jsonb) TO authenticated;