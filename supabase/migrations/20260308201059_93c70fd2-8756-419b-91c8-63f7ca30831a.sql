
ALTER TABLE event_teams DROP CONSTRAINT event_teams_event_id_team_id_key;
ALTER TABLE event_teams ADD CONSTRAINT event_teams_event_id_team_id_category_id_key UNIQUE (event_id, team_id, category_id);
