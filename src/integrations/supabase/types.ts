export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          age_group: string | null
          created_at: string | null
          display_order: number | null
          id: string
          name: string
        }
        Insert: {
          age_group?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          name: string
        }
        Update: {
          age_group?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      club_tournament_history: {
        Row: {
          category_id: string | null
          created_at: string | null
          draws: number | null
          event_id: string
          goals_against: number | null
          goals_for: number | null
          id: string
          losses: number | null
          phase_reached: string | null
          position: number | null
          team_id: string
          total_matches: number | null
          wins: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          draws?: number | null
          event_id: string
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          losses?: number | null
          phase_reached?: string | null
          position?: number | null
          team_id: string
          total_matches?: number | null
          wins?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          draws?: number | null
          event_id?: string
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          losses?: number | null
          phase_reached?: string | null
          position?: number | null
          team_id?: string
          total_matches?: number | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "club_tournament_history_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_tournament_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_tournament_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_categories: {
        Row: {
          category_id: string
          created_at: string | null
          event_id: string
          id: string
          match_duration_minutes: number
          modality: Database["public"]["Enums"]["football_modality"]
        }
        Insert: {
          category_id: string
          created_at?: string | null
          event_id: string
          id?: string
          match_duration_minutes?: number
          modality?: Database["public"]["Enums"]["football_modality"]
        }
        Update: {
          category_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          match_duration_minutes?: number
          modality?: Database["public"]["Enums"]["football_modality"]
        }
        Relationships: [
          {
            foreignKeyName: "event_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_categories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_category_phases: {
        Row: {
          created_at: string | null
          event_category_id: string
          id: string
          num_groups: number | null
          phase_type: string
          qualification_rules: string | null
          teams_per_group: number | null
          tiebreaker_rules: string | null
        }
        Insert: {
          created_at?: string | null
          event_category_id: string
          id?: string
          num_groups?: number | null
          phase_type: string
          qualification_rules?: string | null
          teams_per_group?: number | null
          tiebreaker_rules?: string | null
        }
        Update: {
          created_at?: string | null
          event_category_id?: string
          id?: string
          num_groups?: number | null
          phase_type?: string
          qualification_rules?: string | null
          teams_per_group?: number | null
          tiebreaker_rules?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_category_phases_event_category_id_fkey"
            columns: ["event_category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      event_facilities: {
        Row: {
          created_at: string | null
          event_id: string
          facility_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          facility_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          facility_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_facilities_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_facilities_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      event_images: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string
          display_order: number | null
          event_id: string
          id: string
          image_url: string
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string
          display_order?: number | null
          event_id: string
          id?: string
          image_url: string
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string
          display_order?: number | null
          event_id?: string
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_images_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_teams: {
        Row: {
          category_id: string | null
          created_at: string | null
          draws: number | null
          event_id: string
          goal_difference: number | null
          goals_against: number | null
          goals_for: number | null
          group_name: string | null
          id: string
          losses: number | null
          matches_played: number | null
          points: number | null
          red_cards: number | null
          team_id: string
          team_letter: string | null
          wins: number | null
          yellow_cards: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          draws?: number | null
          event_id: string
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          group_name?: string | null
          id?: string
          losses?: number | null
          matches_played?: number | null
          points?: number | null
          red_cards?: number | null
          team_id: string
          team_letter?: string | null
          wins?: number | null
          yellow_cards?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          draws?: number | null
          event_id?: string
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          group_name?: string | null
          id?: string
          losses?: number | null
          matches_played?: number | null
          points?: number | null
          red_cards?: number | null
          team_id?: string
          team_letter?: string | null
          wins?: number | null
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          id: string
          location: string | null
          poster_url: string | null
          team_ids: string[] | null
          title: string
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          location?: string | null
          poster_url?: string | null
          team_ids?: string[] | null
          title: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          location?: string | null
          poster_url?: string | null
          team_ids?: string[] | null
          title?: string
        }
        Relationships: []
      }
      facilities: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          google_maps_url: string | null
          id: string
          name: string
          province: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          google_maps_url?: string | null
          id?: string
          name: string
          province?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          google_maps_url?: string | null
          id?: string
          name?: string
          province?: string | null
        }
        Relationships: []
      }
      fields: {
        Row: {
          created_at: string | null
          display_order: number | null
          facility_id: string
          id: string
          name: string
          surface: Database["public"]["Enums"]["field_surface"]
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          facility_id: string
          id?: string
          name?: string
          surface?: Database["public"]["Enums"]["field_surface"]
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          facility_id?: string
          id?: string
          name?: string
          surface?: Database["public"]["Enums"]["field_surface"]
        }
        Relationships: [
          {
            foreignKeyName: "fields_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      match_goals: {
        Row: {
          created_at: string
          id: string
          is_own_goal: boolean | null
          match_id: string
          minute: number | null
          player_id: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_own_goal?: boolean | null
          match_id: string
          minute?: number | null
          player_id?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_own_goal?: boolean | null
          match_id?: string
          minute?: number | null
          player_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_goals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_goals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_placeholder: string | null
          away_red_cards: number | null
          away_score: number | null
          away_team_id: string | null
          away_yellow_cards: number | null
          category_id: string | null
          created_at: string | null
          event_id: string
          field_id: string | null
          group_name: string | null
          home_placeholder: string | null
          home_red_cards: number | null
          home_score: number | null
          home_team_id: string | null
          home_yellow_cards: number | null
          id: string
          match_date: string | null
          match_duration_minutes: number
          match_halves: number
          match_number: number | null
          phase: string
          referee_user_id: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          away_placeholder?: string | null
          away_red_cards?: number | null
          away_score?: number | null
          away_team_id?: string | null
          away_yellow_cards?: number | null
          category_id?: string | null
          created_at?: string | null
          event_id: string
          field_id?: string | null
          group_name?: string | null
          home_placeholder?: string | null
          home_red_cards?: number | null
          home_score?: number | null
          home_team_id?: string | null
          home_yellow_cards?: number | null
          id?: string
          match_date?: string | null
          match_duration_minutes?: number
          match_halves?: number
          match_number?: number | null
          phase: string
          referee_user_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          away_placeholder?: string | null
          away_red_cards?: number | null
          away_score?: number | null
          away_team_id?: string | null
          away_yellow_cards?: number | null
          category_id?: string | null
          created_at?: string | null
          event_id?: string
          field_id?: string | null
          group_name?: string | null
          home_placeholder?: string | null
          home_red_cards?: number | null
          home_score?: number | null
          home_team_id?: string | null
          home_yellow_cards?: number | null
          id?: string
          match_date?: string | null
          match_duration_minutes?: number
          match_halves?: number
          match_number?: number | null
          phase?: string
          referee_user_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      mesa_assignments: {
        Row: {
          accepted_at: string | null
          assigned_at: string | null
          created_at: string | null
          id: string
          match_id: string
          mesa_name: string
          phone: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          match_id: string
          mesa_name: string
          phone: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          match_id?: string
          mesa_name?: string
          phone?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "mesa_assignments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          age: number | null
          birth_date: string | null
          created_at: string | null
          dni: string | null
          goals_scored: number | null
          id: string
          matches_played: number | null
          name: string
          number: number | null
          photo_url: string | null
          position: string | null
          red_cards: number | null
          team_id: string | null
          yellow_cards: number | null
        }
        Insert: {
          age?: number | null
          birth_date?: string | null
          created_at?: string | null
          dni?: string | null
          goals_scored?: number | null
          id?: string
          matches_played?: number | null
          name: string
          number?: number | null
          photo_url?: string | null
          position?: string | null
          red_cards?: number | null
          team_id?: string | null
          yellow_cards?: number | null
        }
        Update: {
          age?: number | null
          birth_date?: string | null
          created_at?: string | null
          dni?: string | null
          goals_scored?: number | null
          id?: string
          matches_played?: number | null
          name?: string
          number?: number | null
          photo_url?: string | null
          position?: string | null
          red_cards?: number | null
          team_id?: string | null
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_team_history: {
        Row: {
          category: string | null
          created_at: string
          end_date: string | null
          goals_scored: number | null
          id: string
          matches_played: number | null
          notes: string | null
          player_id: string
          red_cards: number | null
          season: string | null
          start_date: string
          team_id: string
          yellow_cards: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          end_date?: string | null
          goals_scored?: number | null
          id?: string
          matches_played?: number | null
          notes?: string | null
          player_id: string
          red_cards?: number | null
          season?: string | null
          start_date?: string
          team_id: string
          yellow_cards?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          end_date?: string | null
          goals_scored?: number | null
          id?: string
          matches_played?: number | null
          notes?: string | null
          player_id?: string
          red_cards?: number | null
          season?: string | null
          start_date?: string
          team_id?: string
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_team_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_team_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          tier: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          tier?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          tier?: string | null
          website?: string | null
        }
        Relationships: []
      }
      team_rosters: {
        Row: {
          created_at: string | null
          event_team_id: string
          id: string
          is_captain: boolean | null
          jersey_number: number | null
          participant_id: string
          roster_role: string
          staff_position: string | null
        }
        Insert: {
          created_at?: string | null
          event_team_id: string
          id?: string
          is_captain?: boolean | null
          jersey_number?: number | null
          participant_id: string
          roster_role?: string
          staff_position?: string | null
        }
        Update: {
          created_at?: string | null
          event_team_id?: string
          id?: string
          is_captain?: boolean | null
          jersey_number?: number | null
          participant_id?: string
          roster_role?: string
          staff_position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_rosters_event_team_id_fkey"
            columns: ["event_team_id"]
            isOneToOne: false
            referencedRelation: "event_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_rosters_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          autonomous_community: string | null
          city: string | null
          colors: string | null
          country: string | null
          created_at: string | null
          description: string | null
          founded_year: number | null
          id: string
          logo_url: string | null
          name: string
          parent_team_id: string | null
          province: string | null
        }
        Insert: {
          autonomous_community?: string | null
          city?: string | null
          colors?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name: string
          parent_team_id?: string | null
          province?: string | null
        }
        Update: {
          autonomous_community?: string | null
          city?: string | null
          colors?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          parent_team_id?: string | null
          province?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_parent_team_id_fkey"
            columns: ["parent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_match_schedule_conflict: {
        Args: {
          p_duration_minutes: number
          p_event_id: string
          p_exclude_match_id?: string
          p_field_id: string
          p_match_date: string
        }
        Returns: {
          away_team_id: string
          conflicting_match_id: string
          home_team_id: string
          scheduled_date: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "mesa"
      field_surface: "cesped_artificial" | "cesped_natural"
      football_modality: "futbol_7" | "futbol_11"
      tournament_phase:
        | "group"
        | "round_of_16"
        | "quarter_final"
        | "semi_final"
        | "third_place"
        | "final"
        | "gold_round_of_16"
        | "gold_quarter_final"
        | "gold_semi_final"
        | "gold_third_place"
        | "gold_final"
        | "silver_round_of_16"
        | "silver_quarter_final"
        | "silver_semi_final"
        | "silver_third_place"
        | "silver_final"
        | "bronze_round_of_16"
        | "bronze_quarter_final"
        | "bronze_semi_final"
        | "bronze_third_place"
        | "bronze_final"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "mesa"],
      field_surface: ["cesped_artificial", "cesped_natural"],
      football_modality: ["futbol_7", "futbol_11"],
      tournament_phase: [
        "group",
        "round_of_16",
        "quarter_final",
        "semi_final",
        "third_place",
        "final",
        "gold_round_of_16",
        "gold_quarter_final",
        "gold_semi_final",
        "gold_third_place",
        "gold_final",
        "silver_round_of_16",
        "silver_quarter_final",
        "silver_semi_final",
        "silver_third_place",
        "silver_final",
        "bronze_round_of_16",
        "bronze_quarter_final",
        "bronze_semi_final",
        "bronze_third_place",
        "bronze_final",
      ],
    },
  },
} as const
