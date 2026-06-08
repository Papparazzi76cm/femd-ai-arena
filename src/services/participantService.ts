import { supabase } from '@/integrations/supabase/client';
import { Participant } from '@/types/database';

export const participantService = {
  async getAll(): Promise<Participant[]> {
    const pageSize = 1000;
    let from = 0;
    const all: Participant[] = [];
    while (true) {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('name')
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return all;
  },

  async getByTeam(teamId: string): Promise<Participant[]> {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('team_id', teamId)
      .order('number');
    
    if (error) throw error;
    return data || [];
  },

  async create(participant: Omit<Participant, 'id' | 'created_at'>): Promise<Participant> {
    const { data, error } = await supabase
      .from('participants')
      .insert(participant)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, participant: Partial<Participant>): Promise<Participant> {
    const { data, error } = await supabase
      .from('participants')
      .update(participant)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
