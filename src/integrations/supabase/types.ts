export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      absence_requests: {
        Row: {
          analyst_id: string
          approved: boolean
          approved_by: string | null
          cancel_reason: string | null
          canceled_at: string | null
          created_at: string
          dismissed_by_analyst: boolean
          end_date: string
          id: string
          lead_comment: string | null
          reason: string
          start_date: string
          status: Database["public"]["Enums"]["absence_status"]
          updated_at: string
        }
        Insert: {
          analyst_id: string
          approved?: boolean
          approved_by?: string | null
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string
          dismissed_by_analyst?: boolean
          end_date: string
          id?: string
          lead_comment?: string | null
          reason: string
          start_date: string
          status?: Database["public"]["Enums"]["absence_status"]
          updated_at?: string
        }
        Update: {
          analyst_id?: string
          approved?: boolean
          approved_by?: string | null
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string
          dismissed_by_analyst?: boolean
          end_date?: string
          id?: string
          lead_comment?: string | null
          reason?: string
          start_date?: string
          status?: Database["public"]["Enums"]["absence_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_requests_analyst_id_fkey"
            columns: ["analyst_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "absence_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          break1_end: string | null
          break1_start: string | null
          break2_end: string | null
          break2_start: string | null
          created_at: string
          end_time: string
          id: string
          language: string
          lunch_end: string | null
          lunch_start: string | null
          name: string
          project_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          start_time: string
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_id: string
          work_days: Json
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          break1_end?: string | null
          break1_start?: string | null
          break2_end?: string | null
          break2_start?: string | null
          created_at?: string
          end_time?: string
          id?: string
          language?: string
          lunch_end?: string | null
          lunch_start?: string | null
          name: string
          project_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          start_time?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id: string
          work_days?: Json
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          break1_end?: string | null
          break1_start?: string | null
          break2_end?: string | null
          break2_start?: string | null
          created_at?: string
          end_time?: string
          id?: string
          language?: string
          lunch_end?: string | null
          lunch_start?: string | null
          name?: string
          project_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          start_time?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id?: string
          work_days?: Json
        }
        Relationships: [
          {
            foreignKeyName: "profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_leads: {
        Row: {
          created_at: string
          lead_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          lead_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          lead_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_by: string
          assigned_to: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: number | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string | null
          created_at: string
          email: string
          last_sign_in_at: string | null
          name: string
          project_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          user_id: string
        }[]
      }
      dismiss_absence_request: {
        Args: { _id: string }
        Returns: undefined
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_active_user: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      absence_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancel_requested"
        | "cancelled"
        | "cancel_pending"
        | "canceled"
      app_role: "admin" | "lead" | "analyst"
      task_status: "pending" | "in_progress" | "completed"
      user_status: "pending" | "active" | "inactive"
      work_mode: "office" | "home"
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
      absence_status: [
        "pending",
        "approved",
        "rejected",
        "cancel_requested",
        "cancelled",
        "cancel_pending",
        "canceled",
      ],
      app_role: ["admin", "lead", "analyst"],
      task_status: ["pending", "in_progress", "completed"],
      user_status: ["pending", "active", "inactive"],
      work_mode: ["office", "home"],
    },
  },
} as const
