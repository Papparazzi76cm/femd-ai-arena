-- Capability links: trainers can submit only the roster of the assigned event team.
CREATE TABLE public.roster_registration_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_team_id uuid NOT NULL REFERENCES public.event_teams(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  revoked_at timestamptz,
  submitted_at timestamptz,
  result jsonb
);
ALTER TABLE public.roster_registration_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.roster_registration_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.roster_registration_links TO authenticated;
CREATE POLICY "Admins read registration status" ON public.roster_registration_links
  FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()), 'admin'));
CREATE INDEX roster_registration_links_team_idx ON public.roster_registration_links(event_team_id);
CREATE INDEX participants_normalized_dni_idx ON public.participants(upper(btrim(dni))) WHERE dni IS NOT NULL;

-- Preserve legacy duplicates, but reject every new conflicting number, including admin edits.
CREATE FUNCTION public.enforce_roster_jersey_number()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.jersey_number IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.event_team_id = OLD.event_team_id
      AND NEW.jersey_number IS NOT DISTINCT FROM OLD.jersey_number THEN RETURN NEW; END IF;
  PERFORM 1 FROM public.event_teams WHERE id = NEW.event_team_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.team_rosters r WHERE r.event_team_id = NEW.event_team_id
      AND r.jersey_number = NEW.jersey_number AND r.id <> NEW.id) THEN
    RAISE EXCEPTION 'El dorsal % ya está utilizado en esta plantilla.', NEW.jersey_number;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enforce_roster_jersey_number() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER roster_jersey_number_guard BEFORE INSERT OR UPDATE OF event_team_id, jersey_number
  ON public.team_rosters FOR EACH ROW EXECUTE FUNCTION public.enforce_roster_jersey_number();

