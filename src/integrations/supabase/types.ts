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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      media_titles: {
        Row: {
          cast_members: string[]
          complexity_level: number | null
          content_warnings: string[]
          created_at: string
          description: string | null
          directors: string[]
          emotional_depth_level: number | null
          external_id: string | null
          external_source: string | null
          genres: string[]
          gore_level: number | null
          gruesome_visuals_level: number | null
          horror_level: number | null
          id: string
          mystery_level: number | null
          pacing: string | null
          poster_url: string | null
          rating: number | null
          release_year: number | null
          smart_level: number | null
          sub_genres: string[]
          suspense_level: number | null
          themes: string[]
          title: string
          tone: string | null
          twisted_plot_level: number | null
          type: string
          updated_at: string
          violence_level: number | null
          world_building_level: number | null
        }
        Insert: {
          cast_members?: string[]
          complexity_level?: number | null
          content_warnings?: string[]
          created_at?: string
          description?: string | null
          directors?: string[]
          emotional_depth_level?: number | null
          external_id?: string | null
          external_source?: string | null
          genres?: string[]
          gore_level?: number | null
          gruesome_visuals_level?: number | null
          horror_level?: number | null
          id?: string
          mystery_level?: number | null
          pacing?: string | null
          poster_url?: string | null
          rating?: number | null
          release_year?: number | null
          smart_level?: number | null
          sub_genres?: string[]
          suspense_level?: number | null
          themes?: string[]
          title: string
          tone?: string | null
          twisted_plot_level?: number | null
          type: string
          updated_at?: string
          violence_level?: number | null
          world_building_level?: number | null
        }
        Update: {
          cast_members?: string[]
          complexity_level?: number | null
          content_warnings?: string[]
          created_at?: string
          description?: string | null
          directors?: string[]
          emotional_depth_level?: number | null
          external_id?: string | null
          external_source?: string | null
          genres?: string[]
          gore_level?: number | null
          gruesome_visuals_level?: number | null
          horror_level?: number | null
          id?: string
          mystery_level?: number | null
          pacing?: string | null
          poster_url?: string | null
          rating?: number | null
          release_year?: number | null
          smart_level?: number | null
          sub_genres?: string[]
          suspense_level?: number | null
          themes?: string[]
          title?: string
          tone?: string | null
          twisted_plot_level?: number | null
          type?: string
          updated_at?: string
          violence_level?: number | null
          world_building_level?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      recommendation_events: {
        Row: {
          created_at: string
          event_type: string
          event_value: Json | null
          id: string
          media_title_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          event_value?: Json | null
          id?: string
          media_title_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          event_value?: Json | null
          id?: string
          media_title_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_events_media_title_id_fkey"
            columns: ["media_title_id"]
            isOneToOne: false
            referencedRelation: "media_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      streaming_availability: {
        Row: {
          availability_type: string
          created_at: string
          id: string
          last_checked_at: string
          media_title_id: string
          provider_logo_url: string | null
          provider_name: string
          region: string
          updated_at: string
          watch_url: string | null
        }
        Insert: {
          availability_type?: string
          created_at?: string
          id?: string
          last_checked_at?: string
          media_title_id: string
          provider_logo_url?: string | null
          provider_name: string
          region?: string
          updated_at?: string
          watch_url?: string | null
        }
        Update: {
          availability_type?: string
          created_at?: string
          id?: string
          last_checked_at?: string
          media_title_id?: string
          provider_logo_url?: string | null
          provider_name?: string
          region?: string
          updated_at?: string
          watch_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "streaming_availability_media_title_id_fkey"
            columns: ["media_title_id"]
            isOneToOne: false
            referencedRelation: "media_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          confidence_score: number
          data: Json
          id: string
          profile_summary: string | null
          ratings_count: number
          recommendation_readiness_score: number
          recommendation_ready: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number
          data?: Json
          id?: string
          profile_summary?: string | null
          ratings_count?: number
          recommendation_readiness_score?: number
          recommendation_ready?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number
          data?: Json
          id?: string
          profile_summary?: string | null
          ratings_count?: number
          recommendation_readiness_score?: number
          recommendation_ready?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ratings: {
        Row: {
          created_at: string
          id: string
          media_title_id: string
          rated_at: string
          rating_confidence: number
          rating_context: Json | null
          rating_value: string
          source_mode: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_title_id: string
          rated_at?: string
          rating_confidence?: number
          rating_context?: Json | null
          rating_value: string
          source_mode?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_title_id?: string
          rated_at?: string
          rating_confidence?: number
          rating_context?: Json | null
          rating_value?: string
          source_mode?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ratings_media_title_id_fkey"
            columns: ["media_title_id"]
            isOneToOne: false
            referencedRelation: "media_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          hide_excessive_slaughter: boolean
          hide_gore: boolean
          hide_graphic_violence: boolean
          hide_gruesome_visuals: boolean
          hide_horror: boolean
          hide_pointless_suspense: boolean
          id: string
          include_older_classics: boolean
          learning_threshold: number
          minimum_rating: number
          prefer_complex_plots: boolean
          prefer_newer_releases: boolean
          prefer_twisted_plots: boolean
          preferred_languages: string[]
          preferred_streaming_providers: string[]
          preferred_type: string
          region: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hide_excessive_slaughter?: boolean
          hide_gore?: boolean
          hide_graphic_violence?: boolean
          hide_gruesome_visuals?: boolean
          hide_horror?: boolean
          hide_pointless_suspense?: boolean
          id?: string
          include_older_classics?: boolean
          learning_threshold?: number
          minimum_rating?: number
          prefer_complex_plots?: boolean
          prefer_newer_releases?: boolean
          prefer_twisted_plots?: boolean
          preferred_languages?: string[]
          preferred_streaming_providers?: string[]
          preferred_type?: string
          region?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hide_excessive_slaughter?: boolean
          hide_gore?: boolean
          hide_graphic_violence?: boolean
          hide_gruesome_visuals?: boolean
          hide_horror?: boolean
          hide_pointless_suspense?: boolean
          id?: string
          include_older_classics?: boolean
          learning_threshold?: number
          minimum_rating?: number
          prefer_complex_plots?: boolean
          prefer_newer_releases?: boolean
          prefer_twisted_plots?: boolean
          preferred_languages?: string[]
          preferred_streaming_providers?: string[]
          preferred_type?: string
          region?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          added_at: string
          id: string
          media_title_id: string
          removed_at: string | null
          status: string
          user_id: string
          watched_at: string | null
        }
        Insert: {
          added_at?: string
          id?: string
          media_title_id: string
          removed_at?: string | null
          status?: string
          user_id: string
          watched_at?: string | null
        }
        Update: {
          added_at?: string
          id?: string
          media_title_id?: string
          removed_at?: string | null
          status?: string
          user_id?: string
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_media_title_id_fkey"
            columns: ["media_title_id"]
            isOneToOne: false
            referencedRelation: "media_titles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_user_bootstrap: {
        Args: { target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
