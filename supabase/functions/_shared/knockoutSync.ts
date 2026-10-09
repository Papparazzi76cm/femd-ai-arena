import { fetchAllRows } from './fetchAllRows.ts';
import { isGroupPhase, resolveBracketSlot } from './knockoutResolver.ts';
import type { EventTeam, Match } from './tournamentTypes.ts';

// Runs with the mesa endpoint's server client after its token authorization succeeds.
export async function synchronizeKnockoutSlots(client: { from(table: string): any }, eventId: string): Promise<number> {
  const [teams, matches] = await Promise.all([
    fetchAllRows<EventTeam>(() => client.from('event_teams').select('*').eq('event_id', eventId)),
    fetchAllRows<Match>(() => client.from('matches').select('*').eq('event_id', eventId)),
  ]);
  let changed = 0;
  for (const match of matches) {
    if (isGroupPhase(match.phase) || match.status !== 'scheduled') continue;
    const updates: Partial<Match> = {};
    for (const side of ['home', 'away'] as const) {
      const label = match[`${side}_placeholder`];
      if (!label) continue;
      const slot = resolveBracketSlot(match, label, teams, matches);
      if ((match[`${side}_team_id`] || null) === (slot?.teamId || null) &&
          (match[`${side}_event_team_id`] || null) === (slot?.eventTeamId || null)) continue;
      updates[`${side}_team_id`] = slot?.teamId || null;
      updates[`${side}_event_team_id`] = slot?.eventTeamId || null;
    }
    if (!Object.keys(updates).length) continue;
    let query = client.from('matches').update(updates).eq('id', match.id).eq('status', 'scheduled');
    for (const side of ['home', 'away'] as const) {
      for (const suffix of ['placeholder', 'team_id', 'event_team_id'] as const) {
        const column = `${side}_${suffix}` as const;
        query = match[column] == null ? query.is(column, null) : query.eq(column, match[column]);
      }
    }
    const { data, error } = await query.select('id');
    if (error) throw error;
    if (data?.length) { Object.assign(match, updates); changed += Object.keys(updates).length / 2; }
  }
  return changed;
}
