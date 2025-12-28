import { supabase } from '@/integrations/supabase/client';
import { ClubTournamentHistory } from '@/types/database';

export const clubHistoryService = {
  // Obtener histórico de un club
  async getClubHistory(teamId: string): Promise<ClubTournamentHistory[]> {
    const { data, error } = await supabase
      .from('club_tournament_history')
      .select(`
        *,
        event:events(*),
        category:categories(*)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as ClubTournamentHistory[];
  },

  // Obtener histórico de un torneo
  async getTournamentHistory(eventId: string): Promise<ClubTournamentHistory[]> {
    const { data, error } = await supabase
      .from('club_tournament_history')
      .select(`
        *,
        team:teams(*),
        category:categories(*)
      `)
      .eq('event_id', eventId)
      .order('position', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as ClubTournamentHistory[];
  },

  // Crear o actualizar registro de histórico
  async upsertHistory(history: Omit<ClubTournamentHistory, 'id' | 'created_at' | 'team' | 'event' | 'category'>): Promise<ClubTournamentHistory> {
    const { data, error } = await supabase
      .from('club_tournament_history')
      .upsert(history, {
        onConflict: 'team_id,event_id,category_id',
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ClubTournamentHistory;
  },

  // Eliminar registro de histórico
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('club_tournament_history')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Obtener estadísticas totales de un club
  async getClubStats(teamId: string): Promise<{
    totalTournaments: number;
    championships: number;
    runnerUps: number;
    totalMatches: number;
    totalWins: number;
    totalDraws: number;
    totalLosses: number;
    totalGoalsFor: number;
    totalGoalsAgainst: number;
  }> {
    const history = await this.getClubHistory(teamId);

    return {
      totalTournaments: history.length,
      championships: history.filter(h => h.position === 1).length,
      runnerUps: history.filter(h => h.position === 2).length,
      totalMatches: history.reduce((sum, h) => sum + h.total_matches, 0),
      totalWins: history.reduce((sum, h) => sum + h.wins, 0),
      totalDraws: history.reduce((sum, h) => sum + h.draws, 0),
      totalLosses: history.reduce((sum, h) => sum + h.losses, 0),
      totalGoalsFor: history.reduce((sum, h) => sum + h.goals_for, 0),
      totalGoalsAgainst: history.reduce((sum, h) => sum + h.goals_against, 0),
    };
  },
};
