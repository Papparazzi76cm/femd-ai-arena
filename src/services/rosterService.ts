import { supabase } from '@/integrations/supabase/client';
import { TeamRoster, Participant } from '@/types/database';

export const rosterService = {
  // Obtener plantilla de un equipo en un evento
  async getTeamRoster(eventTeamId: string): Promise<TeamRoster[]> {
    const { data, error } = await supabase
      .from('team_rosters')
      .select(`
        *,
        participant:participants(*)
      `)
      .eq('event_team_id', eventTeamId)
      .order('jersey_number', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as TeamRoster[];
  },

  // Añadir jugador a la plantilla
  async addPlayerToRoster(
    eventTeamId: string,
    participantId: string,
    jerseyNumber?: number,
    isCaptain: boolean = false
  ): Promise<TeamRoster> {
    const { data, error } = await supabase
      .from('team_rosters')
      .insert({
        event_team_id: eventTeamId,
        participant_id: participantId,
        jersey_number: jerseyNumber,
        is_captain: isCaptain,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as TeamRoster;
  },

  // Actualizar datos del jugador en la plantilla
  async updateRosterEntry(
    id: string,
    updates: Partial<{ jersey_number: number; is_captain: boolean }>
  ): Promise<void> {
    const { error } = await supabase
      .from('team_rosters')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  // Eliminar jugador de la plantilla
  async removePlayerFromRoster(id: string): Promise<void> {
    const { error } = await supabase
      .from('team_rosters')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Buscar jugador por DNI
  async findPlayerByDNI(dni: string): Promise<Participant | null> {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('dni', dni)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw error;
    }
    return data as unknown as Participant;
  },

  // Crear jugador si no existe por DNI
  async findOrCreatePlayer(playerData: {
    dni: string;
    name: string;
    birth_date?: string;
    position?: string;
    photo_url?: string;
  }): Promise<Participant> {
    // Primero buscar por DNI
    const existing = await this.findPlayerByDNI(playerData.dni);
    if (existing) return existing;

    // Si no existe, crear nuevo
    const { data, error } = await supabase
      .from('participants')
      .insert(playerData)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Participant;
  },

  // Importar plantilla desde CSV
  async importRosterFromCSV(
    eventTeamId: string,
    players: Array<{
      dni: string;
      name: string;
      birth_date?: string;
      position?: string;
      jersey_number?: number;
    }>
  ): Promise<{ imported: number; errors: number }> {
    let imported = 0;
    let errors = 0;

    for (const player of players) {
      try {
        // Buscar o crear jugador
        const participant = await this.findOrCreatePlayer({
          dni: player.dni,
          name: player.name,
          birth_date: player.birth_date,
          position: player.position,
        });

        // Añadir a la plantilla
        await this.addPlayerToRoster(
          eventTeamId,
          participant.id,
          player.jersey_number
        );

        imported++;
      } catch (error) {
        console.error('Error importando jugador:', player, error);
        errors++;
      }
    }

    return { imported, errors };
  },
};
