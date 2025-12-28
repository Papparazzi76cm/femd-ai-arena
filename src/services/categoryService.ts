import { supabase } from '@/integrations/supabase/client';
import { Category, EventCategory, FootballModality } from '@/types/database';

export const categoryService = {
  // Categorías base
  async getAll(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(category: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Category>): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Categorías por evento
  async getEventCategories(eventId: string): Promise<EventCategory[]> {
    const { data, error } = await supabase
      .from('event_categories')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('event_id', eventId);

    if (error) throw error;
    return (data || []) as unknown as EventCategory[];
  },

  async addCategoryToEvent(
    eventId: string,
    categoryId: string,
    modality: FootballModality = 'futbol_7',
    matchDurationMinutes: number = 40
  ): Promise<EventCategory> {
    const { data, error } = await supabase
      .from('event_categories')
      .insert({
        event_id: eventId,
        category_id: categoryId,
        modality,
        match_duration_minutes: matchDurationMinutes,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as EventCategory;
  },

  async updateEventCategory(
    id: string,
    updates: Partial<{ modality: FootballModality; match_duration_minutes: number }>
  ): Promise<void> {
    const { error } = await supabase
      .from('event_categories')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async removeCategoryFromEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('event_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
