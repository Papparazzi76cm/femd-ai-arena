import { supabase } from '@/integrations/supabase/client';
export interface TournamentBrand {
  id: string; slug: string; name: string; logo_url: string; keywords: string[]; is_public: boolean; display_order: number;
}
export function brandForEvent(event: { title: string; brand_id?: string | null }, brands: TournamentBrand[]) {
  if (event.brand_id) return brands.find(b => b.id === event.brand_id) ?? null;
  return brands.find(b => b.keywords.some(k => event.title.toLowerCase().includes(k.toLowerCase()))) ?? null;
}
export const tournamentBrandService = {
  async getAll(publicOnly = false): Promise<TournamentBrand[]> {
    let query = supabase.from('tournament_brands').select('*').order('display_order').order('name');
    if (publicOnly) query = query.eq('is_public', true);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },
  async save(brand: Omit<TournamentBrand, 'id'>, id?: string) {
    const query = id ? supabase.from('tournament_brands').update(brand).eq('id', id) : supabase.from('tournament_brands').insert(brand);
    const { error } = await query;
    if (error) throw error;
  },
};