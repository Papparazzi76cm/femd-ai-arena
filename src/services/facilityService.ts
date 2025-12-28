import { supabase } from '@/integrations/supabase/client';
import { Facility, Field, FieldSurface, EventFacility } from '@/types/database';

export const facilityService = {
  // Instalaciones
  async getAll(): Promise<Facility[]> {
    const { data, error } = await supabase
      .from('facilities')
      .select(`
        *,
        fields(*)
      `)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as Facility[];
  },

  async getById(id: string): Promise<Facility | null> {
    const { data, error } = await supabase
      .from('facilities')
      .select(`
        *,
        fields(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Facility;
  },

  async create(facility: Omit<Facility, 'id' | 'created_at' | 'fields'>): Promise<Facility> {
    const { data, error } = await supabase
      .from('facilities')
      .insert(facility)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Facility;
  },

  async update(id: string, updates: Partial<Omit<Facility, 'id' | 'created_at' | 'fields'>>): Promise<void> {
    const { error } = await supabase
      .from('facilities')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('facilities')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Campos
  async getFields(facilityId: string): Promise<Field[]> {
    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .eq('facility_id', facilityId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as Field[];
  },

  async createField(field: Omit<Field, 'id' | 'created_at' | 'facility'>): Promise<Field> {
    const { data, error } = await supabase
      .from('fields')
      .insert(field)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Field;
  },

  async updateField(id: string, updates: Partial<{ name: string; surface: FieldSurface; display_order: number }>): Promise<void> {
    const { error } = await supabase
      .from('fields')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteField(id: string): Promise<void> {
    const { error } = await supabase
      .from('fields')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Instalaciones por evento
  async getEventFacilities(eventId: string): Promise<EventFacility[]> {
    const { data, error } = await supabase
      .from('event_facilities')
      .select(`
        *,
        facility:facilities(
          *,
          fields(*)
        )
      `)
      .eq('event_id', eventId);

    if (error) throw error;
    return (data || []) as unknown as EventFacility[];
  },

  async addFacilityToEvent(eventId: string, facilityId: string): Promise<EventFacility> {
    const { data, error } = await supabase
      .from('event_facilities')
      .insert({
        event_id: eventId,
        facility_id: facilityId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as EventFacility;
  },

  async removeFacilityFromEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('event_facilities')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
