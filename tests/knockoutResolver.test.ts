import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBracketSlot } from '../src/services/knockoutResolver';
import type { Match, EventTeam } from '../src/types/tournament';
const team = (id: string, group = 'A', category = 'junior', club = id) => ({ id, team_id: club, event_id: 'event', group_name: group, category_id: category }) as EventTeam;
const match = (id: string, phase = 'gold_quarter_final', extra = {}) => ({ id, event_id: 'event', category_id: 'junior', phase, status: 'scheduled', home_team_id: null, away_team_id: null, ...extra }) as Match;
const target = match('target', 'gold_semi_final');
const gold = match('gold', 'gold_quarter_final', { group_name: 'C1', status: 'finished', home_team_id: 'g1', away_team_id: 'g2', home_score: 2, away_score: 0 });
const silver = match('silver', 'silver_quarter_final', { ...gold, id: 'silver', phase: 'silver_quarter_final', home_team_id: 's1' });
const groupA = match('a', 'group', { group_name: 'A', status: 'finished', home_team_id: 'a1', away_team_id: 'a2', home_score: 3, away_score: 0 });
const groupB = match('b', 'group', { group_name: 'B', status: 'finished', home_team_id: 'b1', away_team_id: 'b2', home_score: 1, away_score: 0 });
const teams = [team('a1'), team('a2'), team('b1', 'B'), team('b2', 'B')];
test('Oro C1 never uses Plata C1 regardless of query order', () => {
  assert.equal(resolveBracketSlot(target, 'Ganador C1', [], [silver, gold])?.teamId, 'g1');
  assert.equal(resolveBracketSlot(match('t', 'silver_semi_final'), 'Ganador C1', [], [gold, silver])?.teamId, 's1');
  assert.equal(resolveBracketSlot(match('t', 'bronze_semi_final'), 'Ganador C1', [], [gold, silver]), null);
});
test('category isolation, including identical group names', () => {
  assert.equal(resolveBracketSlot(target, 'Ganador C1', [], [{ ...gold, category_id: 'senior' }]), null);
  assert.equal(resolveBracketSlot(target, '1º Grupo A', teams.map(t => ({ ...t, category_id: 'senior' })), [groupA]), null);
});
test('draws and unfinished knockout matches have no winner or loser', () => {
  for (const source of [{ ...gold, away_score: 2 }, { ...gold, status: 'in_progress' as const }]) {
    assert.equal(resolveBracketSlot(target, 'Ganador C1', [], [source]), null);
    assert.equal(resolveBracketSlot(target, 'Perdedor C1', [], [source]), null);
  }
});
test('ambiguous bracket codes remain pending; exact ID is supported', () => {
  const duplicate = { ...gold, id: 'duplicate' };
  assert.equal(resolveBracketSlot(target, 'Ganador C1', [], [gold, duplicate]), null);
  assert.equal(resolveBracketSlot(target, 'Ganador gold', [], [gold, duplicate])?.teamId, 'g1');
});
test('completed group is assigned while another group remains open', () => {
  assert.equal(resolveBracketSlot(target, '1º Grupo A', teams, [groupA, { ...groupB, status: 'scheduled' }])?.teamId, 'a1');
  assert.equal(resolveBracketSlot(target, '1º Grupo B', teams, [groupA, { ...groupB, status: 'scheduled' }]), null);
});
test('best-place rankings wait for all groups and accept ordinal variants', () => {
  assert.equal(resolveBracketSlot(target, '1er Mejor 1º', teams, [groupA, { ...groupB, status: 'scheduled' }]), null);
  assert.equal(resolveBracketSlot(target, '1er Mejor 1º', teams, [groupA, groupB])?.teamId, 'a1');
  assert.equal(resolveBracketSlot(target, '2º Mejor 1º', teams, [groupA, groupB])?.teamId, 'b1');
  assert.equal(resolveBracketSlot(target, '1er Mejor 3ro', teams, [groupA, groupB]), null);
});
test('result correction recalculates the group slot and reopened match clears it', () => {
  assert.equal(resolveBracketSlot(target, '1º Grupo A', teams, [{ ...groupA, home_score: 0, away_score: 3 }, groupB])?.teamId, 'a2');
  assert.equal(resolveBracketSlot(target, '1º Grupo A', teams, [{ ...groupA, status: 'in_progress' }, groupB]), null);
});
test('same club with two registrations is calculated by registration ID', () => {
  const registrations = [team('reg1', 'A', 'junior', 'club'), team('reg2', 'A', 'junior', 'club')];
  const result = { ...groupA, home_team_id: 'club', away_team_id: 'club', home_event_team_id: 'reg1', away_event_team_id: 'reg2' };
  assert.deepEqual(resolveBracketSlot(target, '1º Grupo A', registrations, [result]), { teamId: 'club', eventTeamId: 'reg1' });
});
test('no matches and unknown labels never assign an arbitrary team', () => {
  assert.equal(resolveBracketSlot(target, '1º Grupo A', teams, []), null);
  assert.equal(resolveBracketSlot(target, 'anything', teams, [groupA]), null);
});

import { tournamentService } from '../src/services/tournamentService';
import { database } from './supabaseMock';
const setup = () => {
  database.matches = [groupA, groupB, { ...target, home_placeholder: '1º Grupo A', away_placeholder: '1º Grupo B' }].map(m => ({ ...m }));
  database.event_teams = teams;
  database.writes = 0;
  database.fail = false;
};
test('database resolver updates slots once and preserves started matches and manual slots', async () => {
  setup();
  assert.equal(await tournamentService.resolveKnockoutPlaceholders('event'), 2);
  assert.equal(await tournamentService.resolveKnockoutPlaceholders('event'), 0);
  assert.equal(database.writes, 1);
  const destination = database.matches[2];
  destination.status = 'in_progress';
  database.matches[0].home_score = 0; database.matches[0].away_score = 4;
  await tournamentService.resolveKnockoutPlaceholders('event');
  assert.equal(destination.home_team_id, 'a1');
  destination.status = 'scheduled'; destination.home_placeholder = null;
  await tournamentService.resolveKnockoutPlaceholders('event');
  assert.equal(destination.home_team_id, 'a1');
});
test('saving a result automatically assigns the bracket; Calendar override persists', async () => {
  setup();
  database.matches[0].status = 'in_progress';
  await tournamentService.updateMatch('a', { status: 'finished' });
  assert.equal(database.matches[2].home_team_id, 'a1');
  await tournamentService.updateMatch('target', { home_team_id: 'a2', home_event_team_id: 'a2' });
  assert.equal(database.matches[2].home_placeholder, null);
  await tournamentService.resolveKnockoutPlaceholders('event');
  assert.equal(database.matches[2].home_team_id, 'a2');
});
test('database failures are reported instead of claiming successful resolution', async () => {
  setup(); database.fail = true;
  await assert.rejects(tournamentService.resolveKnockoutPlaceholders('event'), /database failed/);
  database.fail = false;
});
