// Core application types matching Supabase Schema V15 + AXON v3.2 Extensions
import type { Database } from '@/integrations/supabase/types';

// --- 1. ENUMS & CORE ---
export type UiMode = Database['public']['Enums']['ui_mode_type'];
export type UserTier = Database['public']['Enums']['user_tier'];

// --- 2. TABLAS BASE ---
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Invitation = Database['public']['Tables']['invitations']['Row'];
export type PioneerCode = Database['public']['Tables']['pioneer_codes']['Row'];
export type Household = Database['public']['Tables']['households']['Row'];

export type HouseholdMember = Omit<Database['public']['Tables']['household_members']['Row'], 'role'> & {
  // IMPORTANTE (Auth): en DB es TEXT; tipar como union
  role: 'owner' | 'admin' | 'member';
};

export type HouseholdUpload = Database['public']['Tables']['household_uploads']['Row'];

// --- 3. INVENTARIO Y COMPRA ---
export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'] & {
  // IMPORTANTE (Precios): numeric -> number. En UI lo tratamos como opcional.
  price?: number;
  
  // --- PROPIEDADES AUXILIARES PARA LA VISTA AGRUPADA (FRONTEND) ---
  // Estas no existen en la base de datos, las calculamos al vuelo en el modal
  total_quantity?: number; 
  earliest_expiry?: string | null;
  batch_count?: number; // Cuántos lotes (filas) componen este producto
};

export type ShoppingListItem = Database['public']['Tables']['shopping_list']['Row'] & {
  // IMPORTANTE (Precios): numeric -> number. En UI lo tratamos como opcional.
  estimated_price?: number;
};

// --- 4. [CRÍTICO] NEVERA FUSIONADA (LO VIEJO + LO NUEVO) ---
export type FridgeItem = Database['public']['Tables']['fridge_items']['Row'] & {
  // --- TUS PROPIEDADES ORIGINALES (Lógica de Inventario) ---
  status: 'stocked' | 'low' | 'panic';
  category: string;
  quantity?: number;
  name?: string;
  expiry_date: string | null;

  // --- LAS NUEVAS PROPIEDADES V3.2 (Visualización) ---
  layer?: 'global' | 'personal';
  rotation?: number;
  is_locked?: boolean;
  content?: string | null; 
};

// --- 5. FASE 2: SOCIAL SPACES (PERSIANA) ---
export interface SocialSpace {
  id: string;
  owner_id: string | null;
  group_id: string | null;
  type: 'shutter_metal' | 'wall_brick' | 'wall_concrete';
  is_public: boolean;
  created_at: string;
}

export interface GraffitiLayer {
  id: string;
  space_id: string;
  creator_id: string;
  vector_path: any; // JSONB
  color: string;
  opacity: number;
  created_at: string;
}

// --- 6. FASE 2: P2P MEDIA ---
export interface MediaTransfer {
  id: string;
  sender_id: string;
  receiver_id: string;
  preview_url: string;
  full_res_hash: string | null;
  status: 'available' | 'requested' | 'transferred' | 'expired';
  expires_at: string;
}

// --- 7. INSERTS ---
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type FridgeItemInsert = Database['public']['Tables']['fridge_items']['Insert'];
export type InvitationInsert = Database['public']['Tables']['invitations']['Insert'];