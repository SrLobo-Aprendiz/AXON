// AXON OS: TYPE DEFINITIONS (v3.2)
// Use this reference for all DB Schema operations.

export type Role = 'admin' | 'parent' | 'member' | 'guest';
export type SecurityLevel = 1 | 2 | 3 | 4;

// --- CORE ---
export interface Profile {
  id: string; // UUID
  household_id: string | null;
  username: string;
  role: Role;
  security_level: SecurityLevel;
  credits: number; // Axon Points
  avatar_svg: string; // JSON/SVG string, no images
}

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