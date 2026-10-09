-- Execute inside BEGIN / ROLLBACK. All fixture rows and links are rolled back.
DO $$
DECLARE
  v_event uuid; v_team uuid; v_et uuid := gen_random_uuid(); v_admin uuid;
  v_existing uuid; v_document text; v_link jsonb; v_token text; v_result jsonb;
  v_member jsonb; v_new jsonb; v_staff jsonb; v_members jsonb; v_count integer;
BEGIN
  SELECT event_id, team_id INTO v_event, v_team FROM public.event_teams LIMIT 1;
  IF v_event IS NULL THEN RAISE EXCEPTION 'Tests require an existing event and team.'; END IF;
  v_team := gen_random_uuid();
  INSERT INTO public.teams(id,name) VALUES(v_team,'Fixture Registro ' || v_team::text);
  INSERT INTO public.event_teams(id, event_id, team_id) VALUES(v_et, v_event, v_team);
  SELECT user_id INTO v_admin FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF v_admin IS NULL THEN RAISE EXCEPTION 'Tests require an admin.'; END IF;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  BEGIN
    PERFORM public.create_roster_registration_link(v_et);
    RAISE EXCEPTION 'Expected admin authorization rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'Solo un administrador%' THEN RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
  v_link := public.create_roster_registration_link(v_et); v_token := v_link->>'token';
  IF length(v_token) <> 64 THEN RAISE EXCEPTION 'Token entropy/length incorrect'; END IF;
  IF public.get_roster_registration_context(v_token)->>'submitted' <> 'false' THEN RAISE EXCEPTION 'Fresh link must be open'; END IF;
  BEGIN
    PERFORM public.get_roster_registration_context(repeat('0',64));
    RAISE EXCEPTION 'Expected invalid token rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'El enlace ha caducado%' THEN RAISE; END IF;
  END;
  LOOP
    v_document := 'Z' || lpad((floor(random()*10000000)::integer)::text,7,'0') || 'Z';
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.participants WHERE upper(btrim(dni)) = v_document);
  END LOOP;
  INSERT INTO public.participants(name, birth_date, dni, team_id) VALUES('Existing Fixture', '2010-01-01', lower(v_document), v_team) RETURNING id INTO v_existing;
  v_member := jsonb_build_object('first_name','JUAN','last_name','PÉREZ','birth_date','2010-01-01','jersey_number',7,'dni',v_document,'no_dni',false,'roster_role','player','staff_position',NULL);
  v_new := v_member || jsonb_build_object('first_name','MARÍA','last_name','GARCÍA','jersey_number',8,'no_dni',true,'dni',NULL);
  v_staff := v_new || jsonb_build_object('first_name','PEDRO','jersey_number',9,'roster_role','staff','staff_position','primer_entrenador');
  BEGIN
    PERFORM public.submit_roster_registration(v_token, jsonb_build_array(v_member, v_new || '{"jersey_number":7}'::jsonb));
    RAISE EXCEPTION 'Expected duplicate jersey rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'El dorsal %ya está utilizado%' THEN RAISE; END IF;
  END;
  SELECT count(*) INTO v_count FROM public.team_rosters WHERE event_team_id=v_et;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Invalid submission was not atomic'; END IF;
  BEGIN
    PERFORM public.submit_roster_registration(v_token, jsonb_build_array(v_member || '{"birth_date":""}'::jsonb));
    RAISE EXCEPTION 'Expected missing birth date rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'La fecha de nacimiento%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.submit_roster_registration(v_token, jsonb_build_array(v_member || '{"dni":"1234567-A"}'::jsonb));
    RAISE EXCEPTION 'Expected malformed DNI rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'DNI/NIE no válido%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.submit_roster_registration(v_token, jsonb_build_array(v_staff || '{"staff_position":"otro"}'::jsonb));
    RAISE EXCEPTION 'Expected invalid staff position rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'Selecciona un cargo válido%' THEN RAISE; END IF;
  END;
  v_members := jsonb_build_array(v_member,v_new,v_staff);
  v_result := public.submit_roster_registration(v_token,v_members);
  IF v_result <> '{"registered":3,"created":2,"linked":1}'::jsonb THEN RAISE EXCEPTION 'Incorrect create/link results: %',v_result; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.team_rosters WHERE event_team_id=v_et AND participant_id=v_existing AND jersey_number=7) THEN RAISE EXCEPTION 'DNI not linked to original participant'; END IF;
  IF (SELECT name FROM public.participants WHERE id=v_existing) <> 'Existing Fixture' THEN RAISE EXCEPTION 'Existing global data was overwritten'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.team_rosters r JOIN public.participants p ON p.id=r.participant_id WHERE r.event_team_id=v_et AND p.name='María García' AND p.dni IS NULL AND p.team_id=v_team) THEN RAISE EXCEPTION 'Name normalization or no-DNI linking incorrect'; END IF;
  IF public.submit_roster_registration(v_token,v_members) <> v_result THEN RAISE EXCEPTION 'Resubmission is not idempotent'; END IF;
  SELECT count(*) INTO v_count FROM public.team_rosters WHERE event_team_id=v_et;
  IF v_count <> 3 THEN RAISE EXCEPTION 'Resubmission created duplicates'; END IF;
  IF public.get_roster_registration_context(v_token)->>'submitted' <> 'true' THEN RAISE EXCEPTION 'Submitted status incorrect'; END IF;
  BEGIN
    INSERT INTO public.team_rosters(event_team_id,participant_id,jersey_number)
      VALUES(v_et,gen_random_uuid(),7);
    RAISE EXCEPTION 'Expected direct duplicate jersey rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'El dorsal %ya está utilizado%' THEN RAISE; END IF;
  END;
  v_link := public.create_roster_registration_link(v_et);
  BEGIN
    PERFORM public.get_roster_registration_context(v_token);
    RAISE EXCEPTION 'Expected old link revocation';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'El enlace ha caducado%' THEN RAISE; END IF;
  END;
  v_token := v_link->>'token';
  PERFORM public.revoke_roster_registration_link(v_et);
  BEGIN
    PERFORM public.submit_roster_registration(v_token,v_members);
    RAISE EXCEPTION 'Expected revoked submission rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'El enlace ha caducado%' THEN RAISE; END IF;
  END;
END; $$;
