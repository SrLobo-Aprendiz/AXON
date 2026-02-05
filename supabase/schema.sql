-- MIGRACIÓN V3.2: Nevera Multicapa y Espacios Sociales
-- Autor: GEM & Javier
-- Fecha: 2026-02-02

-- 1. ACTUALIZAR TABLA EXISTENTE: fridge_items
-- Tu archivo actual dice que ya tienes 'fridge_items'. Le añadimos las capas.
ALTER TABLE fridge_items 
ADD COLUMN IF NOT EXISTS layer text DEFAULT 'global' CHECK (layer IN ('global', 'personal')),
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rotation numeric DEFAULT 0;

-- 2. CREAR NUEVAS TABLAS (Fase 2 - Persiana y Callejón)
-- Estas no existen en tu archivo actual, así que las creamos de cero.
CREATE TABLE IF NOT EXISTS social_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid, 
  type text NOT NULL CHECK (type IN ('shutter_metal', 'wall_brick', 'wall_concrete')),
  is_public boolean DEFAULT false, 
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS graffiti_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid REFERENCES social_spaces(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES auth.users(id),
  vector_path jsonb NOT NULL, 
  color text NOT NULL,
  opacity numeric DEFAULT 1.0, 
  created_at timestamptz DEFAULT now()
);

-- 3. CREAR NUEVA TABLA (Fase 2 - P2P Media)
CREATE TABLE IF NOT EXISTS media_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id),
  receiver_id uuid REFERENCES auth.users(id),
  preview_url text NOT NULL, 
  full_res_hash text, 
  status text DEFAULT 'available' CHECK (status IN ('available', 'requested', 'transferred', 'expired')),
  expires_at timestamptz NOT NULL, 
  created_at timestamptz DEFAULT now()
);

-- 4. ACTIVAR SEGURIDAD (RLS)
ALTER TABLE social_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE graffiti_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_transfers ENABLE ROW LEVEL SECURITY;

-- Políticas temporales para que puedas trabajar (Abiertas a usuarios logueados)
CREATE POLICY "Acceso base social" ON social_spaces FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acceso base graffiti" ON graffiti_layers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acceso base media" ON media_transfers FOR ALL USING (auth.role() = 'authenticated');