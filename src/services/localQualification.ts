import { buildGroupStandings, type GroupMatch } from './tournamentEngine';
import type { EventTeam, Match } from '../types/tournament';
export function localQualifiers(teams: EventTeam[], matches: Match[], categoryId: string, count: number): EventTeam[] {
  if (!Number.isInteger(count) || count < 1) throw new Error('Número de clasificados no válido.');
  const scoped = teams.filter(t => t.category_id === categoryId);
  const games = matches.filter(m => m.category_id === categoryId);
  if (!games.length || games.some(m => m.status !== 'finished' || m.home_score == null || m.away_score == null)) throw new Error('Finaliza todos los partidos de la fase local.');
  const identity = (club: string | null, registration?: string | null) => {
    if (registration && scoped.some(t => t.id === registration)) return registration;
    const candidates = scoped.filter(t => t.team_id === club);
    if (candidates.length !== 1) throw new Error('Revisa los equipos exactos de los partidos locales.');
    return candidates[0].id;
  };
  const engineGames: GroupMatch[] = games.map(m => ({
    id: m.id, homeTeamId: identity(m.home_team_id, m.home_event_team_id), awayTeamId: identity(m.away_team_id, m.away_event_team_id),
    homeScore: m.home_score ?? 0, awayScore: m.away_score ?? 0, homeYellowCards: m.home_yellow_cards, awayYellowCards: m.away_yellow_cards,
    homeRedCards: m.home_red_cards, awayRedCards: m.away_red_cards, phase: 'group', groupName: m.group_name, status: m.status,
  }));
  if (scoped.some(t => !t.group_name)) throw new Error('Asigna los grupos locales.');
  const standings = buildGroupStandings(scoped.map(t => ({ id: t.id, team_id: t.id, group_name: t.group_name ?? null })), engineGames);
  const ids = new Set([...standings.values()].flatMap(group => {
    if (group.some(t => t.matchesPlayed === 0)) throw new Error('Hay equipos sin partidos en la fase local.');
    return group.slice(0, count).map(t => t.eventTeamId);
  }));
  return scoped.filter(t => ids.has(t.id));
}