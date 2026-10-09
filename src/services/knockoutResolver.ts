import { buildGroupStandings, buildCrossGroupRankings, GroupMatch } from './tournamentEngine.ts';
import type { Match, EventTeam } from '../types/tournament';

export function isGroupPhase(phase: string): boolean {
  return phase === 'group' || phase === 'Fase de Grupos' || phase.startsWith('Jornada') || phase.toLowerCase().includes('grupo');
}

export function bracketTier(phase: string): string {
  return phase.match(/^(gold|silver|bronze)_/)?.[1] || 'open';
}

const complete = (m: Match) => m.status === 'finished' && m.home_score != null && m.away_score != null;

// Pure calculation: no database writes, one category and tier per destination.
export function resolveBracketSlot(target: Match, label: string, teams: EventTeam[], matches: Match[]): { teamId: string; eventTeamId: string | null } | null {
  const category = target.category_id || null;
  const scopedMatches = matches.filter(m => m.event_id === target.event_id && (m.category_id || null) === category);
  const scopedTeams = teams.filter(t => t.event_id === target.event_id && (t.category_id || null) === category);
  const dependency = label.match(/^(Ganador|Perdedor) (.+)$/);
  if (dependency) {
    const sources = scopedMatches.filter(m => m.id !== target.id && !isGroupPhase(m.phase) &&
      bracketTier(m.phase) === bracketTier(target.phase) && (m.id === dependency[2] || m.group_name === dependency[2]));
    // Never choose an arbitrary source when names repeat, or an away winner on a draw.
    if (sources.length !== 1 || !complete(sources[0]) || sources[0].home_score === sources[0].away_score) return null;
    const source = sources[0];
    const home = (source.home_score! > source.away_score!) === (dependency[1] === 'Ganador');
    const teamId = home ? source.home_team_id : source.away_team_id;
    const eventTeamId = home ? source.home_event_team_id : source.away_event_team_id;
    if (!teamId) return null;
    const registrations = scopedTeams.filter(t => t.team_id === teamId);
    return { teamId, eventTeamId: eventTeamId || (registrations.length === 1 ? registrations[0].id : null) };
  }

  const group = label.match(/^(\d+)(?:º|°|er|o) Grupo (.+)$/i);
  const best = label.match(/^(\d+)(?:º|°|er|o) Mejor (\d+)(?:º|°|ro|o)$/i);
  if (!group && !best) return null;
  const groupMatches = scopedMatches.filter(m => isGroupPhase(m.phase));
  const groupNames = [...new Set(scopedTeams.map(t => t.group_name).filter(Boolean))];
  const closed = (name: string) => {
    const ids = new Set(scopedTeams.filter(t => t.group_name === name).map(t => t.id));
    const teamIds = new Set(scopedTeams.filter(t => t.group_name === name).map(t => t.team_id));
    const scheduled = groupMatches.filter(m => m.group_name === name ||
      (m.home_event_team_id && m.away_event_team_id ? ids.has(m.home_event_team_id) && ids.has(m.away_event_team_id) :
        teamIds.has(m.home_team_id!) && teamIds.has(m.away_team_id!)));
    return scheduled.length > 0 && scheduled.every(complete);
  };
  if (group && !closed(group[2])) return null;
  if (best && (!groupNames.length || !groupNames.every(closed) || !groupMatches.every(complete))) return null;
  // Use registration IDs as engine identities to distinguish teams from the same club.
  const registrationId = (id: string | null, eventTeamId?: string | null) => {
    if (eventTeamId) return scopedTeams.some(t => t.id === eventTeamId) ? eventTeamId : '';
    const candidates = scopedTeams.filter(t => t.team_id === id);
    return candidates.length === 1 ? candidates[0].id : '';
  };
  const engineMatches: GroupMatch[] = groupMatches.filter(complete).map(m => ({
    id: m.id, homeTeamId: registrationId(m.home_team_id, m.home_event_team_id),
    awayTeamId: registrationId(m.away_team_id, m.away_event_team_id),
    homeScore: m.home_score!, awayScore: m.away_score!, homeYellowCards: m.home_yellow_cards,
    awayYellowCards: m.away_yellow_cards, homeRedCards: m.home_red_cards, awayRedCards: m.away_red_cards,
    phase: m.phase, groupName: m.group_name, status: m.status,
  }));
  const standings = buildGroupStandings(scopedTeams.map(t => ({ id: t.id, team_id: t.id, group_name: t.group_name || null })), engineMatches);
  const standing = group ? standings.get(group[2])?.[Number(group[1]) - 1] :
    buildCrossGroupRankings(standings).get(Number(best![2]))?.[Number(best![1]) - 1];
  const registration = scopedTeams.find(t => t.id === standing?.eventTeamId);
  return registration ? { teamId: registration.team_id, eventTeamId: registration.id } : null;
}
