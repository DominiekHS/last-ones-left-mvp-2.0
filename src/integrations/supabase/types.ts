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
      deal_events: {
        Row: {
          created_at: string
          deal_id: string
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          address: string
          cancellation_policy: string | null
          category: Database["public"]["Enums"]["venue_category"]
          checkout_link: string
          city: string
          created_at: string
          description: string
          discount_code: string
          discount_percentage: number
          discount_type: string
          expiry_time: string
          id: string
          image_url: string | null
          merchant_id: string
          original_price: number
          redemption_instructions: string | null
          redemption_method: string
          start_time: string
          terms_summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          address?: string
          cancellation_policy?: string | null
          category?: Database["public"]["Enums"]["venue_category"]
          checkout_link?: string
          city?: string
          created_at?: string
          description?: string
          discount_code?: string
          discount_percentage: number
          discount_type?: string
          expiry_time: string
          id?: string
          image_url?: string | null
          merchant_id: string
          original_price: number
          redemption_instructions?: string | null
          redemption_method?: string
          start_time: string
          terms_summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          address?: string
          cancellation_policy?: string | null
          category?: Database["public"]["Enums"]["venue_category"]
          checkout_link?: string
          city?: string
          created_at?: string
          description?: string
          discount_code?: string
          discount_percentage?: number
          discount_type?: string
          expiry_time?: string
          id?: string
          image_url?: string | null
          merchant_id?: string
          original_price?: number
          redemption_instructions?: string | null
          redemption_method?: string
          start_time?: string
          terms_summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string
          blocked: boolean
          city: string
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string
          id: string
          logo_url: string | null
          opening_hours: Json | null
          postcode: string | null
          updated_at: string
          user_id: string
          venue_type: Database["public"]["Enums"]["venue_category"]
          website_url: string | null
        }
        Insert: {
          address?: string
          blocked?: boolean
          city?: string
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string
          id?: string
          logo_url?: string | null
          opening_hours?: Json | null
          postcode?: string | null
          updated_at?: string
          user_id: string
          venue_type?: Database["public"]["Enums"]["venue_category"]
          website_url?: string | null
        }
        Update: {
          address?: string
          blocked?: boolean
          city?: string
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string
          id?: string
          logo_url?: string | null
          opening_hours?: Json | null
          postcode?: string | null
          updated_at?: string
          user_id?: string
          venue_type?: Database["public"]["Enums"]["venue_category"]
          website_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      unique_codes: {
        Row: {
          assigned_at: string | null
          assigned_to_user_id: string | null
          code: string
          created_at: string
          deal_id: string
          id: string
          status: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to_user_id?: string | null
          code: string
          created_at?: string
          deal_id: string
          id?: string
          status?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to_user_id?: string | null
          code?: string
          created_at?: string
          deal_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "unique_codes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          claimed_at: string
          deal_id: string
          discount_code: string
          id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          deal_id: string
          discount_code: string
          id?: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          deal_id?: string
          discount_code?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
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
      is_deal_owner: {
        Args: { _deal_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "consumer" | "merchant" | "admin"
      venue_category:
        | "bioscoop"
        | "theater"
        | "sport"
        | "museum"
        | "bowling"
        | "paintball"
        | "stadion"
        | "concert"
        | "overig"
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
      app_role: ["consumer", "merchant", "admin"],
      venue_category: [
        "bioscoop",
        "theater",
        "sport",
        "museum",
        "bowling",
        "paintball",
        "stadion",
        "concert",
        "overig",
      ],
    },
  },
} as const
