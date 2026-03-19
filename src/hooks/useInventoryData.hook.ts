import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { inventoryService } from '@/lib/services/api';
import { InventoryItem } from '@/lib/types';
import { addDays } from 'date-fns';

export function useInventoryData(householdId: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [receptionItems, setReceptionItems] = useState<any[]>([]);
    const [groupedInventory, setGroupedInventory] = useState<any[]>([]);
    const [rawInventoryItems, setRawInventoryItems] = useState<InventoryItem[]>([]);
    const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
    const [suggestionAlerts, setSuggestionAlerts] = useState<any[]>([]);
    const [storeSuggestions, setStoreSuggestions] = useState<string[]>([]);
    const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
    const [existingProductsInfo, setExistingProductsInfo] = useState<Record<string, any>>({});

    const processInventory = useCallback((items: any[]) => {
        const groupedMap = new Map<string, any>();
        const criticals: any[] = [];
        const suggestions: any[] = [];
        const today = new Date();
        const expiryThresholdDate = addDays(today, 3);

        items.forEach(item => {
            const prod = item.product;
            if (!prod) return;

            const key = prod.id;
            if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                    product_id: prod.id,
                    id: prod.id,
                    name: prod.name,
                    category: prod.category,
                    unit: prod.unit,
                    importance_level: prod.importance_level,
                    min_quantity: prod.min_quantity,
                    is_ghost: prod.is_ghost,
                    total_quantity: 0,
                    healthy_quantity: 0,
                    expiring_quantity: 0,
                    batch_count: 0,
                    earliest_expiry: null,
                    has_expiring_batch: false,
                    batches: [],
                    locations: {} as Record<string, number>
                });
            }
            const group = groupedMap.get(key)!;

            group.total_quantity += item.quantity;

            if (item.quantity > 0) {
                group.batch_count += 1;
                group.batches.push(item);

                const loc = item.location || 'Sin ubicación';
                group.locations[loc] = (group.locations[loc] || 0) + 1;

                const isExpiringSoon = item.expiry_date && new Date(item.expiry_date) <= expiryThresholdDate;

                if (isExpiringSoon) {
                    group.has_expiring_batch = true;
                    group.expiring_quantity += item.quantity;
                } else {
                    group.healthy_quantity += item.quantity;
                }

                if (item.expiry_date && (!group.earliest_expiry || new Date(item.expiry_date) < new Date(group.earliest_expiry))) {
                    group.earliest_expiry = item.expiry_date;
                }
            }
        });

        groupedMap.forEach(group => {
            if (group.is_ghost) return;

            const threshold = group.min_quantity !== null
                ? group.min_quantity
                : (group.importance_level === 'critical' ? 4 : group.importance_level === 'high' ? 2 : 1);

            const isImportant = ['critical', 'high'].includes(group.importance_level);
            const isCriticalState = isImportant && (group.total_quantity === 0 || group.healthy_quantity <= threshold);

            if (isCriticalState) {
                let reason = "Stock bajo";
                if (group.total_quantity === 0) reason = "AGOTADO";
                else if (group.healthy_quantity < group.total_quantity) reason = "Stock crítico por caducidad";
                criticals.push({ ...group, reason, severity: group.importance_level });
                return;
            }

            if (group.expiring_quantity > 0) {
                suggestions.push({ ...group, reason: "Caducidad próxima", severity: 'expiry' });
            } else if (group.healthy_quantity <= threshold && group.importance_level === 'normal') {
                suggestions.push({ ...group, reason: group.total_quantity === 0 ? "Agotado (Opcional)" : "Reponer opcional", severity: 'low_optional' });
            }
        });

        setCriticalAlerts(criticals);
        setSuggestionAlerts(suggestions);
        setGroupedInventory(Array.from(groupedMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    }, []);

    const fetchData = useCallback(async () => {
        if (!householdId) return;
        setIsLoading(true);

        try {
            const receptionData = await inventoryService.getReceptionItems(householdId);
            setReceptionItems(receptionData);

            const names = receptionData.map(i => i.item_name).filter(Boolean);
            if (names.length > 0) {
                const prods = await inventoryService.getProductDefinitions(householdId, names);
                const infoMap: Record<string, any> = {};
                prods?.forEach(p => {
                    infoMap[p.name.toLowerCase()] = p;
                });
                setExistingProductsInfo(infoMap);
            }

            await new Promise(resolve => setTimeout(resolve, 300));

            const inventoryData = await inventoryService.getInventory(householdId);
            
            const uniqueStores = new Set<string>();
            const uniqueLocs = new Set<string>();
            inventoryData.forEach((i: any) => {
                if (i.store?.trim()) uniqueStores.add(i.store.trim());
                if (i.location?.trim()) uniqueLocs.add(i.location.trim());
            });
            setStoreSuggestions(Array.from(uniqueStores).sort());
            setLocationSuggestions(Array.from(uniqueLocs).sort());

            setRawInventoryItems(inventoryData);
            processInventory(inventoryData);
        } catch (err) {
            console.error("Error fetching stock:", err);
        } finally {
            setIsLoading(false);
        }
    }, [householdId, processInventory]);

    return {
        isLoading,
        receptionItems,
        groupedInventory,
        rawInventoryItems,
        criticalAlerts,
        suggestionAlerts,
        storeSuggestions,
        locationSuggestions,
        existingProductsInfo,
        fetchData
    };
}
