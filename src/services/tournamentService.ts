import { supabase } from '@/integrations/supabase/client';
import { EventTeam, Match, MatchScheduleConflict } from '@/types/tournament';
import { buildGroupStandings, buildCrossGroupRankings, sortCrossGroupRanking, GroupMatch } from '@/services/tournamentEngine';

export const tournamentService = {
  // Event Teams
  async getEventTeams(eventId: string): Promise<EventTeam[]> {
    const { data, error } = await supabase
      .from('event_teams')
      .select('*')
      .eq('event_id', eventId)
      .order('group_name')
      .order('points', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async addTeamsToEvent(eventId: string, teamIds: string[]): Promise<void> {
    const eventTeams = teamIds.map(teamId => ({
      event_id: eventId,
      team_id: teamId,
    }));

    const { error } = await supabase
      .from('event_teams')
      .insert(eventTeams);
    
    if (error) throw error;
  },

  async removeTeamFromEvent(eventTeamId: string): Promise<void> {
    const { error } = await supabase
      .from('event_teams')
      .delete()
      .eq('id', eventTeamId);
    
    if (error) throw error;
  },

  async updateEventTeam(id: string, updates: Partial<EventTeam>): Promise<void> {
    const { error } = await supabase
      .from('event_teams')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
  },

  // Matches
  async resolveEventTeamId(eventId: string, teamId: string | null, categoryId?: string | null): Promise<string | null> {
    if (!teamId) return null;
    const { data } = await supabase
      .from('event_teams')
      .select('id, category_id')
      .eq('event_id', eventId)
      .eq('team_id', teamId);

    if (!data || data.length === 0) return null;
    const exact = categoryId ? data.find(et => et.category_id === categoryId) : null;
    if (exact) return exact.id;
    const uncategorized = data.filter(et => !et.category_id);
    if (uncategorized.length === 1) return uncategorized[0].id;
    return data.length === 1 ? data[0].id : null;
  },

  async getMatches(eventId: string): Promise<Match[]> {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('event_id', eventId)
      .order('phase')
      .order('match_number');
    
    if (error) throw error;
    return (data || []) as Match[];
  },

  async createMatch(match: Omit<Match, 'id' | 'created_at'>): Promise<Match> {
    const matchWithEventTeams: any = { ...match };
    if (match.home_team_id && !match.home_event_team_id) {
      matchWithEventTeams.home_event_team_id = await this.resolveEventTeamId(match.event_id, match.home_team_id, match.category_id);
    }
    if (match.away_team_id && !match.away_event_team_id) {
      matchWithEventTeams.away_event_team_id = await this.resolveEventTeamId(match.event_id, match.away_team_id, match.category_id);
    }

    const { data, error } = await supabase
      .from('matches')
      .insert(matchWithEventTeams)
      .select()
      .single();
    
    if (error) throw error;
    return data as Match;
  },

  async updateMatch(id: string, updates: Partial<Match>): Promise<void> {
    const safeUpdates: any = { ...updates };
    if (updates.home_team_id !== undefined || updates.away_team_id !== undefined || updates.category_id !== undefined) {
      const { data: currentMatch } = await supabase.from('matches').select('*').eq('id', id).single();
      if (currentMatch) {
        const eventId = updates.event_id ?? currentMatch.event_id;
        const categoryId = updates.category_id !== undefined ? updates.category_id : currentMatch.category_id;
        if (updates.home_team_id !== undefined) {
          safeUpdates.home_event_team_id = await this.resolveEventTeamId(eventId, updates.home_team_id, categoryId);
        }
        if (updates.away_team_id !== undefined) {
          safeUpdates.away_event_team_id = await this.resolveEventTeamId(eventId, updates.away_team_id, categoryId);
        }
      }
    }

    const { error } = await supabase
      .from('matches')
      .update(safeUpdates)
      .eq('id', id);
    
    if (error) throw error;
  },

  async assignReferee(matchId: string, refereeUserId: string): Promise<void> {
    const { error } = await supabase
      .from('matches')
      .update({ referee_user_id: refereeUserId })
      .eq('id', matchId);
    
    if (error) throw error;
  },

  async unassignReferee(matchId: string): Promise<void> {
    const { error } = await supabase
      .from('matches')
      .update({ referee_user_id: null })
      .eq('id', matchId);
    
    if (error) throw error;
  },

  async deleteMatches(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('event_id', eventId);
    
    if (error) throw error;
  },

  async deleteMatch(matchId: string): Promise<void> {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);
    
    if (error) throw error;
  },

  // Update team statistics based on match results
  async updateTeamStatistics(eventId: string): Promise<void> {
    // Get all group stage matches for this event (including Jornada phases)
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('event_id', eventId)
      .not('home_score', 'is', null)
      .not('away_score', 'is', null);

    if (matchesError) throw matchesError;
    if (!matches || matches.length === 0) return;

    // Filter only group stage matches (phase = 'group', 'Fase de Grupos', or starts with 'Jornada')
    const groupMatches = matches.filter((m: any) => 
      m.phase === 'group' || 
      m.phase === 'Fase de Grupos' || 
      m.phase?.startsWith('Jornada') ||
      m.phase?.toLowerCase().includes('grupo')
    );

    // Get all event teams
    const { data: eventTeams, error: teamsError } = await supabase
      .from('event_teams')
      .select('*')
      .eq('event_id', eventId);

    if (teamsError) throw teamsError;
    if (!eventTeams) return;

    // Initialize statistics
    const teamStats = new Map<string, any>();
    eventTeams.forEach(et => {
      teamStats.set(et.team_id, {
        id: et.id,
        matches_played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0,
        yellow_cards: 0,
        red_cards: 0,
      });
    });

    // Calculate statistics from group matches
    groupMatches.forEach((match: any) => {
      const homeStats = teamStats.get(match.home_team_id);
      const awayStats = teamStats.get(match.away_team_id);

      if (!homeStats || !awayStats) return;

      homeStats.matches_played++;
      awayStats.matches_played++;

      homeStats.goals_for += match.home_score;
      homeStats.goals_against += match.away_score;
      awayStats.goals_for += match.away_score;
      awayStats.goals_against += match.home_score;

      homeStats.yellow_cards += match.home_yellow_cards || 0;
      homeStats.red_cards += match.home_red_cards || 0;
      awayStats.yellow_cards += match.away_yellow_cards || 0;
      awayStats.red_cards += match.away_red_cards || 0;

      if (match.home_score > match.away_score) {
        homeStats.wins++;
        homeStats.points += 3;
        awayStats.losses++;
      } else if (match.home_score < match.away_score) {
        awayStats.wins++;
        awayStats.points += 3;
        homeStats.losses++;
      } else {
        homeStats.draws++;
        awayStats.draws++;
        homeStats.points += 1;
        awayStats.points += 1;
      }

      homeStats.goal_difference = homeStats.goals_for - homeStats.goals_against;
      awayStats.goal_difference = awayStats.goals_for - awayStats.goals_against;
    });

    // Update all teams
    const updates = Array.from(teamStats.values()).map(stats => 
      supabase.from('event_teams').update(stats).eq('id', stats.id)
    );

    await Promise.all(updates);
  },

  // Get head-to-head result between two teams
  async getHeadToHeadResult(eventId: string, teamId1: string, teamId2: string): Promise<number> {
    const { data: allMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('event_id', eventId)
      .or(`and(home_team_id.eq.${teamId1},away_team_id.eq.${teamId2}),and(home_team_id.eq.${teamId2},away_team_id.eq.${teamId1})`)
      .not('home_score', 'is', null)
      .not('away_score', 'is', null);

    // Filter only group stage matches
    const matches = (allMatches || []).filter((m: any) => 
      m.phase === 'group' || 
      m.phase === 'Fase de Grupos' || 
      m.phase?.startsWith('Jornada') ||
      m.phase?.toLowerCase().includes('grupo')
    );

    if (matches.length === 0) return 0;

    const match = matches[0];
    let team1Goals = 0;
    let team2Goals = 0;

    if (match.home_team_id === teamId1) {
      team1Goals = match.home_score || 0;
      team2Goals = match.away_score || 0;
    } else {
      team1Goals = match.away_score || 0;
      team2Goals = match.home_score || 0;
    }

    if (team1Goals > team2Goals) return 1;
    if (team1Goals < team2Goals) return -1;
    return 0;
  },

  // Sort teams within a group with FIFA-style tie-breaking criteria
  // 1. Points, 2. Head-to-head, 3. Goal difference, 4. Goals for
  async sortTeamsByStandings(eventId: string, teams: EventTeam[]): Promise<EventTeam[]> {
    const sorted = [...teams].sort((a, b) => {
      // 1. Points
      if (b.points !== a.points) return b.points - a.points;
      
      // 3. Goal difference (head-to-head checked below)
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
      
      // 4. Goals for
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
      
      return 0;
    });

    // For 2-team ties, check head-to-head (criterion 2)
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].points === sorted[i + 1].points) {
        const h2h = await this.getHeadToHeadResult(eventId, sorted[i].team_id, sorted[i + 1].team_id);
        if (h2h === -1) {
          [sorted[i], sorted[i + 1]] = [sorted[i + 1], sorted[i]];
        }
      }
    }

    return sorted;
  },

  // Añadir equipo con letra automática si ya existe el mismo club
  async addTeamToEventWithLetter(
    eventId: string,
    teamId: string,
    categoryId?: string
  ): Promise<EventTeam> {
    // Verificar cuántos equipos del mismo club ya están en la misma categoría
    const { data: existingTeams } = await supabase
      .from('event_teams')
      .select('*')
      .eq('event_id', eventId)
      .eq('team_id', teamId)
      .eq('category_id', categoryId || '');

    let teamLetter: string | null = null;
    if (existingTeams && existingTeams.length > 0) {
      // Ya existe al menos uno, asignar letra al nuevo
      const letters = ['B', 'C', 'D', 'E', 'F', 'G', 'H'];
      teamLetter = letters[existingTeams.length - 1] || letters[letters.length - 1];
      
      // Si el primero no tiene letra, actualizarlo con 'A'
      const firstTeam = existingTeams.find(t => !t.team_letter);
      if (firstTeam) {
        await supabase
          .from('event_teams')
          .update({ team_letter: null }) // El original no lleva letra
          .eq('id', firstTeam.id);
      }
    }

    const { data, error } = await supabase
      .from('event_teams')
      .insert({
        event_id: eventId,
        team_id: teamId,
        category_id: categoryId,
        team_letter: teamLetter,
      })
      .select()
      .single();

    if (error) throw error;
    return data as EventTeam;
  },

  // Detectar conflictos de horarios
  async checkScheduleConflict(
    eventId: string,
    fieldId: string,
    matchDate: string,
    durationMinutes: number,
    excludeMatchId?: string
  ): Promise<MatchScheduleConflict[]> {
    const { data, error } = await supabase
      .rpc('check_match_schedule_conflict', {
        p_event_id: eventId,
        p_field_id: fieldId,
        p_match_date: matchDate,
        p_duration_minutes: durationMinutes,
        p_exclude_match_id: excludeMatchId || null,
      });

    if (error) throw error;
    return (data || []) as MatchScheduleConflict[];
  },

  // Obtener equipos de un evento con datos del club
  async getEventTeamsWithClubData(eventId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('event_teams')
      .select(`
        *,
        team:teams(*),
        category:event_categories(
          *,
          category:categories(*)
        )
      `)
      .eq('event_id', eventId)
      .order('group_name')
      .order('points', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Resolve knockout placeholders to actual team IDs
  async resolveKnockoutPlaceholders(eventId: string): Promise<number> {
    // Get all event teams
    const { data: eventTeams } = await supabase
      .from('event_teams')
      .select('*, team:teams(*)')
      .eq('event_id', eventId);

    if (!eventTeams || eventTeams.length === 0) return 0;

    // Get all matches
    const { data: allMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('event_id', eventId);

    if (!allMatches) return 0;

    // Convert to GroupMatch format for the engine
    const groupMatchData: GroupMatch[] = allMatches
      .filter((m: any) =>
        (m.phase === 'group' || m.phase === 'Fase de Grupos' || m.phase?.startsWith('Jornada') || m.phase?.toLowerCase().includes('grupo')) &&
        m.status === 'finished' && m.home_score != null && m.away_score != null
      )
      .map((m: any) => ({
        id: m.id,
        homeTeamId: m.home_team_id,
        awayTeamId: m.away_team_id,
        homeScore: m.home_score,
        awayScore: m.away_score,
        homeYellowCards: m.home_yellow_cards || 0,
        homeRedCards: m.home_red_cards || 0,
        awayYellowCards: m.away_yellow_cards || 0,
        awayRedCards: m.away_red_cards || 0,
        phase: m.phase,
        groupName: m.group_name,
        status: m.status,
      }));

    // Use engine to build standings with proper tiebreakers
    const standings = buildGroupStandings(
      eventTeams.map((et: any) => ({ id: et.id, team_id: et.team_id, group_name: et.group_name })),
      groupMatchData,
    );

    // Build cross-group rankings with average-based criteria
    const rankings = buildCrossGroupRankings(standings);

    // Build groups map for position lookup (groupName → sorted team list)
    const groups: Record<string, any[]> = {};
    standings.forEach((teamsList, groupName) => {
      if (groupName === 'Sin grupo') return;
      groups[groupName] = teamsList;
    });

    // Build "best Nth" rankings
    const bestByPosition: Record<number, any[]> = {};
    rankings.forEach((teams, pos) => {
      bestByPosition[pos] = teams;
    });

    // Resolve function: placeholder text → event_team_id (using et.id not team_id)
    const resolveTeamId = (placeholder: string | null): string | null => {
      if (!placeholder) return null;

      // "1º Grupo A" format
      const groupMatch = placeholder.match(/^(\d+)º Grupo (.+)$/);
      if (groupMatch) {
        const pos = parseInt(groupMatch[1]);
        const groupName = groupMatch[2];
        const groupTeams = groups[groupName];
        if (groupTeams && groupTeams[pos - 1]) return groupTeams[pos - 1].eventTeamId;
      }

      // "1er Mejor 2º" or "2º Mejor 1º" format
      const bestMatch = placeholder.match(/^(?:1er|(\d+)º) Mejor (\d+)º$/);
      if (bestMatch) {
        const rank = bestMatch[1] ? parseInt(bestMatch[1]) : 1;
        const pos = parseInt(bestMatch[2]);
        const ranked = bestByPosition[pos];
        if (ranked && ranked[rank - 1]) return ranked[rank - 1].eventTeamId;
      }

      // "Ganador O1" format — find finished match with that bracket name
      const winnerMatch = placeholder.match(/^Ganador (.+)$/);
      if (winnerMatch) {
        const bracketName = winnerMatch[1];
        const finishedMatch = allMatches.find((m: any) => m.group_name === bracketName && m.status === 'finished' && m.home_score != null);
        if (finishedMatch) {
          return finishedMatch.home_score > finishedMatch.away_score
            ? finishedMatch.home_team_id
            : finishedMatch.away_team_id;
        }
      }

      // "Perdedor O1" format
      const loserMatch = placeholder.match(/^Perdedor (.+)$/);
      if (loserMatch) {
        const bracketName = loserMatch[1];
        const finishedMatch = allMatches.find((m: any) => m.group_name === bracketName && m.status === 'finished' && m.home_score != null);
        if (finishedMatch) {
          return finishedMatch.home_score > finishedMatch.away_score
            ? finishedMatch.away_team_id
            : finishedMatch.home_team_id;
        }
      }

      return null;
    };

    // Find knockout matches with unresolved placeholders
    const knockoutMatches = allMatches.filter((m: any) =>
      m.phase !== 'group' && !m.phase?.startsWith('Jornada') &&
      ((m.home_placeholder && !m.home_team_id) || (m.away_placeholder && !m.away_team_id))
    );

    let resolved = 0;
    for (const m of knockoutMatches) {
      const updates: any = {};
      if (m.home_placeholder && !m.home_team_id) {
        const resolvedId = resolveTeamId(m.home_placeholder);
        if (resolvedId) {
          // resolvedId could be an eventTeamId or a teamId depending on the placeholder type
          // For group/best placeholders it's eventTeamId, for winner/loser it's teamId
          if (m.home_placeholder.startsWith('Ganador') || m.home_placeholder.startsWith('Perdedor')) {
            updates.home_team_id = resolvedId;
          } else {
            // It's an eventTeamId, need to get the team_id
            const et = eventTeams.find((e: any) => e.id === resolvedId);
            if (et) updates.home_team_id = et.team_id;
          }
          resolved++;
        }
      }
      if (m.away_placeholder && !m.away_team_id) {
        const resolvedId = resolveTeamId(m.away_placeholder);
        if (resolvedId) {
          if (m.away_placeholder.startsWith('Ganador') || m.away_placeholder.startsWith('Perdedor')) {
            updates.away_team_id = resolvedId;
          } else {
            const et = eventTeams.find((e: any) => e.id === resolvedId);
            if (et) updates.away_team_id = et.team_id;
          }
          resolved++;
        }
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('matches').update(updates).eq('id', m.id);
      }
    }

    return resolved;
  },

  // Auto-resolve winner/loser placeholders when a specific knockout match finishes
  async resolveWinnerForFinishedMatch(eventId: string, matchId: string): Promise<number> {
    const { data: finishedMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!finishedMatch || finishedMatch.status !== 'finished' || !finishedMatch.group_name) return 0;
    if (finishedMatch.home_score == null || finishedMatch.away_score == null) return 0;

    const bracketName = finishedMatch.group_name;
    const winnerId = finishedMatch.home_score > finishedMatch.away_score
      ? finishedMatch.home_team_id
      : finishedMatch.away_team_id;
    const loserId = finishedMatch.home_score > finishedMatch.away_score
      ? finishedMatch.away_team_id
      : finishedMatch.home_team_id;

    if (!winnerId || !loserId) return 0;

    // Find matches with placeholders referencing this bracket name
    const { data: dependentMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('event_id', eventId)
      .neq('id', matchId);

    if (!dependentMatches) return 0;

    let resolved = 0;
    for (const m of dependentMatches) {
      const updates: any = {};
      if (m.home_placeholder === `Ganador ${bracketName}` && !m.home_team_id) {
        updates.home_team_id = winnerId;
        resolved++;
      }
      if (m.away_placeholder === `Ganador ${bracketName}` && !m.away_team_id) {
        updates.away_team_id = winnerId;
        resolved++;
      }
      if (m.home_placeholder === `Perdedor ${bracketName}` && !m.home_team_id) {
        updates.home_team_id = loserId;
        resolved++;
      }
      if (m.away_placeholder === `Perdedor ${bracketName}` && !m.away_team_id) {
        updates.away_team_id = loserId;
        resolved++;
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('matches').update(updates).eq('id', m.id);
      }
    }

    return resolved;
  },

  // Manually assign a team to a match slot
  async manuallyAssignTeam(matchId: string, side: 'home' | 'away', teamId: string): Promise<void> {
    const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();
    const updates: any = {};
    if (side === 'home') {
      updates.home_team_id = teamId;
      updates.home_event_team_id = match ? await this.resolveEventTeamId(match.event_id, teamId, match.category_id) : null;
    } else {
      updates.away_team_id = teamId;
      updates.away_event_team_id = match ? await this.resolveEventTeamId(match.event_id, teamId, match.category_id) : null;
    }
    const { error } = await supabase
      .from('matches')
      .update(updates)
      .eq('id', matchId);
    if (error) throw error;
  },
};
