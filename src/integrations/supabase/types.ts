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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      event_teams: {
        Row: {
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
          wins: number | null
          yellow_cards: number | null
        }
        Insert: {
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
          wins?: number | null
          yellow_cards?: number | null
        }
        Update: {
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
          wins?: number | null
          yellow_cards?: number | null
        }
        Relationships: [
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
          away_red_cards: number | null
          away_score: number | null
          away_team_id: string
          away_yellow_cards: number | null
          created_at: string | null
          event_id: string
          group_name: string | null
          home_red_cards: number | null
          home_score: number | null
          home_team_id: string
          home_yellow_cards: number | null
          id: string
          match_date: string | null
          match_number: number | null
          phase: string
          referee_user_id: string | null
          status: string | null
        }
        Insert: {
          away_red_cards?: number | null
          away_score?: number | null
          away_team_id: string
          away_yellow_cards?: number | null
          created_at?: string | null
          event_id: string
          group_name?: string | null
          home_red_cards?: number | null
          home_score?: number | null
          home_team_id: string
          home_yellow_cards?: number | null
          id?: string
          match_date?: string | null
          match_number?: number | null
          phase: string
          referee_user_id?: string | null
          status?: string | null
        }
        Update: {
          away_red_cards?: number | null
          away_score?: number | null
          away_team_id?: string
          away_yellow_cards?: number | null
          created_at?: string | null
          event_id?: string
          group_name?: string | null
          home_red_cards?: number | null
          home_score?: number | null
          home_team_id?: string
          home_yellow_cards?: number | null
          id?: string
          match_date?: string | null
          match_number?: number | null
          phase?: string
          referee_user_id?: string | null
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
            foreignKeyName: "matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      participants: {
        Row: {
          age: number | null
          birth_date: string | null
          created_at: string | null
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
      teams: {
        Row: {
          colors: string | null
          created_at: string | null
          description: string | null
          founded_year: number | null
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          colors?: string | null
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          colors?: string | null
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
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
    },
  },
} as const
