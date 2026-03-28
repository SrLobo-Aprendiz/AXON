import type { ProductDefinition, InventoryItem } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ProductStat {
  effectiveQty: number;
  minQty: number;
  priority: 'panic' | 'urgent' | 'low' | 'ok';
}

export interface ShoppingUpsertItem {
  item_name: string;
  quantity: number;
  category: string;
  priority: 'panic' | 'urgent';
  is_manual: false;
  status: 'active';
  household_id: string;
}

export interface AutomationResult {
  toUpsert: ShoppingUpsertItem[];
  toDelete: string[];
  productStats: Map<string, ProductStat>;
  counters: {
    critical: number;
    high: number;
    normal: number;
  };
}

// ─── Constants ─────────────────────────────────────────────────────────────

/**
 * Number of days before expiry at which we treat a batch as "effectively expired".
 */
const EXPIRY_WARNING_DAYS = 3;

// ─── Helpers ───────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function isBatchExpired(expiryDate: string | null, today: Date): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return false;
  return daysBetween(today, expiry) <= EXPIRY_WARNING_DAYS;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// ─── Core pure function ────────────────────────────────────────────────────

/**
 * calculateAutomation
 *
 * Pure function — no side effects, no Supabase calls.
 * Decides which products should be added to or removed from the shopping list.
 *
 * @param inventory       - All inventory items (batches), with `.product` joined.
 * @param products        - All product definitions for the household.
 * @param shoppingListMap - Current shopping list keyed by normalised product name.
 * @param receptionMap    - Items recently received/confirmed, keyed by normalised name.
 * @param today           - Reference date (injectable for testing).
 */
export function calculateAutomation(
  inventory: (InventoryItem & { product?: ProductDefinition })[],
  products: ProductDefinition[],
  shoppingListMap: Map<string, { id: string; is_manual?: boolean | null }>,
  receptionMap: Map<string, boolean>,
  today: Date = new Date()
): AutomationResult {
  const toUpsert: ShoppingUpsertItem[] = [];
  const toDelete: string[] = [];
  const productStats = new Map<string, ProductStat>();
  const counters = { critical: 0, high: 0, normal: 0 };

  for (const product of products) {
    // Ghost products are placeholders — skip.
    if (product.is_ghost || product.importance_level === 'ghost') continue;

    const key = normalizeName(product.name);
    const minQty = product.min_quantity ?? 0;

    // Sum effective quantity: ignore batches expired or about to expire.
    const relevantBatches = inventory.filter(
      (item) => item.product_id === product.id || item.product?.id === product.id
    );

    const effectiveQty = relevantBatches.reduce((sum, item) => {
      if (item.is_ghost) return sum;
      if (isBatchExpired(item.expiry_date, today)) return sum;
      return sum + (item.quantity ?? 0);
    }, 0);

    // Determine priority based on stock level vs minimum
    let priority: ProductStat['priority'];
    if (effectiveQty === 0) {
      priority = 'panic';
    } else if (minQty > 0 && effectiveQty < minQty) {
      priority = 'urgent';
    } else {
      priority = 'ok';
    }

    productStats.set(key, { effectiveQty, minQty, priority });

    const needsBuying = priority === 'panic' || priority === 'urgent';
    const alreadyInList = shoppingListMap.has(key);
    const isManual = shoppingListMap.get(key)?.is_manual ?? false;
    const wasRecentlyReceived = receptionMap.has(key);

    if (needsBuying && !wasRecentlyReceived) {
      // Track counters by importance level
      if (product.importance_level === 'critical') counters.critical++;
      else if (product.importance_level === 'high') counters.high++;
      else counters.normal++;

      // Upsert into shopping list (add or update)
      toUpsert.push({
        item_name: product.name,
        quantity: minQty > 0 ? minQty : 1,
        category: product.category ?? 'Pantry',
        priority: priority === 'panic' ? 'panic' : 'urgent',
        is_manual: false,
        status: 'active',
        household_id: product.household_id,
      });
    } else if (!needsBuying && alreadyInList && !isManual) {
      // Stock is sufficient and item was auto-added — remove it
      const listItem = shoppingListMap.get(key)!;
      toDelete.push(listItem.id);
    }
  }

  return { toUpsert, toDelete, productStats, counters };
}
