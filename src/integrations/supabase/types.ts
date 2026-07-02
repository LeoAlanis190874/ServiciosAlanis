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
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_translations: {
        Row: {
          category_id: string
          description: string | null
          id: string
          language_code: string
          name: string
        }
        Insert: {
          category_id: string
          description?: string | null
          id?: string
          language_code: string
          name: string
        }
        Update: {
          category_id?: string
          description?: string | null
          id?: string
          language_code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      cities: {
        Row: {
          country_id: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          state_id: string
          timezone: string | null
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          state_id: string
          timezone?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          state_id?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_message_at: string | null
          professional_id: string
          request_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          professional_id: string
          request_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          professional_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          created_at: string
          default_currency: string | null
          default_language: string | null
          default_timezone: string | null
          id: string
          is_active: boolean
          iso2: string
          iso3: string | null
          name: string
          phone_code: string | null
        }
        Insert: {
          created_at?: string
          default_currency?: string | null
          default_language?: string | null
          default_timezone?: string | null
          id?: string
          is_active?: boolean
          iso2: string
          iso3?: string | null
          name: string
          phone_code?: string | null
        }
        Update: {
          created_at?: string
          default_currency?: string | null
          default_language?: string | null
          default_timezone?: string | null
          id?: string
          is_active?: boolean
          iso2?: string
          iso3?: string | null
          name?: string
          phone_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "countries_default_currency_fkey"
            columns: ["default_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "countries_default_language_fkey"
            columns: ["default_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          decimal_digits: number
          is_active: boolean
          name: string
          symbol: string | null
        }
        Insert: {
          code: string
          created_at?: string
          decimal_digits?: number
          is_active?: boolean
          name: string
          symbol?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          decimal_digits?: number
          is_active?: boolean
          name?: string
          symbol?: string | null
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          as_of: string
          base_currency: string
          created_at: string
          id: string
          quote_currency: string
          rate: number
        }
        Insert: {
          as_of?: string
          base_currency: string
          created_at?: string
          id?: string
          quote_currency: string
          rate: number
        }
        Update: {
          as_of?: string
          base_currency?: string
          created_at?: string
          id?: string
          quote_currency?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_base_currency_fkey"
            columns: ["base_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_quote_currency_fkey"
            columns: ["quote_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          name: string
          native_name: string | null
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          name: string
          native_name?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          name?: string
          native_name?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachments?: Json
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      professional_categories: {
        Row: {
          category_id: string
          created_at: string
          currency_code: string | null
          hourly_rate: number | null
          professional_id: string
          years_experience: number | null
        }
        Insert: {
          category_id: string
          created_at?: string
          currency_code?: string | null
          hourly_rate?: number | null
          professional_id: string
          years_experience?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string
          currency_code?: string | null
          hourly_rate?: number | null
          professional_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_categories_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      professional_coverage: {
        Row: {
          city_id: string | null
          country_id: string | null
          created_at: string
          id: string
          professional_id: string
          service_radius_km: number | null
          state_id: string | null
        }
        Insert: {
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          professional_id: string
          service_radius_km?: number | null
          state_id?: string | null
        }
        Update: {
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          professional_id?: string
          service_radius_km?: number | null
          state_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_coverage_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_coverage_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_coverage_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_verifications: {
        Row: {
          created_at: string
          document_type: string | null
          document_url: string | null
          id: string
          notes: string | null
          professional_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          document_url?: string | null
          id?: string
          notes?: string | null
          professional_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type?: string | null
          document_url?: string | null
          id?: string
          notes?: string | null
          professional_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line: string | null
          avatar_url: string | null
          bio: string | null
          city_id: string | null
          country_id: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          phone: string | null
          postal_code: string | null
          preferred_currency: string | null
          preferred_language: string | null
          state_id: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          avatar_url?: string | null
          bio?: string | null
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          state_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          avatar_url?: string | null
          bio?: string | null
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          state_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_preferred_currency_fkey"
            columns: ["preferred_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_preferred_language_fkey"
            columns: ["preferred_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          amount: number
          created_at: string
          currency_code: string
          estimated_days: number | null
          id: string
          message: string | null
          professional_id: string
          request_id: string
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency_code: string
          estimated_days?: number | null
          id?: string
          message?: string | null
          professional_id: string
          request_id: string
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency_code?: string
          estimated_days?: number | null
          id?: string
          message?: string | null
          professional_id?: string
          request_id?: string
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_visible: boolean
          rating: number
          request_id: string
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean
          rating: number
          request_id: string
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean
          rating?: number
          request_id?: string
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          address_line: string | null
          assigned_professional_id: string | null
          assigned_quote_id: string | null
          attachments: Json
          budget_currency: string | null
          budget_max: number | null
          budget_min: number | null
          category_id: string
          city_id: string | null
          client_id: string
          country_id: string | null
          created_at: string
          description: string
          id: string
          latitude: number | null
          longitude: number | null
          preferred_date: string | null
          service_id: string | null
          state_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Insert: {
          address_line?: string | null
          assigned_professional_id?: string | null
          assigned_quote_id?: string | null
          attachments?: Json
          budget_currency?: string | null
          budget_max?: number | null
          budget_min?: number | null
          category_id: string
          city_id?: string | null
          client_id: string
          country_id?: string | null
          created_at?: string
          description: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          preferred_date?: string | null
          service_id?: string | null
          state_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Update: {
          address_line?: string | null
          assigned_professional_id?: string | null
          assigned_quote_id?: string | null
          attachments?: Json
          budget_currency?: string | null
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string
          city_id?: string | null
          client_id?: string
          country_id?: string | null
          created_at?: string
          description?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          preferred_date?: string | null
          service_id?: string | null
          state_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_requests_assigned_quote"
            columns: ["assigned_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_budget_currency_fkey"
            columns: ["budget_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "service_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      service_translations: {
        Row: {
          description: string | null
          id: string
          language_code: string
          name: string
          service_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          language_code: string
          name: string
          service_id: string
        }
        Update: {
          description?: string | null
          id?: string
          language_code?: string
          name?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "service_translations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_currency: string | null
          base_price_max: number | null
          base_price_min: number | null
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          base_currency?: string | null
          base_price_max?: number | null
          base_price_min?: number | null
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          base_currency?: string | null
          base_price_max?: number | null
          base_price_min?: number | null
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_base_currency_fkey"
            columns: ["base_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          code: string | null
          country_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code?: string | null
          country_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string | null
          country_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "states_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
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
      accept_quote: { Args: { _quote_id: string }; Returns: string }
      ensure_super_admin_role: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin_email: { Args: { _email: string }; Returns: boolean }
      transition_request_status: {
        Args: {
          _new_status: Database["public"]["Enums"]["request_status"]
          _request_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "cliente" | "profesional" | "admin"
      notification_channel: "in_app" | "email" | "sms" | "push"
      quote_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "withdrawn"
        | "expired"
      request_status:
        | "draft"
        | "open"
        | "quoted"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "disputed"
      urgency_level: "low" | "normal" | "high" | "urgent"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
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
      app_role: ["cliente", "profesional", "admin"],
      notification_channel: ["in_app", "email", "sms", "push"],
      quote_status: ["pending", "accepted", "rejected", "withdrawn", "expired"],
      request_status: [
        "draft",
        "open",
        "quoted",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
        "disputed",
      ],
      urgency_level: ["low", "normal", "high", "urgent"],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const
