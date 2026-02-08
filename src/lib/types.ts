import type { Database } from '@/integrations/supabase/types';

// --- 1. CORE TYPES ---
export type UiMode = Database['public']['Enums']['ui_mode_type'];
export type UserTier = Database['public']['Enums']['user_tier'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Household = Database['public']['Tables']['households']['Row'];
export type HouseholdMember = Omit<Database['public']['Tables']['household_members']['Row'], 'role'> & {
  role: 'owner' | 'admin' | 'member';
};

// --- 2. INVENTARIO Y COMPRA (ARQUITECTURA V2: 2 TABLAS) ---

// A) EL CEREBRO: Definición del Producto
export interface ProductDefinition {
  id: string;
  household_id: string;
  name: string;
  category: string;
  unit: 'uds' | 'kg' | 'g' | 'L' | 'ml';
  importance_level: 'critical' | 'high' | 'normal' | 'ghost';
  min_quantity: number | null; 
  is_ghost: boolean;
  created_at: string;
}

// B) EL CUERPO: Lote de Inventario
export interface InventoryItem {
  id: string;
  product_id: string; // Enlace al padre
  household_id: string;
  quantity: number;
  expiry_date: string | null;
  location: string;
  price?: number | null;
  created_at: string;
  
  // JOIN: Opcional para facilitar lectura en frontend
  product?: ProductDefinition; 
  
  // Compatibilidad legacy (opcionales para no romper código antiguo que aun las busque)
  name?: string;
  category?: string;
  unit?: string;
}

// C) VISTA AGRUPADA (Solo Frontend - StockModal)
export interface GroupedProduct extends ProductDefinition {
  batches: InventoryItem[]; 
  total_quantity: number;
  earliest_expiry: string | null;
  batch_count: number;
  status: 'stocked' | 'low' | 'panic';
}

// --- 3. LISTAS Y NEVERA ---
export type ShoppingListItem = Database['public']['Tables']['shopping_list']['Row'] & {
  estimated_price?: number;
};

export type FridgeItem = Database['public']['Tables']['fridge_items']['Row'] & {
  layer?: 'global' | 'personal' | 'critical' | 'high' | 'normal'; 
  rotation?: number;
  content?: string | null; 
};

// --- 4. FASE 2: SOCIAL SPACES & GRAFFITI (RESTAURADO) ---
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
  vector_path: any; 
  color: string;
  opacity: number;
  created_at: string;
}

// --- 5. FASE 2: P2P MEDIA (RESTAURADO) ---
export interface MediaTransfer {
  id: string;
  sender_id: string;
  receiver_id: string;
  preview_url: string;
  full_res_hash: string | null;
  status: 'available' | 'requested' | 'transferred' | 'expired';
  expires_at: string;
}

// --- 6. EXTRAS / INSERTS ---
export type InventoryItemInsert = Database['public']['Tables']['inventory_items']['Insert'];
export type ProductDefinitionInsert = Database['public']['Tables']['product_definitions']['Insert'];
export type FridgeItemInsert = Database['public']['Tables']['fridge_items']['Insert'];