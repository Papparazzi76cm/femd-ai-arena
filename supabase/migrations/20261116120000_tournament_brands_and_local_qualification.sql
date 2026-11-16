-- Tournament brands and linked local/national competitions.
-- This is intentionally idempotent because Lovable may have provisioned the
-- same tables through its database migration runner before GitHub sync.

CREATE TABLE IF NOT EXISTS public.tournament_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text NOT NULL DEFAULT '',
  keywords text[] NOT NULL DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0
);

GRANT SELECT ON public.tournament_brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_brands TO authenticated;
GRANT ALL ON public.tournament_brands TO service_role;
ALTER TABLE public.tournament_brands ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tournament_brands'
      AND policyname = 'Visible brands and admin drafts'
  ) THEN
    CREATE POLICY "Visible brands and admin drafts"
      ON public.tournament_brands FOR SELECT TO anon, authenticated
      USING (is_public OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tournament_brands'
      AND policyname = 'Administrators manage brands'
  ) THEN
    CREATE POLICY "Administrators manage brands"
      ON public.tournament_brands FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.tournament_brands(id);
CREATE INDEX IF NOT EXISTS events_brand_id_idx ON public.events (brand_id);

INSERT INTO public.tournament_brands (slug, name, logo_url, keywords, is_public, display_order)
VALUES
  ('copa-rioseco', 'Copa Internacional Rioseco Caramanzana', '/logos-torneos/copa-rioseco.png', ARRAY['rioseco', 'caramanzana'], true, 0),
  ('villa-aranda', 'Torneo Internacional Villa de Aranda', '/logos-torneos/villa-aranda.png', ARRAY['villa de aranda', 'aranda'], true, 1),
  ('medina-cup', 'Clarios Medina International Cup', '/logos-torneos/medina-cup.png', ARRAY['medina'], true, 2),
  ('copa-cyl', 'Copa CyL', '/logos-torneos/copa-cyl.png', ARRAY['copa cyl', 'castilla y león'], true, 3),
  ('memorial-cd-victoria', 'Memorial CD Victoria', '/__l5e/assets-v1/be09d2c7-0bc0-471b-b580-e18cbb774eaf/memorial-santiago-alvarez.png', ARRAY['memorial cd victoria', 'memorial santiago álvarez'], true, 4),
  ('el-espinar-summit-cup', 'El Espinar Summit Cup', '/__l5e/assets-v1/2e97353b-0a32-4245-9b96-ed8357fff1bb/el-espinar-summit-cup.png', ARRAY['espinar', 'summit cup'], true, 5)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.local_qualification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_category_id uuid NOT NULL UNIQUE REFERENCES public.event_categories(id),
  target_category_id uuid NOT NULL REFERENCES public.event_categories(id),
  qualifiers_per_group integer NOT NULL DEFAULT 1
    CHECK (qualifiers_per_group BETWEEN 1 AND 200),
  CHECK (source_category_id <> target_category_id)
);

GRANT SELECT ON public.local_qualification_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.local_qualification_rules TO authenticated;
GRANT ALL ON public.local_qualification_rules TO service_role;
ALTER TABLE public.local_qualification_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'local_qualification_rules'
      AND policyname = 'Qualification rules readable'
  ) THEN
    CREATE POLICY "Qualification rules readable"
      ON public.local_qualification_rules FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'local_qualification_rules'
      AND policyname = 'Administrators manage qualification'
  ) THEN
    CREATE POLICY "Administrators manage qualification"
      ON public.local_qualification_rules FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_local_qualification_rule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  source_event_id uuid;
  source_category_id uuid;
  target_event_id uuid;
  target_category_id uuid;
BEGIN
  SELECT event_id, category_id
    INTO source_event_id, source_category_id
    FROM public.event_categories
    WHERE id = NEW.source_category_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La categoría local no existe.';
  END IF;

  SELECT event_id, category_id
    INTO target_event_id, target_category_id
    FROM public.event_categories
    WHERE id = NEW.target_category_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La categoría nacional no existe.';
  END IF;

  IF source_event_id = target_event_id THEN
    RAISE EXCEPTION 'Las fases local y nacional deben ser competiciones distintas.';
  END IF;
  IF source_category_id IS DISTINCT FROM target_category_id THEN
    RAISE EXCEPTION 'Las fases local y nacional deben usar la misma categoría.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_local_qualification_rule_trigger
  ON public.local_qualification_rules;
CREATE TRIGGER validate_local_qualification_rule_trigger
  BEFORE INSERT OR UPDATE ON public.local_qualification_rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_local_qualification_rule();

CREATE TABLE IF NOT EXISTS public.local_qualification_transfers (
  rule_id uuid NOT NULL REFERENCES public.local_qualification_rules(id),
  source_event_team_id uuid NOT NULL REFERENCES public.event_teams(id),
  target_event_team_id uuid NOT NULL REFERENCES public.event_teams(id),
  PRIMARY KEY (rule_id, source_event_team_id)
);

