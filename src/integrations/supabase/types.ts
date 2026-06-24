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
      ad_banners: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string
          id: string
          image_url: string | null
          link_url: string | null
          starts_at: string
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          starts_at?: string
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      app_version: {
        Row: {
          created_at: string
          id: string
          is_latest: boolean
          notes: string | null
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_latest?: boolean
          notes?: string | null
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          is_latest?: boolean
          notes?: string | null
          version?: string
        }
        Relationships: []
      }
      backup_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          file_path: string | null
          id: string
          kind: string
          row_counts: Json | null
          size_bytes: number | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          file_path?: string | null
          id?: string
          kind?: string
          row_counts?: Json | null
          size_bytes?: number | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          file_path?: string | null
          id?: string
          kind?: string
          row_counts?: Json | null
          size_bytes?: number | null
          status?: string
        }
        Relationships: []
      }
      company_info: {
        Row: {
          address: string
          app_name: string
          biz_no: string
          ceo: string
          email: string
          id: boolean
          mail_order_no: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string
          app_name?: string
          biz_no?: string
          ceo?: string
          email?: string
          id?: boolean
          mail_order_no?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Update: {
          address?: string
          app_name?: string
          biz_no?: string
          ceo?: string
          email?: string
          id?: boolean
          mail_order_no?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_orders: {
        Row: {
          amount_krw: number
          approved_at: string | null
          created_at: string
          employer_id: string
          id: string
          method: string | null
          pack: number
          payment_key: string | null
          raw: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_krw: number
          approved_at?: string | null
          created_at?: string
          employer_id: string
          id: string
          method?: string | null
          pack: number
          payment_key?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_krw?: number
          approved_at?: string | null
          created_at?: string
          employer_id?: string
          id?: string
          method?: string | null
          pack?: number
          payment_key?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_purchase_requests: {
        Row: {
          amount_krw: number
          created_at: string
          employer_id: string
          id: string
          pack: number
          payment_method: string | null
          payment_ref: string | null
          status: string
        }
        Insert: {
          amount_krw: number
          created_at?: string
          employer_id: string
          id?: string
          pack: number
          payment_method?: string | null
          payment_ref?: string | null
          status?: string
        }
        Update: {
          amount_krw?: number
          created_at?: string
          employer_id?: string
          id?: string
          pack?: number
          payment_method?: string | null
          payment_ref?: string | null
          status?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          created_at: string
          delta: number
          employer_id: string
          id: string
          note: string | null
          type: Database["public"]["Enums"]["credit_tx_type"]
        }
        Insert: {
          created_at?: string
          delta: number
          employer_id: string
          id?: string
          note?: string | null
          type: Database["public"]["Enums"]["credit_tx_type"]
        }
        Update: {
          created_at?: string
          delta?: number
          employer_id?: string
          id?: string
          note?: string | null
          type?: Database["public"]["Enums"]["credit_tx_type"]
        }
        Relationships: []
      }
      cron_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      custom_industries: {
        Row: {
          created_at: string
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      custom_job_roles: {
        Row: {
          created_at: string
          industry_key: string
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          industry_key: string
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          industry_key?: string
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      employer_profiles: {
        Row: {
          company_name: string
          contact_phone: string
          created_at: string
          credits: number
          location: string
          manager_name: string
          notify_marketing: boolean
          notify_push: boolean
          referrer_code: string | null
          user_id: string
        }
        Insert: {
          company_name: string
          contact_phone: string
          created_at?: string
          credits?: number
          location: string
          manager_name: string
          notify_marketing?: boolean
          notify_push?: boolean
          referrer_code?: string | null
          user_id: string
        }
        Update: {
          company_name?: string
          contact_phone?: string
          created_at?: string
          credits?: number
          location?: string
          manager_name?: string
          notify_marketing?: boolean
          notify_push?: boolean
          referrer_code?: string | null
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          ends_at: string
          id: string
          image_url: string | null
          link_url: string | null
          starts_at: string
          title: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          ends_at: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          starts_at?: string
          title: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          active: boolean
          answer: string
          category: string | null
          created_at: string
          id: string
          question: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          question: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          question?: string
          sort_order?: number
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          answer: string | null
          answered_at: string | null
          body: string
          created_at: string
          id: string
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          body: string
          created_at?: string
          id?: string
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          body?: string
          created_at?: string
          id?: string
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          approved_at: string | null
          confirmed_at: string | null
          created_at: string
          employer_id: string
          id: string
          job_id: string
          message: string | null
          no_show_at: string | null
          seeker_id: string
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          approved_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          employer_id: string
          id?: string
          job_id: string
          message?: string | null
          no_show_at?: string | null
          seeker_id: string
          status?: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          approved_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          employer_id?: string
          id?: string
          job_id?: string
          message?: string | null
          no_show_at?: string | null
          seeker_id?: string
          status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_contacts: {
        Row: {
          contact_phone: string
          created_at: string
          employer_id: string
          job_id: string
          updated_at: string
        }
        Insert: {
          contact_phone: string
          created_at?: string
          employer_id: string
          job_id: string
          updated_at?: string
        }
        Update: {
          contact_phone?: string
          created_at?: string
          employer_id?: string
          job_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          contract_months: number | null
          contract_type: string
          created_at: string
          daily_wage: number | null
          edit_count: number
          employer_id: string
          headcount: number
          id: string
          industry: string
          is_active: boolean
          job_role: string
          location: string
          monthly_wage: number | null
          pay_day: string
          photo_url: string | null
          place_name: string
          preparations: string | null
          region: string | null
          rooms_per_day: number | null
          title: string
          updated_at: string
          work_dates: string[]
        }
        Insert: {
          contract_months?: number | null
          contract_type?: string
          created_at?: string
          daily_wage?: number | null
          edit_count?: number
          employer_id: string
          headcount?: number
          id?: string
          industry: string
          is_active?: boolean
          job_role: string
          location: string
          monthly_wage?: number | null
          pay_day: string
          photo_url?: string | null
          place_name: string
          preparations?: string | null
          region?: string | null
          rooms_per_day?: number | null
          title: string
          updated_at?: string
          work_dates?: string[]
        }
        Update: {
          contract_months?: number | null
          contract_type?: string
          created_at?: string
          daily_wage?: number | null
          edit_count?: number
          employer_id?: string
          headcount?: number
          id?: string
          industry?: string
          is_active?: boolean
          job_role?: string
          location?: string
          monthly_wage?: number | null
          pay_day?: string
          photo_url?: string | null
          place_name?: string
          preparations?: string | null
          region?: string | null
          rooms_per_day?: number | null
          title?: string
          updated_at?: string
          work_dates?: string[]
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string
          kind: string
          updated_at: string
        }
        Insert: {
          content?: string
          kind: string
          updated_at?: string
        }
        Update: {
          content?: string
          kind?: string
          updated_at?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          active: boolean
          body: string
          created_at: string
          id: string
          pinned: boolean
          title: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          id?: string
          pinned?: boolean
          title: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link_url: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link_url?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link_url?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_programs: {
        Row: {
          active: boolean
          auto_recharge_amount: number
          auto_recharge_threshold: number
          created_at: string
          employer_id: string
          id: string
          last_monthly_grant_at: string | null
          monthly_credits: number
          note: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          auto_recharge_amount?: number
          auto_recharge_threshold?: number
          created_at?: string
          employer_id: string
          id?: string
          last_monthly_grant_at?: string | null
          monthly_credits?: number
          note?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          auto_recharge_amount?: number
          auto_recharge_threshold?: number
          created_at?: string
          employer_id?: string
          id?: string
          last_monthly_grant_at?: string | null
          monthly_credits?: number
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promoted_jobs: {
        Row: {
          created_at: string
          credits_spent: number
          duration: Database["public"]["Enums"]["promotion_duration"]
          employer_id: string
          ends_at: string
          id: string
          job_id: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          credits_spent: number
          duration: Database["public"]["Enums"]["promotion_duration"]
          employer_id: string
          ends_at: string
          id?: string
          job_id: string
          starts_at?: string
        }
        Update: {
          created_at?: string
          credits_spent?: number
          duration?: Database["public"]["Enums"]["promotion_duration"]
          employer_id?: string
          ends_at?: string
          id?: string
          job_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promoted_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      push_dispatch_config: {
        Row: {
          endpoint_url: string
          id: boolean
          updated_at: string
          webhook_secret: string
        }
        Insert: {
          endpoint_url: string
          id?: boolean
          updated_at?: string
          webhook_secret: string
        }
        Update: {
          endpoint_url?: string
          id?: boolean
          updated_at?: string
          webhook_secret?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referrers: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          note: string | null
          phone: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          note?: string | null
          phone?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      seeker_favorites: {
        Row: {
          created_at: string
          employer_id: string
          id: string
          place_name: string
          seeker_id: string
        }
        Insert: {
          created_at?: string
          employer_id: string
          id?: string
          place_name: string
          seeker_id: string
        }
        Update: {
          created_at?: string
          employer_id?: string
          id?: string
          place_name?: string
          seeker_id?: string
        }
        Relationships: []
      }
      seeker_profiles: {
        Row: {
          created_at: string
          experience: Database["public"]["Enums"]["experience_level"]
          korean_ok: boolean
          nationality: Database["public"]["Enums"]["nationality"]
          notify_marketing: boolean
          notify_push: boolean
          preferred_language: string
          preferred_region: string | null
          referrer_code: string | null
          user_id: string
          visa: Database["public"]["Enums"]["visa_status"] | null
        }
        Insert: {
          created_at?: string
          experience: Database["public"]["Enums"]["experience_level"]
          korean_ok?: boolean
          nationality: Database["public"]["Enums"]["nationality"]
          notify_marketing?: boolean
          notify_push?: boolean
          preferred_language?: string
          preferred_region?: string | null
          referrer_code?: string | null
          user_id: string
          visa?: Database["public"]["Enums"]["visa_status"] | null
        }
        Update: {
          created_at?: string
          experience?: Database["public"]["Enums"]["experience_level"]
          korean_ok?: boolean
          nationality?: Database["public"]["Enums"]["nationality"]
          notify_marketing?: boolean
          notify_push?: boolean
          preferred_language?: string
          preferred_region?: string | null
          referrer_code?: string | null
          user_id?: string
          visa?: Database["public"]["Enums"]["visa_status"] | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      admin_grant_credits: {
        Args: { _amount: number; _employer: string; _note: string }
        Returns: Json
      }
      approve_application: { Args: { _app_id: string }; Returns: Json }
      get_active_promoted_jobs: {
        Args: never
        Returns: {
          created_at: string
          ends_at: string
          job_id: string
          starts_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_no_show: { Args: { _app_id: string }; Returns: Json }
      promote_job: {
        Args: {
          _duration: Database["public"]["Enums"]["promotion_duration"]
          _job_id: string
        }
        Returns: Json
      }
      run_partner_monthly_grants: { Args: never; Returns: Json }
      seeker_confirm_application: { Args: { _app_id: string }; Returns: Json }
      seeker_reapply_application: {
        Args: { _app_id: string; _message: string }
        Returns: Json
      }
      unmark_no_show: { Args: { _app_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "seeker" | "employer" | "admin" | "manager"
      application_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "confirmed"
        | "no_show"
      credit_tx_type:
        | "purchase"
        | "approval_use"
        | "promotion_use"
        | "admin_grant"
        | "signup_bonus"
        | "partner_monthly"
        | "partner_recharge"
      experience_level: "lt5" | "gte5"
      industry:
        | "hotel"
        | "motel"
        | "resort"
        | "restaurant"
        | "hospital"
        | "nursing"
      job_role: "room_cleaning" | "dish_cleaning" | "hall_serving" | "care"
      nationality: "foreigner" | "korean"
      promotion_duration: "d2" | "d5" | "d10"
      visa_status: "student" | "jobseeker" | "resident" | "other"
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
      app_role: ["seeker", "employer", "admin", "manager"],
      application_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "confirmed",
        "no_show",
      ],
      credit_tx_type: [
        "purchase",
        "approval_use",
        "promotion_use",
        "admin_grant",
        "signup_bonus",
        "partner_monthly",
        "partner_recharge",
      ],
      experience_level: ["lt5", "gte5"],
      industry: [
        "hotel",
        "motel",
        "resort",
        "restaurant",
        "hospital",
        "nursing",
      ],
      job_role: ["room_cleaning", "dish_cleaning", "hall_serving", "care"],
      nationality: ["foreigner", "korean"],
      promotion_duration: ["d2", "d5", "d10"],
      visa_status: ["student", "jobseeker", "resident", "other"],
    },
  },
} as const
