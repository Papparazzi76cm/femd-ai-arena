import { supabase } from '@/integrations/supabase/client';
import { EventTeam, Match } from '@/types/tournament';

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
    const { data, error } = await supabase
      .from('matches')
      .insert(match)
      .select()
      .single();
    
    if (error) throw error;
    return data as Match;
  },

  async updateMatch(id: string, updates: Partial<Match>): Promise<void> {
    const { error } = await supabase
      .from('matches')
      .update(updates)
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

  // Tournament Generation
  async generateTournament(eventId: string, teamIds: string[]): Promise<void> {
    if (teamIds.length !== 24) {
      throw new Error('Se requieren exactamente 24 equipos para el torneo');
    }

    // Shuffle teams for random draw
    const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);
    
    // Assign teams to groups (A, B, C, D, E, F)
    const groups = ['A', 'B', 'C', 'D', 'E', 'F'];
    const eventTeams: any[] = [];
    
    shuffledTeams.forEach((teamId, index) => {
      const groupIndex = Math.floor(index / 4);
      eventTeams.push({
        event_id: eventId,
        team_id: teamId,
        group_name: groups[groupIndex],
      });
    });

    // Insert event teams with groups
    const { error: teamsError } = await supabase
      .from('event_teams')
      .upsert(eventTeams, { onConflict: 'event_id,team_id' });
    
    if (teamsError) throw teamsError;

    // Generate group stage matches
    const matches: any[] = [];
    let matchNumber = 1;

    groups.forEach((group, groupIndex) => {
      const groupTeams = shuffledTeams.slice(groupIndex * 4, (groupIndex + 1) * 4);
      
      // Each team plays against the other 3 in the group
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          matches.push({
            event_id: eventId,
            home_team_id: groupTeams[i],
            away_team_id: groupTeams[j],
            phase: 'group',
            group_name: group,
            match_number: matchNumber++,
            status: 'scheduled',
          });
        }
      }
    });

    // Insert matches
    const { error: matchesError } = await supabase
      .from('matches')
      .insert(matches);
    
    if (matchesError) throw matchesError;
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

  // Sort teams with tie-breaking criteria
  async sortTeamsByStandings(eventId: string, teams: EventTeam[]): Promise<EventTeam[]> {
    const sorted = [...teams].sort((a, b) => {
      // 1. Points
      if (b.points !== a.points) return b.points - a.points;
      
      // 2. Goal difference
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
      
      // 3. Goals for
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
      
      // 4. Goals against (fewer is better)
      if (a.goals_against !== b.goals_against) return a.goals_against - b.goals_against;
      
      // 5. Red cards (fewer is better)
      if (a.red_cards !== b.red_cards) return a.red_cards - b.red_cards;
      
      // 6. Yellow cards (fewer is better)
      if (a.yellow_cards !== b.yellow_cards) return a.yellow_cards - b.yellow_cards;
      
      return 0;
    });

    // For 2-team ties, check head-to-head
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].points === sorted[i + 1].points &&
          sorted[i].goal_difference === sorted[i + 1].goal_difference) {
        const h2h = await this.getHeadToHeadResult(eventId, sorted[i].team_id, sorted[i + 1].team_id);
        if (h2h === -1) {
          // Swap teams
          [sorted[i], sorted[i + 1]] = [sorted[i + 1], sorted[i]];
        }
      }
    }

    return sorted;
  },

  // Generate knockout phase (Round of 16)
  async generateKnockoutPhase(eventId: string): Promise<void> {
    const groups = ['A', 'B', 'C', 'D', 'E', 'F'];
    const qualifiedTeams: { teamId: string; group: string; position: number }[] = [];

    // Get top 2 from each group
    for (const group of groups) {
      const { data: groupTeams } = await supabase
        .from('event_teams')
        .select('*')
        .eq('event_id', eventId)
        .eq('group_name', group);

      if (!groupTeams || groupTeams.length === 0) continue;

      const sorted = await this.sortTeamsByStandings(eventId, groupTeams as EventTeam[]);
      qualifiedTeams.push({ teamId: sorted[0].team_id, group, position: 1 });
      qualifiedTeams.push({ teamId: sorted[1].team_id, group, position: 2 });
    }

    if (qualifiedTeams.length !== 12) {
      throw new Error('No se encontraron 12 equipos clasificados');
    }

    // Create Round of 16 matchups (1st of group vs 2nd of another group)
    const matches: any[] = [
      { home: qualifiedTeams[0].teamId, away: qualifiedTeams[7].teamId },  // 1A vs 2D
      { home: qualifiedTeams[6].teamId, away: qualifiedTeams[1].teamId },  // 1D vs 2A
      { home: qualifiedTeams[2].teamId, away: qualifiedTeams[9].teamId },  // 1B vs 2E
      { home: qualifiedTeams[8].teamId, away: qualifiedTeams[3].teamId },  // 1E vs 2B
      { home: qualifiedTeams[4].teamId, away: qualifiedTeams[11].teamId }, // 1C vs 2F
      { home: qualifiedTeams[10].teamId, away: qualifiedTeams[5].teamId }, // 1F vs 2C
    ];

    const matchRecords = matches.map((match, index) => ({
      event_id: eventId,
      home_team_id: match.home,
      away_team_id: match.away,
      phase: 'round_of_16',
      match_number: index + 1,
      status: 'scheduled',
    }));

    const { error } = await supabase
      .from('matches')
      .insert(matchRecords);

    if (error) throw error;
  },
};
