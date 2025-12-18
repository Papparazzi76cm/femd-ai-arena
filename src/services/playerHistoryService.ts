import { supabase } from '@/integrations/supabase/client';

export interface PlayerTeamHistory {
  id: string;
  player_id: string;
  team_id: string;
  category: string | null;
  start_date: string;
  end_date: string | null;
  season: string | null;
  matches_played: number;
  goals_scored: number;
  yellow_cards: number;
  red_cards: number;
  notes: string | null;
  created_at: string;
}

export const playerHistoryService = {
  async getByPlayer(playerId: string): Promise<PlayerTeamHistory[]> {
    const { data, error } = await supabase
      .from('player_team_history')
      .select('*')
      .eq('player_id', playerId)
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(history: Omit<PlayerTeamHistory, 'id' | 'created_at'>): Promise<PlayerTeamHistory> {
    const { data, error } = await supabase
      .from('player_team_history')
      .insert(history)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, history: Partial<PlayerTeamHistory>): Promise<PlayerTeamHistory> {
    const { data, error } = await supabase
      .from('player_team_history')
      .update(history)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('player_team_history')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async closeCurrentTeam(playerId: string, teamId: string, endDate: string): Promise<void> {
    const { error } = await supabase
      .from('player_team_history')
      .update({ end_date: endDate })
      .eq('player_id', playerId)
      .eq('team_id', teamId)
      .is('end_date', null);
    
    if (error) throw error;
  }
};
