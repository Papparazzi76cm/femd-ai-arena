import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types/database';

export const eventService = {
  async getAll(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getPublicAll(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_public', true)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPublicById(id: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('is_public', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(event: Omit<Event, 'id' | 'created_at'>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, event: Partial<Event>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .update(event)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
