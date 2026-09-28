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
      course_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      material_views: {
        Row: {
          completed: boolean
          first_opened_at: string
          last_opened_at: string
          material_id: string
          user_id: string
          watched_percent: number
        }
        Insert: {
          completed?: boolean
          first_opened_at?: string
          last_opened_at?: string
          material_id: string
          user_id: string
          watched_percent?: number
        }
        Update: {
          completed?: boolean
          first_opened_at?: string
          last_opened_at?: string
          material_id?: string
          user_id?: string
          watched_percent?: number
        }
        Relationships: []
      }
      module_progress: {
        Row: {
          module_id: string
          passed_at: string
          user_id: string
        }
        Insert: {
          module_id: string
          passed_at?: string
          user_id: string
        }
        Update: {
          module_id?: string
          passed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          recipient_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          recipient_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          recipient_id?: string
          type?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          module_id: string
          pass_score: number
          passed: boolean
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          module_id: string
          pass_score: number
          passed: boolean
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          module_id?: string
          pass_score?: number
          passed?: boolean
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      course_projects: {
        Row: {
          course_id: string
          project_id: string
        }
        Insert: {
          course_id: string
          project_id: string
        }
        Update: {
          course_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_projects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          created_by: string | null
          description: Json
          id: string
          published: boolean
          title: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: Json
          id?: string
          published?: boolean
          title?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: Json
          id?: string
          published?: boolean
          title?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      material_versions: {
        Row: {
          created_at: string
          file_name: string | null
          id: string
          language: string
          material_id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          id?: string
          language: string
          material_id: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          id?: string
          language?: string
          material_id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_versions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "module_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      module_materials: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["material_kind"]
          module_id: string
          position: number
          title: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["material_kind"]
          module_id: string
          position?: number
          title?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["material_kind"]
          module_id?: string
          position?: number
          title?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_materials_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: Json
          id: string
          position: number
          title: Json
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: Json
          id?: string
          position?: number
          title?: Json
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: Json
          id?: string
          position?: number
          title?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
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
      quiz_options: {
        Row: {
          id: string
          is_correct: boolean
          label: Json
          position: number
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          label?: Json
          position?: number
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          label?: Json
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          id: string
          module_id: string
          position: number
          prompt: Json
          type: Database["public"]["Enums"]["question_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          position?: number
          prompt?: Json
          type: Database["public"]["Enums"]["question_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          position?: number
          prompt?: Json
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["module_id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          module_id: string
          pass_score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          module_id: string
          pass_score?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          module_id?: string
          pass_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
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
      admin_reorder: {
        Args: { _kind: string; _ids: string[] }
        Returns: undefined
      }
      admin_save_question: {
        Args: {
          _module_id: string
          _question_id: string | null
          _type: Database["public"]["Enums"]["question_type"]
          _prompt: Json
          _options: Json
        }
        Returns: string
      }
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
      learning_progress_report: {
        Args: Record<PropertyKey, never>
        Returns: {
          analyst_id: string
          analyst_name: string
          attempts_by_module: Json
          completed_at: string | null
          course_id: string
          course_title: Json
          current_module: number | null
          passed_modules: number
          project_id: string
          project_name: string
          started_at: string | null
          total_attempts: number
          total_modules: number
        }[]
      }
      mark_notifications_read: {
        Args: { _ids?: string[] | null }
        Returns: undefined
      }
      learning_get_quiz: {
        Args: { _module_id: string }
        Returns: Json
      }
      learning_record_view: {
        Args: { _material_id: string; _watched_percent?: number | null }
        Returns: boolean
      }
      learning_submit_quiz: {
        Args: { _module_id: string; _answers: Json }
        Returns: Json
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
      material_kind: "file" | "video" | "link"
      question_type: "single" | "multiple" | "true_false"
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
      material_kind: ["file", "video", "link"],
      question_type: ["single", "multiple", "true_false"],
      task_status: ["pending", "in_progress", "completed"],
      user_status: ["pending", "active", "inactive"],
      work_mode: ["office", "home"],
    },
  },
} as const
