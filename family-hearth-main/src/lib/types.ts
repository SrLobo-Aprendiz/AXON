// Core application types matching Supabase Schema V15
import type { Database } from '@/integrations/supabase/types';

export type UiMode = Database['public']['Enums']['ui_mode_type'];
export type UserTier = Database['public']['Enums']['user_tier'];

// Database row types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Invitation = Database['public']['Tables']['invitations']['Row'];
export type PioneerCode = Database['public']['Tables']['pioneer_codes']['Row'];
export type Household = Database['public']['Tables']['households']['Row'];
export type HouseholdMember = Omit<
  Database['public']['Tables']['household_members']['Row'],
  'role'
> & {
  // IMPORTANTE (Auth): en DB es TEXT; tipar como union
  role: 'owner' | 'admin' | 'member';
};
export type HouseholdUpload = Database['public']['Tables']['household_uploads']['Row'];

export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'] & {
  // IMPORTANTE (Precios): numeric -> number. En UI lo tratamos como opcional.
  price?: number;
};

export type ShoppingListItem = Database['public']['Tables']['shopping_list']['Row'] & {
  // IMPORTANTE (Precios): numeric -> number. En UI lo tratamos como opcional.
  estimated_price?: number;
};

// FridgeItem type with required status, category, and expiry_date columns
export type FridgeItem = Database['public']['Tables']['fridge_items']['Row'] & {
  status: 'stocked' | 'low' | 'panic';
  category: string;
  quantity?: number;
  name?: string;
  expiry_date: string | null;
};

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type FridgeItemInsert = Database['public']['Tables']['fridge_items']['Insert'];
export type InvitationInsert = Database['public']['Tables']['invitations']['Insert'];
