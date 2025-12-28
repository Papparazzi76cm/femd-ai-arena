export interface EventTeam {
  id: string;
  event_id: string;
  team_id: string;
  group_name?: string;
  category_id?: string;
  team_letter?: string; // A, B, C, D... para equipos duplicados del mismo club
  points: number;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  yellow_cards: number;
  red_cards: number;
  created_at: string;
}

export type TournamentPhase = 
  | 'group'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'third_place'
  | 'final'
  | 'gold_round_of_16'
  | 'gold_quarter_final'
  | 'gold_semi_final'
  | 'gold_third_place'
  | 'gold_final'
  | 'silver_round_of_16'
  | 'silver_quarter_final'
  | 'silver_semi_final'
  | 'silver_third_place'
  | 'silver_final'
  | 'bronze_round_of_16'
  | 'bronze_quarter_final'
  | 'bronze_semi_final'
  | 'bronze_third_place'
  | 'bronze_final';

export interface Match {
  id: string;
  event_id: string;
  home_team_id: string;
  away_team_id: string;
  phase: TournamentPhase;
  group_name?: string;
  category_id?: string;
  field_id?: string;
  match_number?: number;
  home_score?: number;
  away_score?: number;
  home_yellow_cards: number;
  home_red_cards: number;
  away_yellow_cards: number;
  away_red_cards: number;
  match_date?: string;
  status: 'scheduled' | 'in_progress' | 'finished';
  referee_user_id?: string;
  created_at: string;
}

export interface MatchScheduleConflict {
  conflicting_match_id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_date: string;
}
