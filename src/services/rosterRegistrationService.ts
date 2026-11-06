import { supabase } from '@/integrations/supabase/client';
import { registrationPayload, RegistrationMember } from './rosterRegistrationValidation';

export interface RegistrationResult { registered: number; created: number; linked: number }
export interface ParticipantMatch {
  participant_id: string;
  participant_name: string;
  last_event_title: string | null;
  last_team_name: string | null;
  last_team_logo_url: string | null;
}
export interface RegistrationContext {
  team_name: string; event_title: string; category_name: string | null; expires_at: string; submitted: boolean;
  occupied_numbers: number[]; result: RegistrationResult | null;
}
export const rosterRegistrationService = {
  async create(eventTeamId: string) {
    const { data, error } = await supabase.rpc('create_roster_registration_link', { p_event_team_id: eventTeamId });
    if (error) throw error;
    return data as unknown as { id: string; token: string; expires_at: string };
  },
  async revoke(eventTeamId: string) {
    const { error } = await supabase.rpc('revoke_roster_registration_link', { p_event_team_id: eventTeamId });
    if (error) throw error;
  },
  async context(token: string): Promise<RegistrationContext> {
    const { data, error } = await supabase.rpc('get_roster_registration_context', { p_token: token });
    if (error) throw error;
    return data as unknown as RegistrationContext;
  },
  async findParticipantMatches(token: string, firstName: string, lastName: string): Promise<ParticipantMatch[]> {
    const { data, error } = await supabase.rpc('find_roster_participant_matches', {
      p_token: token,
      p_first_name: firstName,
      p_last_name: lastName,
    });
    if (error) throw error;
    return (data || []) as ParticipantMatch[];
  },
  async submit(token: string, members: RegistrationMember[]): Promise<RegistrationResult> {
    const { data, error } = await supabase.rpc('submit_roster_registration', { p_token: token, p_members: registrationPayload(members) });
    if (error) throw error;
    return data as unknown as RegistrationResult;
  },
};
