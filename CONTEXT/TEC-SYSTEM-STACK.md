# TEC-SYSTEM-STACK: ARQUITECTURA TÉCNICA Y MODELO DE DATOS

## 1. IDENTIDAD Y CAPACIDADES (LIQUID TRUST)
El sistema abandona los roles duros a favor de una triada `Session + Profile + Household`.

```typescript
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
```

## 2. INVENTARIO Y SSOT (ÚNICO ORIGEN DE VERDAD)

### 2.1 Categorías SSoT
Todas las categorías provienen de un alias estricto:
```typescript
export type Category = 
  | 'Frescos y Verdura' | 'Carnicería' | 'Pescado' | 'Lácteos' | 'Despensa' 
  | 'Congelados' | 'Bebidas' | 'Limpieza' | 'Higiene Personal' | 'Mascotas';

export type ImportanceLevel = 'critical' | 'high' | 'normal' | 'ghost';
```

### 2.2 Entidades Principales
Implementan el **Modelo Híbrido** (`name_snapshot`, `category_snapshot`) copiando los datos del padre.

```typescript
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
  store: string;        
  price: number;        
  price_type: 'unit' | 'total';
  name_snapshot: string; 
  category_snapshot: Category;
  expiry_date: string | null; 
  created_at: string;
}
```

## 3. ESPACIOS SOCIALES Y GAMIFICACIÓN (FASE 2 Y 3)

```typescript
export interface FridgeItem {
  id: string;
  household_id: string;
  content: string; 
  position_x: number; position_y: number; rotation: number;
  layer: 'global' | 'personal'; // Global = Parents, Personal = Kids
  created_by: string; 
  is_locked: boolean; 
}

export type SurfaceType = 'shutter_metal' | 'wall_brick' | 'wall_concrete';

export interface SocialSpace {
  id: string;
  owner_id: string | null; 
  group_id: string | null; 
  type: SurfaceType;
  is_public: boolean; 
}

export interface GraffitiLayer {
  id: string; space_id: string; creator_id: string;
  vector_path: string; // JSON array of coordinates
  color: string; opacity: number; created_at: string;
}

export interface MediaTransfer {
  id: string; sender_id: string; receiver_id: string;
  preview_url: string; // Low-res (500kb) 
  full_res_hash: string; // P2P verification
  status: 'available' | 'requested' | 'transferred' | 'expired';
  expires_at: string; 
}

export interface GameCard {
  id: string;
  type: 'assassin_target' | 'auction_bid' | 'zasca_reply';
  title: string; description: string;
  rarity: 'common' | 'rare' | 'legendary' | 'toxic';
  metadata: Record<string, any>; 
}
```
## 3. ESPACIOS SOCIALES Y GAMIFICACIÓN
- **FridgeItem:** Capas `global` (bloqueadas) vs `personal`.
- **GraffitiLayer:** Usa vectores `JSON` (`vector_path`) para dibujar grafitis sobre superficies de fondos (shutter_metal, wall_brick) ahorrando almacenamiento.
- **MediaTransfer:** Usa `preview_url` y `full_res_hash` para gestionar WebRTC (P2P).
- **GameCard:** Uso de `metadata` y tipos especiales (`assassin_target`, `auction_bid`) para ejecutar la Fase 3 del producto sin recargar la UI con imágenes.
