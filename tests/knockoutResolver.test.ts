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

import { fetchAllRows } from '../src/services/fetchAllRows';
test('pagination loads 2,501 rows, including the match beyond row 1,000', async () => {
  setup();
  database.matches = Array.from({ length: 2501 }, (_, i) => match(`m${i}`, 'group', { match_date: '2026-01-01', status: i === 2000 ? 'in_progress' : 'finished' }));
  const loaded = await tournamentService.getMatches('event');
  assert.equal(loaded.length, 2501);
  assert.equal(loaded.find(m => m.id === 'm2000')?.status, 'in_progress');
  await tournamentService.updateMatch('m2000', { status: 'finished' });
  assert.equal((await tournamentService.getMatches('event')).find(m => m.id === 'm2000')?.status, 'finished');
});
test('pagination continues when server returns fewer than requested rows', async () => {
  const source = Array.from({ length: 1234 }, (_, id) => ({ id }));
  const loaded = await fetchAllRows(() => ({ order: () => ({ range: async (from, to) => ({ data: source.slice(from, Math.min(to + 1, from + 100)), error: null }) }) }));
  assert.deepEqual(loaded, source);
});
test('pagination handles exactly full pages and empty sets', async () => {
  for (const size of [0, 500, 1000]) {
    const source = Array.from({ length: size }, (_, id) => ({ id }));
    const loaded = await fetchAllRows(() => ({ order: () => ({ range: async (from, to) => ({ data: source.slice(from, to + 1), error: null }) }) }));
    assert.deepEqual(loaded, source);
  }
});
test('pagination rejects a later page error rather than returning incomplete data', async () => {
  await assert.rejects(fetchAllRows(() => ({ order: () => ({ range: async from => from === 0 ?
    { data: [{ id: 1 }], error: null } : { data: null, error: new Error('page failed') } }) })), /page failed/);
});

import { RegistrationMember, titleCase, validateRoster, registrationPayload } from '../src/services/rosterRegistrationValidation';
const member = (changes: Partial<RegistrationMember> = {}): RegistrationMember => ({ key: '1', first_name: 'JUAN', last_name: 'PÉREZ GARCÍA', birth_date: '2010-01-01', jersey_number: '7', dni: '12345678A', no_dni: false, roster_role: 'player', staff_position: '', ...changes });
test('roster requires all fields and rejects duplicate numeric jerseys', () => {
  assert.deepEqual(validateRoster([member()]), []);
  for (const field of ['first_name', 'last_name', 'birth_date', 'jersey_number', 'dni'] as const) assert.ok(validateRoster([member({ [field]: '' })]).length);
  assert.ok(validateRoster([member(), member({ key: '2', jersey_number: '007', dni: 'X1234567A' })]).some(error => error.includes('dorsal')));
  assert.ok(validateRoster([member()], [7]).length);
});
test('roster DNI/NIE format, no-DNI option and duplicate documents', () => {
  assert.deepEqual(validateRoster([member({ dni: 'X1234567A' })]), []);
  assert.deepEqual(validateRoster([member({ dni: '', no_dni: true })]), []);
  for (const dni of ['12345678', '123456789', '1234567-A', '1234567 A', 'XX234567A', '123456789A']) assert.ok(validateRoster([member({ dni })]).length);
  assert.ok(validateRoster([member(), member({ key: '2', jersey_number: '8', dni: '12345678a' })]).some(error => error.includes('DNI/NIE ya')));
});
test('roster staff positions and valid birth dates', () => {
  assert.ok(validateRoster([member({ roster_role: 'staff' })]).length);
  for (const staff_position of ['primer_entrenador', 'segundo_entrenador', 'delegado', 'auxiliar']) assert.deepEqual(validateRoster([member({ roster_role: 'staff', staff_position })]), []);
  assert.ok(validateRoster([member({ birth_date: '2010-02-30' })]).length);
  assert.ok(validateRoster([member({ birth_date: '2099-01-01' })]).length);
});
test('roster stores normalized names, upper-case DNI and null for no DNI', () => {
  assert.equal(titleCase("  MARÍA   JOSÉ O'NEILL-GARCÍA  "), "María José O'Neill-García");
  assert.equal(registrationPayload([member()])[0].last_name, 'Pérez García');
  assert.equal(registrationPayload([member({ dni: '12345678a' })])[0].dni, '12345678A');
  assert.equal(registrationPayload([member({ no_dni: true })])[0].dni, null);
});

import { matchDateToInput, matchDateToUTC } from '../src/lib/matchDateTime';
test('10:00 Spanish summer and winter time survives save and edit unchanged', () => {
  assert.equal(matchDateToUTC('2026-10-09T10:00'), '2026-10-09T08:00:00.000Z');
  assert.equal(matchDateToUTC('2026-12-09T10:00'), '2026-12-09T09:00:00.000Z');
  for (const input of ['2026-10-09T10:00', '2026-12-09T10:00', '2026-07-01T00:15']) assert.equal(matchDateToInput(matchDateToUTC(input)), input);
});
test('schedule conversion is independent of browser timezone and preserves explicit instants', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['UTC', 'America/Asuncion', 'Europe/Madrid']) {
      process.env.TZ = zone;
      assert.equal(matchDateToUTC('2026-10-09T10:00'), '2026-10-09T08:00:00.000Z');
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
  assert.equal(matchDateToUTC('2026-10-09T10:00:00+02:00'), '2026-10-09T08:00:00.000Z');
  assert.equal(matchDateToUTC('2026-10-09T08:00:00Z'), '2026-10-09T08:00:00.000Z');
});
test('schedule conversion rejects invalid dates and daylight-saving gaps', () => {
  assert.throws(() => matchDateToUTC('2026-02-30T10:00'));
  assert.throws(() => matchDateToUTC('2026-03-29T02:30'), /no existe/);
  assert.equal(matchDateToUTC('2026-10-25T02:30'), '2026-10-25T00:30:00.000Z');
});
test('Calendar save normalizes the submitted time before updating the database', async () => {
  setup();
  await tournamentService.updateMatch('a', { match_date: '2026-10-09T10:00' });
  assert.equal(database.matches[0].match_date, '2026-10-09T08:00:00.000Z');
  assert.equal(matchDateToInput(database.matches[0].match_date), '2026-10-09T10:00');
});
