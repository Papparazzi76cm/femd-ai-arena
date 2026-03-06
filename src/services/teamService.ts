import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/types/database';

export const teamService = {
  // Get only parent clubs (no child/filial teams)
  async getClubs(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .is('parent_team_id', null)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getAll(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  // Get child teams of a parent club
  async getChildTeams(parentId: string): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('parent_team_id', parentId)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Team | null> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async create(team: Omit<Team, 'id' | 'created_at'>): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .insert(team)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, team: Partial<Team>): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .update(team)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
