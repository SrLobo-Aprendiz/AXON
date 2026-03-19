import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import {
    Package, Search, AlertTriangle, ShoppingCart,
    Pencil, Plus, Loader2, X, CheckCircle2,
    Ghost, Skull, Info, ChevronRight, Minus, Layers, Check, ChevronLeft, Trash2
} from 'lucide-react';
import { inventoryService } from '@/lib/services/api';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ERROR_CODES, getErrorContent } from '@/lib/constants/errors';

// Componentes Modulares
import { ReceptionRow } from '@/components/stock/ReceptionRow';
import { InventoryBatchRow } from '@/components/stock/InventoryBatchRow';
import { EditProductDialog } from '@/components/stock/EditProductDialog';
import AddItemDialog from './AddItemDialog';
import AddBatchDialog from './AddBatchDialog';
import { LocationAutocomplete } from './LocationAutocomplete';
import { usePerformanceSettings } from '@/hooks/usePerformanceSettings';

// Configuración
import { CATEGORY_CONFIG, InventoryItem } from '@/lib/types';

// --- COMPONENTES AUXILIARES MEMOIZADOS ---
const ProductRow = React.memo(({
    item,
    onSelect,
    onAddToShoppingList,
    swipingId,
    setSwipingId,
    swipeOffset,
    setSwipeOffset,
    SWIPE_THRESHOLD
}: any) => {
    const catConf = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.Pantry;
    const priorityColor = item.is_ghost ? "border-zinc-600/40" :
        item.importance_level === 'critical' ? "border-red-500/50" :
            item.importance_level === 'high' ? "border-orange-500/50" :
                "border-blue-500/50";
    const priorityText = item.is_ghost ? 'PUNTUAL' :
        item.importance_level === 'critical' ? 'VITAL' :
            item.importance_level === 'high' ? 'ALTA' : 'NORM.';
    const priorityTextColor = item.is_ghost ? "text-zinc-500" :
        item.importance_level === 'critical' ? "text-red-400" :
            item.importance_level === 'high' ? "text-orange-400" : "text-blue-400";

    const sid = item.product_id;
    const isDragging = React.useRef(false);
    const touchStartX = React.useRef(0);

    return (
        <div className={cn("rounded-xl border relative overflow-hidden", priorityColor)}>
            <div className={cn(
                "absolute inset-0 flex items-center pl-4",
                swipeOffset === 0 ? "invisible" : "visible",
                swipeOffset >= SWIPE_THRESHOLD ? "bg-green-600/25" : "bg-blue-600/15"
            )}>
                <ShoppingCart className={cn("w-5 h-5 transition-all duration-150", swipeOffset >= SWIPE_THRESHOLD ? "text-green-400 scale-125" : "text-blue-400 opacity-60")} />
            </div>
            <div
                className="bg-zinc-900/40 p-2.5 flex items-center gap-2 cursor-grab active:cursor-grabbing relative select-none w-full"
                style={{ transform: `translateX(${swipeOffset}px)`, transition: swipingId === sid ? 'none' : 'transform 0.25s ease' }}
                onClick={() => { if (!isDragging.current) onSelect(item); }}
                onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; setSwipingId(sid); isDragging.current = false; }}
                onTouchMove={(e) => {
                    const d = e.touches[0].clientX - touchStartX.current;
                    if (d > 0) { isDragging.current = true; setSwipeOffset(sid, Math.min(d, 120)); }
                }}
                onTouchEnd={() => {
                    setSwipingId(null);
                    if (swipeOffset >= SWIPE_THRESHOLD) onAddToShoppingList(item);
                    setSwipeOffset(sid, 0);
                    setTimeout(() => { isDragging.current = false; }, 100);
                }}
                onMouseDown={(e) => { touchStartX.current = e.clientX; setSwipingId(sid); isDragging.current = false; }}
                onMouseMove={(e) => {
                    if (swipingId !== sid) return;
                    const d = e.clientX - touchStartX.current;
                    if (d > 5) { isDragging.current = true; setSwipeOffset(sid, Math.min(d, 120)); }
                }}
                onMouseUp={() => {
                    if (swipingId !== sid) return;
                    setSwipingId(null);
                    if (swipeOffset >= SWIPE_THRESHOLD) onAddToShoppingList(item);
                    setSwipeOffset(sid, 0);
                    setTimeout(() => { isDragging.current = false; }, 100);
                }}
                onMouseLeave={() => {
                    if (swipingId !== sid) return;
                    setSwipingId(null);
                    setSwipeOffset(sid, 0);
                    setTimeout(() => { isDragging.current = false; }, 100);
                }}
            >
                <div className={cn("absolute top-0 left-0 px-2 py-0.5 text-[8px] font-black tracking-tighter bg-zinc-800/80 rounded-br-lg shadow-sm z-10", priorityTextColor)}>
                    {priorityText}
                </div>
                <div className="flex-1 min-w-0 pr-1 pt-1">
                    <div className="font-bold text-[13.5px] text-zinc-100 leading-tight mb-0.5 truncate">{item.name}</div>
                    <div className="flex items-center gap-2 text-[11.5px]">
                        <div className="flex items-center gap-1 text-zinc-400 font-medium whitespace-nowrap">
                            <Layers className="w-3 h-3 text-zinc-500" />
                            <span>{item.batches.length} {item.batches.length === 1 ? 'lote' : 'lotes'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-zinc-500 italic truncate opacity-70">
                            • {Object.keys(item.locations).join(', ')}
                        </div>
                    </div>
                </div>
                <div className="shrink-0 flex flex-col items-end min-w-[65px]">
                    <div className={cn("font-mono font-bold text-[13px] px-1.5 py-0.5 rounded-md whitespace-nowrap", item.total_quantity === 0 ? "text-red-400 bg-red-400/10" : "text-zinc-100 bg-zinc-800/50")}>
                        {item.total_quantity} <span className="text-[10px] opacity-70 ml-0.5">{item.unit}</span>
                    </div>
                    {item.earliest_expiry && (
                        <div className={cn("flex items-center gap-1 text-[10px] font-medium mt-1", differenceInDays(new Date(item.earliest_expiry), new Date()) < 7 ? "text-purple-400" : "text-emerald-500")}>
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {format(new Date(item.earliest_expiry), 'dd/MM/yy')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
ProductRow.displayName = 'ProductRow';

interface StockModalProps {
    isOpen: boolean;
    onClose: () => void;
    householdId: string;
}

export const StockModal: React.FC<StockModalProps> = ({ isOpen, onClose, householdId }) => {
    const { toast } = useToast();

    // --- ESTADOS ---
    const { useLowPerfUI, isMobile } = usePerformanceSettings();
    const [activeTab, setActiveTab] = useState('reception');
    const [isLoading, setIsLoading] = useState(false);

    // Datos
    const [receptionItems, setReceptionItems] = useState<any[]>([]);
    const [groupedInventory, setGroupedInventory] = useState<any[]>([]);
    const [rawInventoryItems, setRawInventoryItems] = useState<InventoryItem[]>([]);
    const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
    const [suggestionAlerts, setSuggestionAlerts] = useState<any[]>([]);
    const [existingProductsInfo, setExistingProductsInfo] = useState<Record<string, any>>({});

    // Sugerencias centralizadas para evitar redundancia en hijos
    const [storeSuggestions, setStoreSuggestions] = useState<string[]>([]);
    const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    // Sorting State
    const [sortBy, setSortBy] = useState<'name' | 'expiry' | 'priority' | 'category'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Swipe-to-add (touch + mouse)
    const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});
    const [swipingId, setSwipingId] = useState<string | null>(null);
    const touchStartX = useRef<Record<string, number>>({});
    const isDragging = useRef<boolean>(false);
    const SWIPE_THRESHOLD = 80;

    // Modales y Acciones
    const [consumeAmount, setConsumeAmount] = useState('');
    const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Confirmación Borrado

    // Mover Todo
    const [isMassCustomMode, setIsMassCustomMode] = useState(false);
    const [massCustomLoc, setMassCustomLoc] = useState('');

    // --- LÓGICA DE PROCESAMIENTO ---
    const processInventory = (items: any[]) => {
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

                // Track locations
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

        // Generar Alertas
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
    };

    const fetchData = useCallback(async () => {
        if (!householdId) return;
        setIsLoading(true);

        try {
            // FASE 1: Recepción
            const receptionData = await inventoryService.getReceptionItems(householdId);
            setReceptionItems(receptionData);

            // Pre-fetch de info de productos
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

            // FASE 2: Inventario
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

            setTimeout(() => {
                processInventory(inventoryData);
            }, 100);
        } catch (err) {
            console.error("Error fetching stock:", err);
        } finally {
            setIsLoading(false);
        }
    }, [householdId]);

    useEffect(() => {
        // Delay inicial para esperar a que termine la animación del Dialog
        if (isOpen) {
            const t = setTimeout(() => {
                fetchData();
            }, 250);
            return () => clearTimeout(t);
        }
    }, [isOpen, fetchData]);

    useEffect(() => {
        if (selectedProduct) {
            const updated = groupedInventory.find(p => p.product_id === selectedProduct.product_id);
            if (updated) setSelectedProduct(updated);
        }
    }, [groupedInventory]);

    // --- HANDLERS ---

    const confirmDeleteProduct = async () => {
        if (!selectedProduct) return;
        try {
            const { error } = await inventoryService.deleteProduct(selectedProduct.product_id);
            if (error) throw error;

            toast({ title: "Eliminado", description: "Producto borrado." });
            setShowDeleteConfirm(false);
            setSelectedProduct(null);
            fetchData();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    const handleConsume = async () => {
        if (!selectedProduct || !consumeAmount) return;
        const qty = Number(consumeAmount);
        if (qty <= 0 || qty > selectedProduct.total_quantity) {
            toast({ title: "Cantidad inválida", variant: "destructive" }); return;
        }

        try {
            const { productDeleted } = await inventoryService.consumeProductStock(
                selectedProduct.product_id,
                qty,
                selectedProduct.is_ghost,
                rawInventoryItems
            );

            if (productDeleted) {
                setSelectedProduct(null);
            }

            toast({ title: "Consumido", description: `${qty} ${selectedProduct.unit} gastados.` });
            setConsumeAmount('');
            fetchData();
        } catch (e: any) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleDeleteBatch = async (batchId: string) => {
        await inventoryService.deleteBatch(batchId);

        if (selectedProduct?.is_ghost) {
            const { data: remainingBatches } = await supabase
                .from('inventory_items')
                .select('id, quantity')
                .eq('product_id', selectedProduct.product_id);

            if (!remainingBatches || remainingBatches.length === 0) {
                await inventoryService.deleteProduct(selectedProduct.product_id);
                setSelectedProduct(null);
            }
        }
        fetchData();
    };

    const handleUpdateBatch = async (batchId: string, updates: Partial<InventoryItem>) => {
        await inventoryService.updateBatch(batchId, updates);

        if (selectedProduct?.is_ghost && updates.quantity !== undefined && Number(updates.quantity) <= 0) {
            await inventoryService.deleteBatch(batchId);

            const { data: remainingBatches } = await supabase
                .from('inventory_items')
                .select('id, quantity')
                .eq('product_id', selectedProduct.product_id);

            const totalRemaining = remainingBatches?.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0) || 0;

            if (totalRemaining <= 0) {
                await inventoryService.deleteProduct(selectedProduct.product_id);
                setSelectedProduct(null);
            }
        }
        fetchData();
    };

    const handleMoveBatch = async (batch: InventoryItem, newLoc: string, qty: number, dates?: { origin: Date | undefined, dest: Date | undefined }) => {
        try {
            const destDate = dates?.dest ? format(dates.dest, 'yyyy-MM-dd') : batch.expiry_date;
            await inventoryService.moveBatch(batch, newLoc, qty, destDate || undefined);
            
            toast({ title: "Movido", description: `${qty} ${batch.unit} a ${newLoc}.` });
            fetchData();
        } catch (e: any) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleMoveAllBatches = async (destination: string) => {
        if (!selectedProduct) return;
        await inventoryService.moveAllProductBatches(selectedProduct.product_id, destination, rawInventoryItems);
        
        toast({ title: "Movido", description: `Todo el stock a ${destination}.` });
        fetchData();
        setIsMassCustomMode(false);
        setMassCustomLoc('');
    };

    const handleAddToShoppingList = async (item: any) => {
        try {
            const { error } = await inventoryService.addToShoppingList({
                household_id: householdId,
                item_name: item.name,
                category: item.category,
                priority: item.importance_level,
                status: 'active',
                quantity: 1,
                is_manual: true,
                product_id: item.product_id
            });

            if (error) {
                if (error.code === '23505' || error.message?.includes('duplicate key')) {
                    const errInfo = getErrorContent(ERROR_CODES.SHOPPING_LIST.DUPLICATE_ITEM);
                    toast({ ...errInfo, variant: "default" });
                } else {
                    const errInfo = getErrorContent(ERROR_CODES.SHOPPING_LIST.SAVE_FAILED, error.message);
                    toast({ ...errInfo, variant: "destructive" });
                }
                return;
            }
            toast({ title: "Añadido", description: `${item.name} a la lista de compra.` });
        } catch (e: any) {
            const errInfo = getErrorContent(ERROR_CODES.SHOPPING_LIST.SAVE_FAILED, e.message);
            toast({ ...errInfo, variant: "destructive" });
        }
    };

    // Wrapper para inserción manual que refresca datos
    const handleBatchAddedManual = async () => {
        if (selectedProduct) {
            await inventoryService.cleanupZeroQuantityBatches(selectedProduct.product_id);
        }
        fetchData();
    }

    const allLocations = useMemo(() =>
        Array.from(new Set(rawInventoryItems.map(i => i.location?.trim()).filter(Boolean))).sort()
        , [rawInventoryItems]);

    const getPriorityWeight = (level: string, isGhost: boolean) => {
        if (isGhost) return 4; // Ghost is lowest priority in sorting unless specified otherwise
        if (level === 'critical') return 1;
        if (level === 'high') return 2;
        return 3; // normal
    };

    const sortedAndFilteredProducts = useMemo(() => {
        return groupedInventory
            .filter(item => {
                const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
                const matchesLocation = selectedLocation ? Object.keys(item.locations).some(loc => loc.trim() === selectedLocation) : true;
                const matchesPriority = selectedPriority ? (
                    selectedPriority === 'ghost' ? item.is_ghost :
                        (!item.is_ghost && item.importance_level === selectedPriority)
                ) : true;
                return matchesSearch && matchesCategory && matchesLocation && matchesPriority;
            })
            .sort((a, b) => {
                let comparison = 0;
                switch (sortBy) {
                    case 'name':
                        comparison = a.name.localeCompare(b.name);
                        break;
                    case 'expiry':
                        const dateA = a.earliest_expiry ? new Date(a.earliest_expiry).getTime() : Infinity;
                        const dateB = b.earliest_expiry ? new Date(b.earliest_expiry).getTime() : Infinity;
                        comparison = dateA - dateB;
                        break;
                    case 'priority':
                        comparison = getPriorityWeight(a.importance_level, a.is_ghost) - getPriorityWeight(b.importance_level, b.is_ghost);
                        break;
                    case 'category':
                        const labelA = CATEGORY_CONFIG[a.category as keyof typeof CATEGORY_CONFIG]?.label || '';
                        const labelB = CATEGORY_CONFIG[b.category as keyof typeof CATEGORY_CONFIG]?.label || '';
                        comparison = labelA.localeCompare(labelB);
                        break;
                }
                return sortOrder === 'asc' ? comparison : -comparison;
            });
    }, [groupedInventory, searchTerm, selectedCategory, selectedLocation, selectedPriority, sortBy, sortOrder]);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-[98vw] sm:w-full max-w-3xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl [&>button]:hidden focus:outline-none">

                    <DialogTitle className="sr-only">Gestión de Stock</DialogTitle>
                    <DialogDescription className="sr-only">Inventario</DialogDescription>

                    <div className="p-4 border-b border-zinc-800 bg-zinc-900 shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-500" />
                            <span className="font-bold text-lg">Stock Casa</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => { if (typeof onClose === 'function') onClose(); }} className="h-8 w-8 hover:bg-zinc-800 rounded-full"><X className="w-5 h-5" /></Button>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 w-full">
                        <div className="px-4 pt-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
                            <TabsList className="grid w-full grid-cols-3 bg-zinc-950">
                                <TabsTrigger value="reception">Recepción {receptionItems.length > 0 && <Badge className="ml-2 bg-blue-600 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">{receptionItems.length}</Badge>}</TabsTrigger>
                                <TabsTrigger value="pantry">Despensa</TabsTrigger>
                                <TabsTrigger value="alerts" className="data-[state=active]:text-red-400">Avisos {(criticalAlerts.length + suggestionAlerts.length) > 0 && <Badge className={`ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] ${useLowPerfUI ? 'bg-red-500 border border-red-400' : 'bg-red-600 animate-pulse'}`}>{(criticalAlerts.length + suggestionAlerts.length)}</Badge>}</TabsTrigger>
                            </TabsList>
                        </div>

                        {/* RECEPCIÓN */}
                        <TabsContent value="reception" className="flex-1 flex flex-col min-h-0 m-0 w-full h-full data-[state=inactive]:hidden">
                            {activeTab === 'reception' && (
                                <ScrollArea className="flex-1 w-full p-4">
                                    {isLoading ? <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div> :
                                        receptionItems.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-zinc-500 min-h-[300px]"><CheckCircle2 className="w-12 h-12 mb-3 opacity-20" /><p className="text-sm">Todo colocado.</p></div> :
                                            <div className="space-y-1 pb-4">
                                                {receptionItems.map(item => (
                                                    <ReceptionRow
                                                        key={item.id}
                                                        item={item}
                                                        householdId={householdId}
                                                        onReceive={fetchData}
                                                        storeSuggestions={storeSuggestions}
                                                        locationSuggestions={locationSuggestions}
                                                        existingProductInfo={existingProductsInfo[item.item_name?.toLowerCase()]}
                                                    />
                                                ))}
                                            </div>}
                                </ScrollArea>
                            )}
                        </TabsContent>

                        {/* DESPENSA */}
                        <TabsContent value="pantry" className="flex-1 flex flex-col min-h-0 m-0 w-full h-full data-[state=inactive]:hidden">
                            {activeTab === 'pantry' && (
                                selectedProduct ? (
                                    // VISTA DETALLE
                                    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 animate-in slide-in-from-right-10 w-full h-full">
                                        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex flex-col gap-4 shrink-0">
                                            <div className="flex justify-between items-start">
                                                <Button variant="ghost" onClick={() => setSelectedProduct(null)} className="text-zinc-400 hover:text-white pl-0 gap-1 h-8"><ChevronLeft className="w-4 h-4" /> Volver</Button>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-900/10" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => setShowEditDialog(true)}><Pencil className="w-4 h-4" /></Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="min-w-0 pr-2">
                                                    <h3 className="text-xl font-bold text-white flex items-center gap-2 truncate">{selectedProduct.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={cn("text-2xl font-mono font-bold", selectedProduct.total_quantity === 0 ? "text-red-500" : "text-white")}>{selectedProduct.total_quantity}</span>
                                                        <span className="text-zinc-500">{selectedProduct.unit}</span>
                                                        {selectedProduct.is_ghost && <Badge variant="secondary" className="ml-2 bg-purple-900/20 text-purple-400 border-purple-500/30 text-[10px]">Ghost</Badge>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-800 shrink-0">
                                                    <Input type="number" placeholder="0" className="w-12 h-8 bg-transparent border-none text-right text-white font-bold" value={consumeAmount} onChange={e => setConsumeAmount(e.target.value)} />
                                                    <Button size="sm" variant="destructive" className="h-8 px-3" onClick={handleConsume} disabled={!consumeAmount}><Minus className="w-4 h-4" /></Button>
                                                </div>
                                            </div>
                                        </div>
                                        <ScrollArea className="flex-1 w-full">
                                            <div className="p-4 space-y-4 pb-20">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Desglose de Lotes</h4>
                                                    <Popover open={isMassCustomMode} onOpenChange={setIsMassCustomMode}>
                                                        <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-6 text-[10px] border-blue-900/30 text-blue-400 gap-1"><Layers className="w-3 h-3" /> Mover Todo</Button></PopoverTrigger>
                                                        <PopoverContent className="w-56 p-3 bg-zinc-950 border-zinc-700">
                                                            <div className="space-y-2">
                                                                <p className="text-[10px] text-zinc-400 font-bold uppercase">Mover todo a:</p>
                                                                <LocationAutocomplete value={massCustomLoc} onChange={setMassCustomLoc} householdId={householdId} placeholder="Destino..." />
                                                                <Button size="sm" className="w-full h-7 bg-blue-600" onClick={() => handleMoveAllBatches(massCustomLoc)}>Confirmar</Button>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                                <div className="space-y-2 w-full min-w-0">
                                                    {rawInventoryItems.filter(i => i.product_id === selectedProduct.product_id && i.quantity > 0).sort((a, b) => new Date(a.expiry_date || '9999').getTime() - new Date(b.expiry_date || '9999').getTime()).map(batch => (
                                                        <InventoryBatchRow key={batch.id} batch={batch} unit={selectedProduct.unit} householdId={householdId} onDelete={handleDeleteBatch} onUpdate={handleUpdateBatch} onMove={handleMoveBatch} locationSuggestions={locationSuggestions} />
                                                    ))}
                                                    {rawInventoryItems.every(i => i.product_id === selectedProduct.product_id && i.quantity === 0) && <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg"><p className="text-zinc-500 text-xs">Sin stock físico actualmente.</p></div>}
                                                </div>
                                            </div>
                                        </ScrollArea>
                                        <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0">
                                            <Button className="w-full bg-blue-600 hover:bg-blue-500 shadow-lg" onClick={() => setIsAddBatchOpen(true)}>
                                                <Plus className="w-4 h-4 mr-2" /> Añadir Lote Manual
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    // VISTA LISTA
                                    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 w-full h-full justify-start">
                                        <div className="p-2 border-b border-zinc-800 bg-zinc-900 shrink-0 space-y-2">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                                                <Input placeholder="Buscar producto..." className="pl-9 h-10 bg-zinc-950 border-zinc-800 text-sm focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                            </div>
                                            <div className="flex gap-1.5">
                                                {useLowPerfUI ? (
                                                    <>
                                                        <select
                                                            className="flex-1 h-8 bg-zinc-950 border border-zinc-800 text-[10px] font-bold px-2 rounded text-white appearance-none"
                                                            value={selectedCategory || "all"}
                                                            onChange={(e) => setSelectedCategory(e.target.value === "all" ? null : e.target.value)}
                                                        >
                                                            <option value="all">Clase: Todas</option>
                                                            {Object.entries(CATEGORY_CONFIG).map(([key, conf]) => (
                                                                <option key={key} value={key}>{conf.label}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            className="flex-1 h-8 bg-zinc-950 border border-zinc-800 text-[10px] font-bold px-2 rounded text-white appearance-none"
                                                            value={selectedLocation || "all"}
                                                            onChange={(e) => setSelectedLocation(e.target.value === "all" ? null : e.target.value)}
                                                        >
                                                            <option value="all">Ubicación: Todas</option>
                                                            {allLocations.map(loc => (
                                                                <option key={loc} value={loc}>{loc}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            className="flex-1 h-8 bg-zinc-950 border border-zinc-800 text-[10px] font-bold px-2 rounded text-white appearance-none"
                                                            value={selectedPriority || "all"}
                                                            onChange={(e) => setSelectedPriority(e.target.value === "all" ? null : e.target.value)}
                                                        >
                                                            <option value="all">Prioridad: Todas</option>
                                                            <option value="critical">Vital</option>
                                                            <option value="high">Alta</option>
                                                            <option value="normal">Normal</option>
                                                            <option value="ghost">Puntuales</option>
                                                        </select>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)} modal={false}>
                                                            <SelectTrigger className="flex-1 h-8 bg-zinc-950 border-zinc-800 text-[10px] font-bold px-2">
                                                                <SelectValue placeholder="Clase" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-zinc-950 border-zinc-800" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                                                                <SelectItem value="all" className="text-xs text-white">Todas</SelectItem>
                                                                {Object.entries(CATEGORY_CONFIG).map(([key, conf]) => (
                                                                    <SelectItem key={key} value={key} className="text-xs text-white">{conf.label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Select value={selectedLocation || "all"} onValueChange={(v) => setSelectedLocation(v === "all" ? null : v)} modal={false}>
                                                            <SelectTrigger className="flex-1 h-8 bg-zinc-950 border-zinc-800 text-[10px] font-bold px-2">
                                                                <SelectValue placeholder="Ubicación" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-zinc-950 border-zinc-800" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                                                                <SelectItem value="all" className="text-xs text-white">Todas</SelectItem>
                                                                {allLocations.map(loc => (
                                                                    <SelectItem key={loc} value={loc} className="text-xs text-white">{loc}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Select value={selectedPriority || "all"} onValueChange={(v) => setSelectedPriority(v === "all" ? null : v)} modal={false}>
                                                            <SelectTrigger className="flex-1 h-8 bg-zinc-950 border-zinc-800 text-[10px] font-bold px-2">
                                                                <SelectValue placeholder="Prioridad" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-zinc-950 border-zinc-800" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                                                                <SelectItem value="all" className="text-xs text-white">Todas</SelectItem>
                                                                <SelectItem value="critical" className="text-xs text-white">Vital</SelectItem>
                                                                <SelectItem value="high" className="text-xs text-white">Alta</SelectItem>
                                                                <SelectItem value="normal" className="text-xs text-white">Normal</SelectItem>
                                                                <SelectItem value="ghost" className="text-xs text-white">Puntuales</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex gap-1.5 items-center">
                                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider ml-1">Orden</span>
                                                {useLowPerfUI ? (
                                                    <select
                                                        className="flex-1 h-8 bg-zinc-950 border border-zinc-800 text-[10px] font-bold px-2 rounded text-white appearance-none"
                                                        value={sortBy}
                                                        onChange={(e) => setSortBy(e.target.value as any)}
                                                    >
                                                        <option value="name">Nombre</option>
                                                        <option value="expiry">Caducidad</option>
                                                        <option value="added">Añadido</option>
                                                        <option value="qty">Cantidad</option>
                                                    </select>
                                                ) : (
                                                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)} modal={false}>
                                                        <SelectTrigger className="flex-1 h-8 bg-zinc-950/50 border-zinc-800 text-[10px] font-medium px-2">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-zinc-950 border-zinc-800" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                                                            <SelectItem value="name" className="text-xs text-white">Nombre</SelectItem>
                                                            <SelectItem value="expiry" className="text-xs text-white">Caducidad</SelectItem>
                                                            <SelectItem value="added" className="text-xs text-white">Añadido</SelectItem>
                                                            <SelectItem value="qty" className="text-xs text-white">Cantidad</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                {useLowPerfUI ? (
                                                    <select
                                                        className="h-8 bg-zinc-950 border border-zinc-800 text-[10px] font-bold px-2 rounded text-white appearance-none"
                                                        value={sortOrder}
                                                        onChange={(e) => setSortOrder(e.target.value as any)}
                                                    >
                                                        <option value="asc">Ascendente</option>
                                                        <option value="desc">Descendente</option>
                                                    </select>
                                                ) : (
                                                    <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)} modal={false}>
                                                        <SelectTrigger className="w-24 h-8 bg-zinc-950/50 border-zinc-800 text-[10px] font-medium px-2">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-zinc-950 border-zinc-800" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                                                            <SelectItem value="asc" className="text-xs text-white">Ascendente</SelectItem>
                                                            <SelectItem value="desc" className="text-xs text-white">Descendente</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </div>
                                        </div>
                                        <ScrollArea className="flex-1 w-full">
                                            <div className="p-2 space-y-2 pb-20">
                                                {sortedAndFilteredProducts.map(item => (
                                                    <ProductRow
                                                        key={item.product_id}
                                                        item={item}
                                                        onSelect={setSelectedProduct}
                                                        onAddToShoppingList={handleAddToShoppingList}
                                                        swipingId={swipingId}
                                                        setSwipingId={setSwipingId}
                                                        swipeOffset={swipeOffsets[item.product_id] || 0}
                                                        setSwipeOffset={(id: string, val: number) => setSwipeOffsets(prev => ({ ...prev, [id]: val }))}
                                                        SWIPE_THRESHOLD={SWIPE_THRESHOLD}
                                                        touchStartX={touchStartX}
                                                        isDragging={isDragging}
                                                    />
                                                ))}
                                                {sortedAndFilteredProducts.length === 0 && <div className="text-center py-10 text-zinc-500 text-xs">No hay productos.</div>}
                                            </div>
                                        </ScrollArea>
                                        <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0 mt-auto"><AddItemDialogWrapper householdId={householdId} onItemAdded={fetchData} /></div>
                                    </div>
                                )
                            )}
                        </TabsContent>

                        <TabsContent value="alerts" className="flex-1 flex flex-col min-h-0 m-0 w-full h-full justify-start data-[state=inactive]:hidden">
                            {activeTab === 'alerts' && (
                                <Tabs defaultValue="critical" className="flex-1 flex flex-col min-h-0 w-full h-full">
                                    <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900 shrink-0">
                                        <TabsList className="grid w-full grid-cols-2 h-8 bg-zinc-950">
                                            <TabsTrigger value="critical" className="text-xs data-[state=active]:text-red-400">Críticos ({criticalAlerts.length})</TabsTrigger>
                                            <TabsTrigger value="suggestions" className="text-xs data-[state=active]:text-purple-400">Sugerencias ({suggestionAlerts.length})</TabsTrigger>
                                        </TabsList>
                                    </div>
                                    <ScrollArea className="flex-1 w-full p-4">
                                        <div className="space-y-4 pb-10">
                                            <TabsContent value="critical" className="mt-0 space-y-2 data-[state=inactive]:hidden">
                                                {criticalAlerts.length === 0 && <div className="flex flex-col items-center justify-center h-40 text-zinc-500 gap-2"><CheckCircle2 className="w-8 h-8 opacity-50 text-green-500" /><span className="text-xs">Todo en orden por aquí.</span></div>}
                                                {criticalAlerts.map(item => {
                                                    const critLabel = item.importance_level === 'critical' ? 'VITAL' : item.importance_level === 'high' ? 'ALTA' : 'NORM.';
                                                    const critLabelColor = item.importance_level === 'critical' ? "bg-red-500/20 text-red-400" : item.importance_level === 'high' ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400";
                                                    return (
                                                        <div key={item.product_id} className="bg-red-900/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden">
                                                            <div className={cn("absolute top-0 left-0 px-2 py-0.5 text-[8px] font-black tracking-widest rounded-br-lg", critLabelColor)}>
                                                                {critLabel}
                                                            </div>
                                                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                                            <div className="flex-1 text-center min-w-0 px-2">
                                                                <div className="font-bold text-[13px] text-red-200 truncate">{item.name}</div>
                                                                <div className="text-[11px] text-red-400/90 mt-0.5 font-medium">{item.reason}</div>
                                                            </div>
                                                            <div className="w-5 h-5 shrink-0" />
                                                        </div>
                                                    );
                                                })}
                                            </TabsContent>
                                            <TabsContent value="suggestions" className="mt-0 space-y-2 data-[state=inactive]:hidden">
                                                {suggestionAlerts.length === 0 && <div className="flex flex-col items-center justify-center h-40 text-zinc-500 gap-2"><span className="text-xs">Sin sugerencias.</span></div>}
                                                {suggestionAlerts.map(item => {
                                                    const suggLabel = item.is_ghost ? 'PUNTUAL' :
                                                        item.importance_level === 'critical' ? 'VITAL' :
                                                            item.importance_level === 'high' ? 'ALTA' : 'NORM.';
                                                    const suggLabelColor = item.is_ghost ? "bg-zinc-700/40 text-zinc-500" :
                                                        item.importance_level === 'critical' ? "bg-red-500/20 text-red-400" :
                                                            item.importance_level === 'high' ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400";
                                                    const sid = `sugg_${item.product_id}`;
                                                    const offset = swipeOffsets[sid] || 0;
                                                    return (
                                                        <div key={item.product_id} className={cn("rounded-xl border relative overflow-hidden", item.severity === 'expiry' ? "border-purple-500/30" : "border-blue-500/30")}>
                                                            <div className={cn("absolute inset-0 flex items-center pl-4", offset === 0 ? "invisible" : "visible", offset >= SWIPE_THRESHOLD ? "bg-green-600/25" : "bg-blue-600/15")}>
                                                                <ShoppingCart className={cn("w-5 h-5 transition-all duration-150", offset >= SWIPE_THRESHOLD ? "text-green-400 scale-125" : "text-blue-400 opacity-60")} />
                                                            </div>
                                                            <div
                                                                className="bg-zinc-900/40 p-2.5 flex items-center gap-3 cursor-grab relative select-none"
                                                                style={{ transform: `translateX(${offset}px)`, transition: swipingId === sid ? 'none' : 'transform 0.25s ease' }}
                                                                onTouchStart={(e) => { touchStartX.current[sid] = e.touches[0].clientX; setSwipingId(sid); }}
                                                                onTouchMove={(e) => {
                                                                    const d = e.touches[0].clientX - (touchStartX.current[sid] || 0);
                                                                    if (d > 0) setSwipeOffsets(prev => ({ ...prev, [sid]: Math.min(d, 120) }));
                                                                }}
                                                                onTouchEnd={() => {
                                                                    setSwipingId(null);
                                                                    if ((swipeOffsets[sid] || 0) >= SWIPE_THRESHOLD) handleAddToShoppingList(item);
                                                                    setSwipeOffsets(prev => ({ ...prev, [sid]: 0 }));
                                                                }}
                                                                onMouseDown={(e) => {
                                                                    touchStartX.current[sid] = e.clientX;
                                                                    setSwipingId(sid);
                                                                }}
                                                                onMouseMove={(e) => {
                                                                    if (swipingId !== sid) return;
                                                                    const d = e.clientX - (touchStartX.current[sid] || 0);
                                                                    if (d > 5) {
                                                                        setSwipeOffsets(prev => ({ ...prev, [sid]: Math.min(d, 120) }));
                                                                    }
                                                                }}
                                                                onMouseUp={() => {
                                                                    if (swipingId !== sid) return;
                                                                    setSwipingId(null);
                                                                    if ((swipeOffsets[sid] || 0) >= SWIPE_THRESHOLD) {
                                                                        handleAddToShoppingList(item);
                                                                    }
                                                                    setSwipeOffsets(prev => ({ ...prev, [sid]: 0 }));
                                                                }}
                                                                onMouseLeave={() => {
                                                                    if (swipingId !== sid) return;
                                                                    setSwipingId(null);
                                                                    setSwipeOffsets(prev => ({ ...prev, [sid]: 0 }));
                                                                }}
                                                            >
                                                                <div className={cn("absolute top-0 left-0 px-2 py-0.5 text-[8px] font-black tracking-widest rounded-br-lg", suggLabelColor)}>
                                                                    {suggLabel}
                                                                </div>
                                                                <div className="flex-1 min-w-0 px-2 py-0.5 mt-2">
                                                                    <div className="font-bold text-[13px] text-zinc-100 truncate">{item.name}</div>
                                                                    <div className="text-[11px] text-zinc-400 mt-0.5">{item.reason}</div>
                                                                </div>
                                                                <div className="shrink-0 flex items-center gap-2">
                                                                    <div className="font-mono font-bold text-[13px] text-zinc-300 bg-zinc-800/50 px-2 py-1 rounded-md">
                                                                        {item.total_quantity} <span className="text-[9px] opacity-60">{item.unit}</span>
                                                                    </div>
                                                                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </TabsContent>
                                        </div>
                                    </ScrollArea>
                                </Tabs>
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            <EditProductDialog product={selectedProduct} isOpen={showEditDialog} onOpenChange={setShowEditDialog} onUpdated={fetchData} />
            {selectedProduct && <AddBatchDialog product={selectedProduct} isOpen={isAddBatchOpen} onOpenChange={setIsAddBatchOpen} onBatchAdded={handleBatchAddedManual} householdId={householdId} />}

            {/* DIÁLOGO CONFIRMACIÓN BORRAR */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="bg-zinc-950 border-red-900/50 text-white w-[90%] max-w-sm rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-red-500 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> ¿Eliminar Producto?</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Estás a punto de borrar <b>"{selectedProduct?.name}"</b> y todo su historial de stock. Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 justify-end mt-2">
                        <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={confirmDeleteProduct}>Sí, Eliminar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

const AddItemDialogWrapper = ({ householdId, onItemAdded }: { householdId: string, onItemAdded: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <>
            <Button className="w-full bg-blue-600 hover:bg-blue-500 shadow-lg" onClick={() => setIsOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
            </Button>
            <AddItemDialog isOpen={isOpen} onOpenChange={setIsOpen} householdId={householdId} onItemAdded={onItemAdded} />
        </>
    );
};