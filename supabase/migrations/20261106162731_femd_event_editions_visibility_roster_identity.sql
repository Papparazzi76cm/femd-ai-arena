-- Event metadata: keep edition separate from the calendar date and allow drafts.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS edition smallint,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

UPDATE public.events
SET edition = CASE
  WHEN title ~ '202[0-9]/202[5-7]' THEN substring(title from '202[0-9]/(202[5-7])')::smallint
  WHEN title ~ '202[5-7]' THEN substring(title from '(202[5-7])')::smallint
  WHEN EXTRACT(YEAR FROM date)::integer BETWEEN 2025 AND 2027 THEN EXTRACT(YEAR FROM date)::smallint
  ELSE NULL
END
WHERE edition IS NULL;

ALTER TABLE public.events
  ADD CONSTRAINT events_edition_check CHECK (edition IS NULL OR edition IN (2025, 2026, 2027));

-- Public pages can only read published events; administrators retain access to drafts.
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
CREATE POLICY "Published events and admin drafts are viewable"
  ON public.events FOR SELECT TO anon, authenticated
  USING (is_public OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS events_public_edition_date_idx
  ON public.events (is_public, edition, date DESC);

-- Public form lookup: a valid, active roster token is required, and the lookup
-- returns only exact full-name matches plus the most recent tournament/club.
CREATE OR REPLACE FUNCTION public.find_roster_participant_matches(
  p_token text,
  p_first_name text,
  p_last_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_link public.roster_registration_links%ROWTYPE;
  v_full_name text;
  v_result jsonb;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Enlace no válido.';
  END IF;
  SELECT * INTO v_link FROM public.roster_registration_links
    WHERE token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
      AND revoked_at IS NULL AND expires_at > now();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El enlace ha caducado o ha sido cerrado. Solicita uno nuevo al organizador.';
  END IF;
  v_full_name := initcap(lower(btrim(regexp_replace(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, ''), '\s+', ' ', 'g'))));
  IF v_full_name = '' OR length(v_full_name) > 250 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'participant_id', candidate.id,
    'participant_name', candidate.name,
    'last_event_title', candidate.title,
    'last_team_name', candidate.team_name,
    'last_team_logo_url', candidate.logo_url
  ) ORDER BY candidate.event_date DESC NULLS LAST), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT p.id, p.name, latest.title, latest.event_date, latest.team_name, latest.logo_url
    FROM public.participants p
    LEFT JOIN LATERAL (
      SELECT e.title, e.date AS event_date, t.name AS team_name, t.logo_url
      FROM public.team_rosters r
      JOIN public.event_teams et ON et.id = r.event_team_id
      JOIN public.events e ON e.id = et.event_id
      JOIN public.teams t ON t.id = et.team_id
      WHERE r.participant_id = p.id
      ORDER BY e.date DESC, r.created_at DESC
      LIMIT 1
    ) latest ON true
    WHERE lower(btrim(regexp_replace(p.name, '\s+', ' ', 'g'))) = lower(v_full_name)
    ORDER BY latest.event_date DESC NULLS LAST
    LIMIT 10
  ) candidate;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_roster_registration(p_token text, p_members jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_link public.roster_registration_links%ROWTYPE;
  v_team_id uuid; v_member jsonb; v_first text; v_last text; v_dni text; v_date date;
  v_jersey integer; v_role text; v_staff text; v_no_dni boolean;
  v_participant_id uuid; v_matches integer; v_created integer := 0; v_linked integer := 0;
  v_jerseys integer[] := '{}'; v_dnis text[] := '{}'; v_result jsonb; v_name text;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Enlace no válido.'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(784312901);
  SELECT * INTO v_link FROM public.roster_registration_links
    WHERE token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  IF NOT FOUND OR v_link.revoked_at IS NOT NULL OR v_link.expires_at <= now() THEN
    RAISE EXCEPTION 'El enlace ha caducado o ha sido cerrado.';
  END IF;
  PERFORM 1 FROM public.event_teams WHERE id = v_link.event_team_id FOR UPDATE;
  SELECT * INTO v_link FROM public.roster_registration_links WHERE id = v_link.id FOR UPDATE;
  IF NOT FOUND OR v_link.revoked_at IS NOT NULL OR v_link.expires_at <= now() THEN
    RAISE EXCEPTION 'El enlace ha caducado o ha sido cerrado.';
  END IF;
  IF v_link.submitted_at IS NOT NULL THEN RETURN v_link.result; END IF;
  IF p_members IS NULL OR jsonb_typeof(p_members) <> 'array' THEN RAISE EXCEPTION 'La plantilla no es válida.'; END IF;
  IF jsonb_array_length(p_members) < 1 OR jsonb_array_length(p_members) > 200 THEN
    RAISE EXCEPTION 'La plantilla debe incluir entre 1 y 200 miembros.';
  END IF;
  SELECT team_id INTO v_team_id FROM public.event_teams WHERE id = v_link.event_team_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Equipo del torneo no encontrado.'; END IF;
  FOR v_member IN SELECT value FROM jsonb_array_elements(p_members) LOOP
    IF jsonb_typeof(v_member) <> 'object' THEN RAISE EXCEPTION 'Fila de plantilla no válida.'; END IF;
    v_first := initcap(lower(btrim(regexp_replace(coalesce(v_member->>'first_name', ''), '\s+', ' ', 'g'))));
    v_last := initcap(lower(btrim(regexp_replace(coalesce(v_member->>'last_name', ''), '\s+', ' ', 'g'))));
    IF v_first = '' OR v_last = '' OR length(v_first) > 100 OR length(v_last) > 150 THEN
      RAISE EXCEPTION 'Todos los miembros deben tener nombre y apellidos.';
    END IF;
    IF coalesce(v_member->>'birth_date', '') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'La fecha de nacimiento es obligatoria.'; END IF;
    BEGIN v_date := (v_member->>'birth_date')::date;
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Fecha de nacimiento no válida para % %.', v_first, v_last; END;
    IF v_date > current_date THEN RAISE EXCEPTION 'La fecha de nacimiento no puede ser futura.'; END IF;
    IF coalesce(v_member->>'jersey_number', '') !~ '^\d{1,3}$' THEN RAISE EXCEPTION 'El dorsal es obligatorio y debe estar entre 0 y 999.'; END IF;
    v_jersey := (v_member->>'jersey_number')::integer;
    IF v_jersey = ANY(v_jerseys) OR EXISTS(SELECT 1 FROM public.team_rosters WHERE event_team_id = v_link.event_team_id AND jersey_number = v_jersey) THEN
      RAISE EXCEPTION 'El dorsal % ya está utilizado en esta plantilla.', v_jersey;
    END IF;
    v_jerseys := array_append(v_jerseys, v_jersey);
    v_role := v_member->>'roster_role'; v_staff := v_member->>'staff_position';
    IF v_role IS NULL OR v_role NOT IN ('player', 'staff') THEN RAISE EXCEPTION 'Selecciona jugador o cuerpo técnico.'; END IF;
    IF v_role = 'staff' AND (v_staff IS NULL OR v_staff NOT IN ('primer_entrenador', 'segundo_entrenador', 'delegado', 'auxiliar')) THEN RAISE EXCEPTION 'Selecciona un cargo válido del cuerpo técnico.'; END IF;
    IF v_role = 'player' THEN v_staff := NULL; END IF;
    IF jsonb_typeof(v_member->'no_dni') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Indica DNI o marca No tiene.'; END IF;
    v_no_dni := (v_member->>'no_dni')::boolean;
    v_name := v_first || ' ' || v_last;
    v_participant_id := NULL;
    IF v_no_dni THEN
      v_dni := NULL;
      IF nullif(v_member->>'matched_participant_id', '') IS NOT NULL THEN
        BEGIN v_participant_id := (v_member->>'matched_participant_id')::uuid;
        EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'La selección de participante no es válida.'; END;
        SELECT count(*) INTO v_matches FROM public.participants
          WHERE id = v_participant_id AND lower(btrim(regexp_replace(name, '\s+', ' ', 'g'))) = lower(v_name);
        IF v_matches <> 1 THEN RAISE EXCEPTION 'La coincidencia seleccionada ya no es válida. Comprueba de nuevo el nombre.'; END IF;
      ELSE
        SELECT count(*) INTO v_matches FROM public.participants
          WHERE lower(btrim(regexp_replace(name, '\s+', ' ', 'g'))) = lower(v_name);
        IF v_matches > 0 AND coalesce((v_member->>'confirm_new_participant')::boolean, false) IS NOT TRUE THEN
          RAISE EXCEPTION 'Existe un participante con ese nombre. Confirma si es la misma persona antes de enviar.';
        END IF;
      END IF;
    ELSE
      v_dni := upper(regexp_replace(coalesce(v_member->>'dni', ''), '[\s-]+', '', 'g'));
      IF v_dni !~ '^[A-Z0-9][0-9]{7}[A-Z]$' THEN RAISE EXCEPTION 'DNI/NIE no válido: debe tener 9 caracteres.'; END IF;
      IF v_dni = ANY(v_dnis) THEN RAISE EXCEPTION 'El DNI/NIE % está repetido en la plantilla.', v_dni; END IF;
      v_dnis := array_append(v_dnis, v_dni);
      SELECT count(*), (array_agg(id))[1] INTO v_matches, v_participant_id FROM public.participants WHERE upper(regexp_replace(btrim(dni), '[\s-]+', '', 'g')) = v_dni;
      IF v_matches > 1 THEN RAISE EXCEPTION 'El DNI/NIE % tiene varias fichas. Contacta con el organizador.', v_dni; END IF;
    END IF;
    IF v_participant_id IS NULL THEN
      INSERT INTO public.participants(name, birth_date, dni, team_id, number)
        VALUES (v_name, v_date, v_dni, v_team_id, CASE WHEN v_role = 'player' THEN v_jersey ELSE NULL END)
        RETURNING id INTO v_participant_id;
      v_created := v_created + 1;
    ELSE v_linked := v_linked + 1;
    END IF;
    IF EXISTS(SELECT 1 FROM public.team_rosters WHERE event_team_id = v_link.event_team_id AND participant_id = v_participant_id) THEN
      RAISE EXCEPTION '% ya está incluido en la plantilla del equipo.', v_name;
    END IF;
    INSERT INTO public.team_rosters(event_team_id, participant_id, jersey_number, roster_role, staff_position, is_captain)
      VALUES (v_link.event_team_id, v_participant_id, v_jersey, v_role, v_staff, false);
  END LOOP;
  v_result := jsonb_build_object('registered', jsonb_array_length(p_members), 'created', v_created, 'linked', v_linked);
  UPDATE public.roster_registration_links SET submitted_at = now(), result = v_result WHERE id = v_link.id;
  RETURN v_result;
END; $$;

REVOKE ALL ON FUNCTION public.find_roster_participant_matches(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_roster_participant_matches(text, text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_roster_registration(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_roster_registration(text, jsonb) TO anon, authenticated;
