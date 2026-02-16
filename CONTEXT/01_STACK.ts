// AXON OS: TYPE DEFINITIONS (v3.2)
// Use this reference for all DB Schema operations.

export type Role = 'admin' | 'parent' | 'member' | 'guest';
export type SecurityLevel = 1 | 2 | 3 | 4;

// AXON OS: TYPE DEFINITIONS (v6.0 - Liquid Trust & Age Presets)
// Use this reference for all DB Schema operations.

// --- CORE IDENTITY: LEVELS & CAPABILITIES ---

// 1. LOS NIVELES (El "Container" Psicológico)
// Define la Interfaz (UI) y el filtro de contenido automático.
export enum UserLevel {
  // LEVEL 0: OBSERVER (Abuelos/Invitados)
  // UI: Accesible, alto contraste. Sin gestión de configuración.
  OBSERVER = 0,

  // LEVEL 1: KIDS (6 - 10 años) | Etapa: Operaciones Concretas
  // UI: Gamificada, botones grandes, visual. 
  // Filtro: Solo ve Stock básico. No ve precios ni config.
  KID = 1,

  // LEVEL 2: TEENS (11 - 15 años) | Etapa: Identidad/Stealth
  // UI: Modo "Hacker/Pro". Oscura. Cero infantilización.
  // Filtro: Ve Stock completo + Wishlist propia.
  TEEN = 2,

  // LEVEL 3: JUNIOR (16 - 18+ años) | Etapa: Pre-Autonomía
  // UI: Estándar (Igual a Admin).
  // Filtro: Ve finanzas (si se activa) y gestión global.
  JUNIOR = 3,

  // LEVEL 4: HEAD (Padres/Tutores)
  // UI: God Mode (Configuración total).
  PARENT = 4
}

// 2. LAS CAPACIDADES (Los "Interruptores" Líquidos)
// Estos booleanos prevalecen sobre el Nivel. 
// Permiten excepciones (ej. Un niño de 9 años que SÍ cocina).
// Se almacenan como JSONB en la base de datos.
export interface Capabilities {
  // STOCK & LISTAS
  can_read_stock: boolean;    // Ver qué hay
  can_add_stock: boolean;     // Pedir cosas
  can_delete_stock: boolean;  // ¡PELIGROSO! (Borrar items)
  can_edit_pantry: boolean;   // Mover items, cambiar caducidad
  
  // GESTIÓN DEL HOGAR
  can_manage_finance: boolean; // Ver precios/gastos (Para Level 3+)
  can_invite_users: boolean;   // Generar códigos QR
  can_manage_settings: boolean;// Cambiar nombre de casa, wifi, etc.
}

// 3. EL PERFIL DE USUARIO
export interface Profile {
  id: string; // UUID
  household_id: string | null;
  username: string;
  avatar_svg: string; // JSON/SVG string
  
  // LA ESTRUCTURA
  level: UserLevel;        // Define la UI y Defaults (Jerarquía)
  capabilities: Capabilities; // Define los Permisos Reales (Operativa)
  
  // LA CULTURA
  language: 'es' | 'ca' | 'gl' | 'eu' | 'en' | 'de' | 'zh' | 'pt';
  
  credits: number; // Axon Points (Hidden in Stealth Mode)
}

// --- PHASE 1: INVENTORY (SMART STOCK) ---
export type ImportanceLevel = 'critical' | 'high' | 'normal' | 'ghost';

export interface ProductDefinition {
  id: string;
  household_id: string;
  name: string;
  category: string; 
  unit: string; 
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
  expiry_date: string | null; 
  created_at: string;
}

// ... (Resto de interfaces Fridge, Social, etc. se mantienen igual por ahora)

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