GRANT SELECT ON public.local_qualification_transfers TO authenticated;
GRANT ALL ON public.local_qualification_transfers TO service_role;
ALTER TABLE public.local_qualification_transfers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'local_qualification_transfers'
      AND policyname = 'Administrators read transfers'
  ) THEN
    CREATE POLICY "Administrators read transfers"
      ON public.local_qualification_transfers FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.transfer_local_qualifiers(
  p_rule_id uuid,
  p_assignments jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r public.local_qualification_rules%ROWTYPE;
  source_team public.event_teams%ROWTYPE;
  assignment jsonb;
  source_event_id uuid;
  target_event_id uuid;
  target_team_id uuid;
  transferred_count integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo administradores.';
  END IF;

  SELECT * INTO STRICT r
    FROM public.local_qualification_rules
    WHERE id = p_rule_id
    FOR UPDATE;

  SELECT event_id INTO source_event_id
    FROM public.event_categories
    WHERE id = r.source_category_id;
  SELECT event_id INTO target_event_id
    FROM public.event_categories
    WHERE id = r.target_category_id;

  IF source_event_id IS NULL OR target_event_id IS NULL
     OR source_event_id = target_event_id THEN
    RAISE EXCEPTION 'Configura una fase local y otra nacional en eventos distintos.';
  END IF;

  PERFORM 1 FROM public.events WHERE id = target_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La competición nacional no existe.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matches
    WHERE event_id = target_event_id
      AND category_id = r.target_category_id
      AND status IS DISTINCT FROM 'scheduled'
  ) THEN
    RAISE EXCEPTION 'La fase nacional ya ha comenzado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.matches
    WHERE event_id = source_event_id AND category_id = r.source_category_id
  ) OR EXISTS (
    SELECT 1 FROM public.matches
    WHERE event_id = source_event_id
      AND category_id = r.source_category_id
      AND (status IS DISTINCT FROM 'finished' OR home_score IS NULL OR away_score IS NULL)
  ) THEN
    RAISE EXCEPTION 'Finaliza todos los partidos de la fase local.';
  END IF;

  IF jsonb_typeof(p_assignments) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Selecciona los clasificados.';
  END IF;
  IF jsonb_array_length(p_assignments) = 0 THEN
    RAISE EXCEPTION 'Selecciona los clasificados.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_assignments)
    GROUP BY value->>'source_id'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Clasificados duplicados.';
  END IF;

  FOR assignment IN SELECT value FROM jsonb_array_elements(p_assignments) LOOP
    SELECT * INTO STRICT source_team
      FROM public.event_teams
      WHERE id = (assignment->>'source_id')::uuid
        AND category_id = r.source_category_id
        AND event_id = source_event_id;

    IF nullif(btrim(assignment->>'group_name'), '') IS NULL THEN
      RAISE EXCEPTION 'Asigna un grupo nacional a cada clasificado.';
    END IF;

    SELECT target_event_team_id INTO target_team_id
      FROM public.local_qualification_transfers
      WHERE rule_id = r.id AND source_event_team_id = source_team.id;
    IF FOUND THEN
      CONTINUE;
    END IF;

    -- Keep a team already entered directly in the national event. Only create
    -- a new registration when that identity is not present yet.
    SELECT id INTO target_team_id
      FROM public.event_teams
      WHERE event_id = target_event_id
        AND category_id = r.target_category_id
        AND team_id = source_team.team_id
        AND team_letter IS NOT DISTINCT FROM source_team.team_letter;

    IF NOT FOUND THEN
      INSERT INTO public.event_teams (event_id, category_id, team_id, team_letter, group_name)
      VALUES (
        target_event_id, r.target_category_id, source_team.team_id,
        source_team.team_letter, btrim(assignment->>'group_name')
      )
      RETURNING id INTO target_team_id;
    ELSE
      UPDATE public.event_teams
      SET group_name = COALESCE(NULLIF(group_name, ''), btrim(assignment->>'group_name'))
      WHERE id = target_team_id;
    END IF;

    INSERT INTO public.team_rosters (
      event_team_id, participant_id, jersey_number, is_captain, roster_role, staff_position
    )
    SELECT
      target_team_id, roster.participant_id, roster.jersey_number,
      roster.is_captain, roster.roster_role, roster.staff_position
    FROM public.team_rosters AS roster
    WHERE roster.event_team_id = source_team.id
      AND NOT EXISTS (
        SELECT 1 FROM public.team_rosters AS existing_roster
        WHERE existing_roster.event_team_id = target_team_id
          AND existing_roster.participant_id = roster.participant_id
      );

    INSERT INTO public.local_qualification_transfers (
      rule_id, source_event_team_id, target_event_team_id
    ) VALUES (r.id, source_team.id, target_team_id);

    transferred_count := transferred_count + 1;
  END LOOP;

  RETURN transferred_count;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_local_qualifiers(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_local_qualifiers(uuid, jsonb) TO authenticated;
