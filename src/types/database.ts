export interface Team {
  id: string;
  name: string;
  logo_url?: string;
  description?: string;
  founded_year?: number;
  colors?: string;
  parent_team_id?: string;
  created_at: string;
}

export interface Participant {
  id: string;
  team_id?: string;
  name: string;
  position?: string;
  number?: number;
  photo_url?: string;
  birth_date?: string;
  age?: number;
  matches_played?: number;
  goals_scored?: number;
  yellow_cards?: number;
  red_cards?: number;
  dni?: string;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  team_ids?: string[];
  poster_url?: string;
  created_at: string;
}

export interface Post {
  id: string;
  title: string;
  description?: string;
  content?: string;
  image_url?: string;
  author_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Sponsor {
  id: string;
  name: string;
  logo_url?: string;
  website?: string;
  tier?: string;
  created_at: string;
}

// Nuevas interfaces para la reestructuración

export interface Category {
  id: string;
  name: string;
  age_group?: string;
  display_order: number;
  created_at: string;
}

export type FootballModality = 'futbol_7' | 'futbol_11';

export interface EventCategory {
  id: string;
  event_id: string;
  category_id: string;
  modality: FootballModality;
  match_duration_minutes: number;
  created_at: string;
  // Relaciones
  category?: Category;
}

export type FieldSurface = 'cesped_artificial' | 'cesped_natural';

export interface Facility {
  id: string;
  name: string;
  province?: string;
  city?: string;
  address?: string;
  google_maps_url?: string;
  created_at: string;
  // Relaciones
  fields?: Field[];
}

export interface Field {
  id: string;
  facility_id: string;
  name: string;
  surface: FieldSurface;
  display_order: number;
  created_at: string;
  // Relaciones
  facility?: Facility;
}

export interface EventFacility {
  id: string;
  event_id: string;
  facility_id: string;
  created_at: string;
  // Relaciones
  facility?: Facility;
}

export interface EventCategoryPhase {
  id: string;
  event_category_id: string;
  phase_type: string; // 'group', 'gold', 'silver', 'bronze'
  num_groups: number;
  teams_per_group: number;
  tiebreaker_rules?: string;
  qualification_rules?: string;
  created_at: string;
}

export interface TeamRoster {
  id: string;
  event_team_id: string;
  participant_id: string;
  jersey_number?: number;
  is_captain: boolean;
  created_at: string;
  // Relaciones
  participant?: Participant;
}

export interface ClubTournamentHistory {
  id: string;
  team_id: string;
  event_id: string;
  category_id?: string;
  position?: number;
  phase_reached?: string;
  total_matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  created_at: string;
  // Relaciones
  team?: Team;
  event?: Event;
  category?: Category;
}
