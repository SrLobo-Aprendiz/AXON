import { supabase } from '@/integrations/supabase/client';
import type { 
  Profile, 
  Household, 
  HouseholdMember, 
  InventoryItem, 
  ProductDefinition,
  ShoppingListItem
} from '@/lib/types';

/**
 * SERVICIOS DE AUTENTICACIÓN Y PERFIL
 */
export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, household_ids, ui_mode, updated_at, current_household_id, is_superadmin, level, display_name, username')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    return await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
  }
};

/**
 * SERVICIOS DE HOGARES
 */
export const householdService = {
  async getHousehold(householdId: string): Promise<Household | null> {
    const { data, error } = await supabase
      .from('households')
      .select('*')
      .eq('id', householdId)
      .single();

    if (error) {
      console.error('Error fetching household:', error);
      return null;
    }
    return data;
  },

  async getUserRole(userId: string, householdId: string): Promise<HouseholdMember['role'] | null> {
    const { data, error } = await supabase
      .from('household_members')
      .select('role')
      .eq('user_id', userId)
      .eq('household_id', householdId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
    
    const role = data?.role;
    if (role === 'owner' || role === 'admin' || role === 'member') return role;
    return null;
  },

  async getMemberData(userId: string) {
    return await supabase
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
  }
};

/**
 * SERVICIOS DE INVENTARIO Y STOCK
 */
export const inventoryService = {
  async getInventory(householdId: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, product:product_definitions(*)')
      .eq('household_id', householdId)
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error('Error fetching inventory:', error);
      return [];
    }
    return data as InventoryItem[];
  },

  async getReceptionItems(householdId: string): Promise<ShoppingListItem[]> {
    const { data, error } = await supabase
      .from('shopping_list')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'bought')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reception items:', error);
      return [];
    }
    return data as ShoppingListItem[];
  },

  async updateBatch(batchId: string, updates: Partial<InventoryItem>) {
    return await supabase
      .from('inventory_items')
      .update(updates as any)
      .eq('id', batchId);
  },

  async deleteBatch(batchId: string) {
    return await supabase
      .from('inventory_items')
      .delete()
      .eq('id', batchId);
  },

  async createBatch(batchData: any) {
    return await supabase
      .from('inventory_items')
      .insert(batchData);
  },

  async getProductDefinitions(householdId: string, names: string[]): Promise<ProductDefinition[]> {
    const { data, error } = await supabase
      .from('product_definitions')
      .select('id, name, unit, is_ghost, importance_level')
      .eq('household_id', householdId)
      .in('name', names);

    if (error) {
      console.error('Error fetching product definitions:', error);
      return [];
    }
    return data as ProductDefinition[];
  },

  async deleteProduct(productId: string) {
    return await supabase
      .from('product_definitions')
      .delete()
      .eq('id', productId);
  },

  async addToShoppingList(item: any) {
    return await supabase
      .from('shopping_list')
      .insert(item);
  },

  async consumeProductStock(productId: string, quantity: number, isGhost: boolean, allBatches: InventoryItem[]) {
    let remaining = quantity;
    const batches = allBatches
      .filter(i => i.product_id === productId && i.quantity > 0)
      .sort((a, b) => new Date(a.expiry_date || '9999').getTime() - new Date(b.expiry_date || '9999').getTime());

    for (const batch of batches) {
      if (remaining <= 0) break;
      if (batch.quantity > remaining) {
        await this.updateBatch(batch.id, { quantity: batch.quantity - remaining });
        remaining = 0;
      } else {
        remaining -= batch.quantity;
        if (isGhost) {
          await this.deleteBatch(batch.id);
        } else {
          await this.updateBatch(batch.id, { quantity: 0, expiry_date: null });
        }
      }
    }

    if (isGhost) {
      const { data: remainingBatches } = await supabase
        .from('inventory_items')
        .select('id, quantity')
        .eq('product_id', productId);

      const totalRemaining = remainingBatches?.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0) || 0;

      if (totalRemaining <= 0) {
        await this.deleteProduct(productId);
        return { productDeleted: true };
      }
    }
    return { productDeleted: false };
  },

  async moveBatch(batch: InventoryItem, newLoc: string, qty: number, expiryDate?: string) {
    if (qty >= batch.quantity) {
      return await this.updateBatch(batch.id, { location: newLoc, expiry_date: expiryDate || batch.expiry_date });
    } else {
      await this.updateBatch(batch.id, { quantity: batch.quantity - qty });
      return await this.createBatch({
        household_id: batch.household_id,
        product_id: batch.product_id,
        name: batch.name,
        category: batch.category,
        unit: batch.unit,
        quantity: qty,
        location: newLoc,
        expiry_date: expiryDate || batch.expiry_date
      });
    }
  },

  async moveAllProductBatches(productId: string, destination: string, allBatches: InventoryItem[]) {
    const batches = allBatches.filter(i => i.product_id === productId && i.quantity > 0);
    const promises = batches.map(batch => this.updateBatch(batch.id, { location: destination }));
    return await Promise.all(promises);
  },

  async cleanupZeroQuantityBatches(productId: string) {
    return await supabase
      .from('inventory_items')
      .delete()
      .eq('product_id', productId)
      .eq('quantity', 0);
  },

  async updateProductDefinition(productId: string, updates: any) {
    return await supabase
      .from('product_definitions')
      .update(updates)
      .eq('id', productId);
  },

  async syncProductDataToBatches(productId: string, data: { name: string, category: string, unit: string }) {
    return await supabase
      .from('inventory_items')
      .update(data as any)
      .eq('product_id', productId);
  }
};
