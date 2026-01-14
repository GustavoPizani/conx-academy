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
      courses: {
        Row: {
          cover_image: string | null
          created_at: string
          description: string | null
          id: string
          published: boolean
          target_roles: Database["public"]["Enums"]["app_role"][]
          title: string
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          published?: boolean
          target_roles?: Database["public"]["Enums"]["app_role"][]
          title: string
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          published?: boolean
          target_roles?: Database["public"]["Enums"]["app_role"][]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          resource_id: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          resource_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          resource_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_views: {
        Row: {
          completed: boolean | null
          course_id: string
          ended_at: string | null
          id: string
          lesson_id: string
          session_id: string | null
          started_at: string
          user_id: string
          watch_time_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          course_id: string
          ended_at?: string | null
          id?: string
          lesson_id: string
          session_id?: string | null
          started_at?: string
          user_id: string
          watch_time_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          course_id?: string
          ended_at?: string | null
          id?: string
          lesson_id?: string
          session_id?: string | null
          started_at?: string
          user_id?: string
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_views_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_views_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_views_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string
          created_at: string
          duration: number
          id: string
          position: number
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          course_id: string
          created_at?: string
          duration?: number
          id?: string
          position?: number
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          course_id?: string
          created_at?: string
          duration?: number
          id?: string
          position?: number
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_first_login: boolean
          name: string
          points: number
          team_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          is_first_login?: boolean
          name: string
          points?: number
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_first_login?: boolean
          name?: string
          points?: number
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      progress: {
        Row: {
          id: string
          is_completed: boolean
          lesson_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          is_completed?: boolean
          lesson_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          is_completed?: boolean
          lesson_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_config: {
        Row: {
          book_access_points: number
          course_completion_points: number
          created_at: string
          id: string
          podcast_access_points: number
          rewatch_course_points: number
          updated_at: string
        }
        Insert: {
          book_access_points?: number
          course_completion_points?: number
          created_at?: string
          id?: string
          podcast_access_points?: number
          rewatch_course_points?: number
          updated_at?: string
        }
        Update: {
          book_access_points?: number
          course_completion_points?: number
          created_at?: string
          id?: string
          podcast_access_points?: number
          rewatch_course_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      resource_logs: {
        Row: {
          accessed_at: string
          id: string
          resource_id: string
          user_id: string
        }
        Insert: {
          accessed_at?: string
          id?: string
          resource_id: string
          user_id: string
        }
        Update: {
          accessed_at?: string
          id?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_logs_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          cover_image: string | null
          created_at: string
          id: string
          title: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at: string
          url: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          id?: string
          title: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          url: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      team_hierarchy: {
        Row: {
          created_at: string
          id: string
          subordinate_id: string
          supervisor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subordinate_id: string
          supervisor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subordinate_id?: string
          supervisor_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_team_id?: string | null
          updated_at?: string
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
      user_points_history: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points: number
          reference_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          device_info: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          ip_address: string | null
          last_activity_at: string
          started_at: string
          user_id: string
        }
        Insert: {
          device_info?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          last_activity_at?: string
          started_at?: string
          user_id: string
        }
        Update: {
          device_info?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          last_activity_at?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_entirely: {
        Args: { user_id_to_delete: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_user_points: {
        Args: { points_to_add: number; user_id_to_update: string }
        Returns: undefined
      }
      is_admin_or_coordinator: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "coordinator"
        | "superintendent"
        | "manager"
        | "student"
      resource_type: "book_pdf" | "podcast_audio"
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
      app_role: [
        "admin",
        "coordinator",
        "superintendent",
        "manager",
        "student",
      ],
      resource_type: ["book_pdf", "podcast_audio"],
    },
  },
} as const
