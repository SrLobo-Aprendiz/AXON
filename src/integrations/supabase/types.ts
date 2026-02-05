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
      app_templates: {
        Row: {
          code_name: string
          content: string
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          code_name: string
          content: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          code_name?: string
          content?: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          media_url: string | null
          message_type: Database["public"]["Enums"]["message_type"]
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
          sender_id?: string
        }
        Relationships: []
      }
      fridge_items: {
        Row: {
          created_at: string | null
          created_by: string | null
          household_id: string
          id: string
          image_url: string
          position_x: number | null
          position_y: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          household_id: string
          id?: string
          image_url: string
          position_x?: number | null
          position_y?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          household_id?: string
          id?: string
          image_url?: string
          position_x?: number | null
          position_y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fridge_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fridge_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          id: string
          nickname: string | null
          role: string
          user_id: string
          created_at: string | null
        }
        Insert: {
          household_id: string
          id?: string
          nickname?: string | null
          role?: string
          user_id: string
          created_at?: string | null
        }
        Update: {
          household_id?: string
          id?: string
          nickname?: string | null
          role?: string
          user_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string | null
          id: string
          name: string
          storage_limit_mb: number | null
          storage_used_mb: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          storage_limit_mb?: number | null
          storage_used_mb?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          storage_limit_mb?: number | null
          storage_used_mb?: number | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          default_pack_size: number | null
          deleted_at: string | null
          expiry_date: string | null
          household_id: string
          id: string
          in_cart: boolean
          lifecycle_status: string | null
          min_quantity: number | null
          name: string
          personal_owner_id: string | null
          price: number | null
          quantity: number
          status: Database["public"]["Enums"]["item_status"]
          storage_zone_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          default_pack_size?: number | null
          deleted_at?: string | null
          expiry_date?: string | null
          household_id: string
          id?: string
          in_cart?: boolean
          lifecycle_status?: string | null
          min_quantity?: number | null
          name: string
          personal_owner_id?: string | null
          price?: number | null
          quantity?: number
          status?: Database["public"]["Enums"]["item_status"]
          storage_zone_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          default_pack_size?: number | null
          deleted_at?: string | null
          expiry_date?: string | null
          household_id?: string
          id?: string
          in_cart?: boolean
          lifecycle_status?: string | null
          min_quantity?: number | null
          name?: string
          personal_owner_id?: string | null
          price?: number | null
          quantity?: number
          status?: Database["public"]["Enums"]["item_status"]
          storage_zone_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_personal_owner_id_fkey"
            columns: ["personal_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string | null
          household_id: string | null
          id: string
          token: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at?: string | null
          household_id?: string | null
          id?: string
          token?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string | null
          household_id?: string | null
          id?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_uploads: {
        Row: {
          created_at: string | null
          file_path: string
          household_id: string
          id: string
          size_bytes: number
        }
        Insert: {
          created_at?: string | null
          file_path: string
          household_id: string
          id?: string
          size_bytes?: number
        }
        Update: {
          created_at?: string | null
          file_path?: string
          household_id?: string
          id?: string
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "household_uploads_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list: {
        Row: {
          added_by: string | null
          created_at: string | null
          estimated_price: number | null
          household_id: string
          id: string
          is_ghost: boolean | null
          item_name: string
          linked_item_id: string | null
          quantity: number
          status: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          estimated_price?: number | null
          household_id: string
          id?: string
          is_ghost?: boolean | null
          item_name: string
          linked_item_id?: string | null
          quantity?: number
          status?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          estimated_price?: number | null
          household_id?: string
          id?: string
          is_ghost?: boolean | null
          item_name?: string
          linked_item_id?: string | null
          quantity?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_zones: {
        Row: {
          created_at: string | null
          household_id: string
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string | null
          household_id: string
          id?: string
          name: string
          type?: string
        }
        Update: {
          created_at?: string | null
          household_id?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_zones_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pioneer_codes: {
        Row: {
          code: string
          is_used: boolean | null
          tier: Database["public"]["Enums"]["user_tier"] | null
        }
        Insert: {
          code: string
          is_used?: boolean | null
          tier?: Database["public"]["Enums"]["user_tier"] | null
        }
        Update: {
          code?: string
          is_used?: boolean | null
          tier?: Database["public"]["Enums"]["user_tier"] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          current_household_id: string | null
          email: string | null
          household_ids: string[] | null
          full_name: string | null
          id: string
          is_superadmin: boolean
          ui_mode: Database["public"]["Enums"]["ui_mode_type"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          current_household_id?: string | null
          email?: string | null
          household_ids?: string[] | null
          full_name?: string | null
          id: string
          is_superadmin?: boolean
          ui_mode?: Database["public"]["Enums"]["ui_mode_type"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          current_household_id?: string | null
          email?: string | null
          household_ids?: string[] | null
          full_name?: string | null
          id?: string
          is_superadmin?: boolean
          ui_mode?: Database["public"]["Enums"]["ui_mode_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      prompt_options: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          prompt_fragment: string
          sort_order: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          prompt_fragment: string
          sort_order?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          prompt_fragment?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      safety_logs: {
        Row: {
          action_type: string
          child_id: string
          created_at: string
          id: string
          parent_id: string
          payload: Json
        }
        Insert: {
          action_type: string
          child_id: string
          created_at?: string
          id?: string
          parent_id: string
          payload?: Json
        }
        Update: {
          action_type?: string
          child_id?: string
          created_at?: string
          id?: string
          parent_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "safety_logs_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_logs_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inventory_summary: {
        Row: {
          household_id: string | null
          low_items: number | null
          panic_items: number | null
          stocked_items: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_item_smart: {
        Args: {
          p_category: string
          p_expiry_date?: string
          p_name: string
          p_quantity: number
          p_unit?: string
        }
        Returns: Json
      }
      claim_pioneer_code: { Args: { input_code: string }; Returns: boolean }
      get_dashboard_metrics:
        | { Args: never; Returns: Json }
        | { Args: { p_household_id: string }; Returns: Json }
      get_user_household_id: { Args: never; Returns: string }
      is_superadmin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "member"
      inventory_status: "in_stock" | "low" | "out_of_stock"
      item_status: "panic" | "low" | "stocked" | "postponed"
      message_type: "text" | "image" | "system_alert"
      ui_mode_type: "standard" | "stealth" | "simple"
      user_role: "owner" | "admin" | "member" | "kid"
      user_tier: "alpha" | "beta" | "standard"
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
      app_role: ["admin", "member"],
      inventory_status: ["in_stock", "low", "out_of_stock"],
      item_status: ["panic", "low", "stocked", "postponed"],
      message_type: ["text", "image", "system_alert"],
      ui_mode_type: ["standard", "stealth", "simple"],
      user_role: ["owner", "admin", "member", "kid"],
      user_tier: ["alpha", "beta", "standard"],
    },
  },
} as const
