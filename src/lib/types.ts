import type { Database } from '@/integrations/supabase/types';
import { Fish, Apple, Beef, Milk, ShoppingBag, Snowflake, Coffee, Home, Leaf, SprayCan } from 'lucide-react';

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
  importance_level: 'critical' | 'high' | 'normal' | 'low' | 'ghost';
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
  price?: number | null; // ✅ NUEVO CAMPO AÑADIDO
  created_at: string;
  is_ghost?: boolean;
  
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
  layer?: 'global' | 'personal' | 'critical' | 'high' | 'normal' | 'low'; 
  rotation?: number;
  content?: string | null; 
};

// --- 4. CATEGORÍAS ACTUALIZADAS (ESPAÑOL) ---
export const CATEGORY_CONFIG = {
  Dairy: { 
    label: 'Lácteos', 
    icon: Milk, 
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
  },
  Meat: { 
    label: 'Carnes', 
    icon: Beef, 
    color: 'bg-red-500/10 text-red-400 border-red-500/30' 
  },
  Fish: { // ✅ NUEVO
    label: 'Pescado', 
    icon: Fish, 
    color: 'bg-teal-500/10 text-teal-400 border-teal-500/30' 
  },
  Produce: { // ✅ RENOMBRADO
    label: 'Frescos y Verdura', 
    icon: Leaf, 
    color: 'bg-green-500/10 text-green-400 border-green-500/30' 
  },
  Fruit: { // ✅ NUEVO
    label: 'Frutas', 
    icon: Apple, 
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' 
  },
  Bakery: { 
    label: 'Pan y Bollería', 
    icon: ShoppingBag, 
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
  },
  Pantry: { 
    label: 'Despensa', 
    icon: Home, 
    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' 
  },
  Frozen: { 
    label: 'Congelados', 
    icon: Snowflake, 
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' 
  },
  Beverages: { 
    label: 'Bebidas', 
    icon: Coffee, 
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' 
  },
  PersonalCare: { // ✅ NUEVO
    label: 'Higiene Personal', 
    icon: SprayCan, 
    color: 'bg-pink-500/10 text-pink-400 border-pink-500/30' 
  },
  Household: { 
    label: 'Limpieza y Hogar', 
    icon: Home, 
    color: 'bg-gray-500/10 text-gray-400 border-gray-500/30' 
  },
} as const;

export const CATEGORIES = Object.keys(CATEGORY_CONFIG) as (keyof typeof CATEGORY_CONFIG)[];

// Helper: Safe date parsing
export function safeDate(dateStr: string | null | undefined): Date | undefined {
  if (!dateStr) return undefined;
  try {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  } catch {
    return undefined;
  }
}

// --- 5. FASE 2: SOCIAL SPACES & GRAFFITI (RESTAURADO) ---
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

// --- 6. FASE 2: P2P MEDIA (RESTAURADO) ---
export interface MediaTransfer {
  id: string;
  sender_id: string;
  receiver_id: string;
  preview_url: string;
  full_res_hash: string | null;
  status: 'available' | 'requested' | 'transferred' | 'expired';
  expires_at: string;
}

// --- 7. EXTRAS / INSERTS ---
export type InventoryItemInsert = Database['public']['Tables']['inventory_items']['Insert'];
export type ProductDefinitionInsert = Database['public']['Tables']['product_definitions']['Insert'];
export type FridgeItemInsert = Database['public']['Tables']['fridge_items']['Insert'];