CREATE FUNCTION public.create_roster_registration_link(p_event_team_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_token text; v_id uuid; v_expiry timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo un administrador puede generar enlaces de registro.';
  END IF;
  PERFORM 1 FROM public.event_teams WHERE id = p_event_team_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Equipo del torneo no encontrado.'; END IF;
  UPDATE public.roster_registration_links SET revoked_at = now()
    WHERE event_team_id = p_event_team_id AND revoked_at IS NULL;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.roster_registration_links(event_team_id, token_hash, created_by)
    VALUES (p_event_team_id, encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid())
    RETURNING id, expires_at INTO v_id, v_expiry;
  RETURN jsonb_build_object('id', v_id, 'token', v_token, 'expires_at', v_expiry);
END; $$;

CREATE FUNCTION public.revoke_roster_registration_link(p_event_team_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo un administrador puede cerrar enlaces de registro.';
  END IF;
  PERFORM 1 FROM public.event_teams WHERE id = p_event_team_id FOR UPDATE;
  UPDATE public.roster_registration_links SET revoked_at = now()
    WHERE event_team_id = p_event_team_id AND revoked_at IS NULL;
END; $$;

-- No global DNI/name lookup is exposed. The context contains only team/event metadata and occupied numbers.
CREATE FUNCTION public.get_roster_registration_context(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_link public.roster_registration_links%ROWTYPE; v_context jsonb;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Enlace no válido.'; END IF;
  SELECT * INTO v_link FROM public.roster_registration_links
    WHERE token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
      AND revoked_at IS NULL AND expires_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'El enlace ha caducado o ha sido cerrado. Solicita uno nuevo al organizador.'; END IF;
  SELECT jsonb_build_object('team_name', t.name || coalesce(' ' || nullif(et.team_letter, ''), ''),
    'event_title', e.title, 'category_name', c.name, 'expires_at', v_link.expires_at,
    'submitted', v_link.submitted_at IS NOT NULL, 'result', v_link.result,
    'occupied_numbers', coalesce((SELECT jsonb_agg(r.jersey_number) FROM public.team_rosters r
      WHERE r.event_team_id = et.id AND r.jersey_number IS NOT NULL), '[]'::jsonb))
    INTO v_context FROM public.event_teams et JOIN public.teams t ON t.id = et.team_id
    JOIN public.events e ON e.id = et.event_id LEFT JOIN public.event_categories ec ON ec.id = et.category_id
    LEFT JOIN public.categories c ON c.id = ec.category_id WHERE et.id = v_link.event_team_id;
  RETURN v_context;
END; $$;

CREATE FUNCTION public.submit_roster_registration(p_token text, p_members jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_link public.roster_registration_links%ROWTYPE;
  v_team_id uuid; v_member jsonb; v_first text; v_last text; v_dni text; v_date date;
  v_jersey integer; v_role text; v_staff text; v_no_dni boolean;
  v_participant_id uuid; v_matches integer; v_created integer := 0; v_linked integer := 0;
  v_jerseys integer[] := '{}'; v_dnis text[] := '{}'; v_result jsonb;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Enlace no válido.'; END IF;
  -- Serialize submissions to avoid duplicate DNI creation across concurrent team links.
  PERFORM pg_catalog.pg_advisory_xact_lock(784312901);
  SELECT * INTO v_link FROM public.roster_registration_links
    WHERE token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  IF NOT FOUND OR v_link.revoked_at IS NOT NULL OR v_link.expires_at <= now() THEN
    RAISE EXCEPTION 'El enlace ha caducado o ha sido cerrado.';
  END IF;
  -- Always lock the event team before its links, just like creation/revocation.
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
  -- Every statement belongs to one RPC transaction: any invalid row rolls back the full submission.
  FOR v_member IN SELECT value FROM jsonb_array_elements(p_members) LOOP
    IF jsonb_typeof(v_member) <> 'object' THEN RAISE EXCEPTION 'Fila de plantilla no válida.'; END IF;
    v_first := initcap(lower(btrim(regexp_replace(coalesce(v_member->>'first_name', ''), '\s+', ' ', 'g'))));
    v_last := initcap(lower(btrim(regexp_replace(coalesce(v_member->>'last_name', ''), '\s+', ' ', 'g'))));
    IF v_first = '' OR v_last = '' OR length(v_first) > 100 OR length(v_last) > 150 THEN
      RAISE EXCEPTION 'Todos los miembros deben tener nombre y apellidos.';
    END IF;
    IF coalesce(v_member->>'birth_date', '') !~ '^\d{4}-\d{2}-\d{2}$' THEN
      RAISE EXCEPTION 'La fecha de nacimiento es obligatoria.';
    END IF;
    BEGIN v_date := (v_member->>'birth_date')::date;
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Fecha de nacimiento no válida para % %.', v_first, v_last; END;
    IF v_date > current_date THEN RAISE EXCEPTION 'La fecha de nacimiento no puede ser futura.'; END IF;
    IF coalesce(v_member->>'jersey_number', '') !~ '^\d{1,3}$' THEN
      RAISE EXCEPTION 'El dorsal es obligatorio para todos los miembros y debe estar entre 0 y 999.';
    END IF;
    v_jersey := (v_member->>'jersey_number')::integer;
    IF v_jersey = ANY(v_jerseys) OR EXISTS(SELECT 1 FROM public.team_rosters
      WHERE event_team_id = v_link.event_team_id AND jersey_number = v_jersey) THEN
      RAISE EXCEPTION 'El dorsal % ya está utilizado en esta plantilla.', v_jersey;
    END IF;
    v_jerseys := array_append(v_jerseys, v_jersey);
    v_role := v_member->>'roster_role'; v_staff := v_member->>'staff_position';
    IF v_role IS NULL OR v_role NOT IN ('player', 'staff') THEN RAISE EXCEPTION 'Selecciona jugador o cuerpo técnico.'; END IF;
    IF v_role = 'staff' AND (v_staff IS NULL OR v_staff NOT IN ('primer_entrenador', 'segundo_entrenador', 'delegado', 'auxiliar')) THEN
      RAISE EXCEPTION 'Selecciona un cargo válido del cuerpo técnico.';
    END IF;
    IF v_role = 'player' THEN v_staff := NULL; END IF;
    IF jsonb_typeof(v_member->'no_dni') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Indica DNI o marca No tiene.'; END IF;
    v_no_dni := (v_member->>'no_dni')::boolean;
    v_participant_id := NULL;
    IF v_no_dni THEN v_dni := NULL;
    ELSE
      v_dni := upper(v_member->>'dni');
      IF v_dni IS NULL OR v_dni !~ '^[A-Z0-9][0-9]{7}[A-Z]$' THEN
        RAISE EXCEPTION 'DNI/NIE no válido: debe tener 9 caracteres sin espacios ni guiones.';
      END IF;
      IF v_dni = ANY(v_dnis) THEN RAISE EXCEPTION 'El DNI/NIE % está repetido en la plantilla.', v_dni; END IF;
      v_dnis := array_append(v_dnis, v_dni);
      SELECT count(*), (array_agg(id))[1] INTO v_matches, v_participant_id
        FROM public.participants WHERE upper(btrim(dni)) = v_dni;
      IF v_matches > 1 THEN RAISE EXCEPTION 'El DNI/NIE % tiene varias fichas. Contacta con el organizador.', v_dni; END IF;
    END IF;
    IF v_participant_id IS NULL THEN
      INSERT INTO public.participants(name, birth_date, dni, team_id, number)
        VALUES (v_first || ' ' || v_last, v_date, v_dni, v_team_id, CASE WHEN v_role = 'player' THEN v_jersey ELSE NULL END)
        RETURNING id INTO v_participant_id;
      v_created := v_created + 1;
    ELSE v_linked := v_linked + 1;
    END IF;
    IF EXISTS(SELECT 1 FROM public.team_rosters WHERE event_team_id = v_link.event_team_id AND participant_id = v_participant_id) THEN
      RAISE EXCEPTION '% % ya está incluido en la plantilla del equipo.', v_first, v_last;
    END IF;
    INSERT INTO public.team_rosters(event_team_id, participant_id, jersey_number, roster_role, staff_position, is_captain)
      VALUES (v_link.event_team_id, v_participant_id, v_jersey, v_role, v_staff, false);
  END LOOP;
  v_result := jsonb_build_object('registered', jsonb_array_length(p_members), 'created', v_created, 'linked', v_linked);
  UPDATE public.roster_registration_links SET submitted_at = now(), result = v_result WHERE id = v_link.id;
  RETURN v_result;
END; $$;

-- Explicit grants: no open table writes or default PUBLIC execution privileges.
REVOKE ALL ON FUNCTION public.create_roster_registration_link(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_roster_registration_link(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_roster_registration_context(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_roster_registration(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_roster_registration_link(uuid), public.revoke_roster_registration_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_roster_registration_context(text), public.submit_roster_registration(text, jsonb) TO anon, authenticated;
