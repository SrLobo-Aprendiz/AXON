// AXON OS: TYPE DEFINITIONS (v6.1 - Hybrid Model & Price Awareness)

// --- CORE IDENTITY: LEVELS & CAPABILITIES ---
export enum UserLevel {
  OBSERVER = 0, // Abuelos/Invitados - UI Accesible
  KID = 1,      // 6-10 años - Operaciones Concretas / Gamificado
  TEEN = 2,     // 11-15 años - Identidad / Modo Stealth (Hacker)
  JUNIOR = 3,   // 16-18+ años - Pre-Autonomía / Acceso a Finanzas
  PARENT = 4    // Heads - Control Total
}

export interface Capabilities {
  can_read_stock: boolean;
  can_add_stock: boolean;
  can_delete_stock: boolean; // El "Dedo Rápido"
  can_edit_pantry: boolean;
  can_manage_finance: boolean; // Ver precios y comparativas
  can_invite_users: boolean;
  can_manage_settings: boolean;
}

export interface Profile {
  id: string; 
  household_id: string | null;
  username: string;
  avatar_svg: string;
  level: UserLevel;
  capabilities: Capabilities;
  language: 'es' | 'ca' | 'gl' | 'eu' | 'en' | 'de' | 'zh' | 'pt';
  credits: number; 
}

// --- PHASE 1: INVENTORY & SSoT ---

// Categorías SSoT (Única fuente de verdad)
export type Category = 
  | 'Frescos y Verdura' // Renombrado de Produce
  | 'Carnicería'
  | 'Pescado'           // Nueva
  | 'Lácteos'
  | 'Despensa'
  | 'Congelados'
  | 'Bebidas'
  | 'Limpieza'
  | 'Higiene Personal'  // Nueva
  | 'Mascotas';

export type ImportanceLevel = 'critical' | 'high' | 'normal' | 'ghost';

export interface ProductDefinition {
  id: string;
  household_id: string;
  name: string;
  category: Category; 
  unit: 'uds' | 'kg' | 'L'; 
  importance_level: ImportanceLevel; 
  min_quantity: number | null; 
  is_ghost: boolean; 
}

export interface InventoryItem {
  id: string;
  product_id: string; 
  household_id: string;
  quantity: number;
  location: string;
  store: string;        // Añadido para comparativa futura
  price: number;        // Precio unitario normalizado
  price_type: 'unit' | 'total';
  
  // Modelo Híbrido: Redundancia para auditoría histórica
  name_snapshot: string; 
  category_snapshot: Category;
  
  expiry_date: string | null; 
  created_at: string;
}

// ... Resto de interfaces (FridgeItem, SocialSpace, GameCard) se mantienen

// --- PHASE 1: FRIDGE (LAYERS) ---
export interface FridgeItem {
  id: string;
  household_id: string;
  content: string; // Text or JSON item data
  position_x: number;
  position_y: number;
  rotation: number;
  layer: 'global' | 'personal'; // Global = Parents/Base, Personal = Kids/Chaos
  created_by: string; // user_id
  is_locked: boolean; // If true, only Admins can move it
}
// --- PHASE 1: INVENTORY (SMART STOCK) ---
export type ImportanceLevel = 'critical' | 'high' | 'normal' | 'ghost';

export interface ProductDefinition {
  id: string;
  household_id: string;
  name: string;
  category: string; // 'Meat' | 'Dairy' | 'Pantry', etc.
  unit: string; // 'uds' | 'kg' | 'L'
  importance_level: ImportanceLevel; // Define color warning logic
  min_quantity: number | null; // If null, uses defaults (4, 2, 1)
  is_ghost: boolean; // If true: Delete on 0 qty. If false: Persist at 0 qty.
}

export interface InventoryItem {
  id: string;
  product_id: string; // FK to ProductDefinition
  household_id: string;
  quantity: number;
  location: string; // 'Despensa', 'Nevera', etc.
  expiry_date: string | null; // ISO Date
  created_at: string;
}

// --- PHASE 2: SOCIAL SPACES (SHUTTER/ALLEY) ---
export type SurfaceType = 'shutter_metal' | 'wall_brick' | 'wall_concrete';

export interface SocialSpace {
  id: string;
  owner_id: string | null; // Null if it's a Squad Wall
  group_id: string | null; // For Squad Walls
  type: SurfaceType;
  is_public: boolean; // If true, friends can tag
}

export interface GraffitiLayer {
  id: string;
  space_id: string;
  creator_id: string;
  vector_path: string; // JSON array of coordinates
  color: string; // Hex or Tailwind class
  opacity: number; // Decays over time (Sr. Paco logic)
  created_at: string;
}

// --- PHASE 2: DATA DIET (P2P MEDIA) ---
export interface MediaTransfer {
  id: string;
  sender_id: string;
  receiver_id: string;
  preview_url: string; // Low-res (500kb) hosted on Supabase Storage
  full_res_hash: string; // For P2P verification
  status: 'available' | 'requested' | 'transferred' | 'expired';
  expires_at: string; // Auto-delete trigger
}

// --- PHASE 3: GAMIFICATION ---
export interface GameCard {
  id: string;
  type: 'assassin_target' | 'auction_bid' | 'zasca_reply';
  title: string;
  description: string;
  rarity: 'common' | 'rare' | 'legendary' | 'toxic';
  metadata: Record<string, any>; // Flexible JSON for game logic
}