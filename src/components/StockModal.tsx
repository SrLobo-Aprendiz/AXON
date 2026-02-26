import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import {
    Package, Search, AlertTriangle, ShoppingCart,
    Pencil, Plus, Loader2, X, CheckCircle2,
    Ghost, Skull, Info, ChevronRight, Minus, Layers, Check, ChevronLeft, Trash2
} from 'lucide-react';
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

// Componentes Modulares
import { ReceptionRow } from '@/components/stock/ReceptionRow';
import { InventoryBatchRow } from '@/components/stock/InventoryBatchRow';
import { EditProductDialog } from '@/components/stock/EditProductDialog';
import AddItemDialog from './AddItemDialog';
import AddBatchDialog from './AddBatchDialog';
import { LocationAutocomplete } from './LocationAutocomplete';

// Configuración
import { CATEGORY_CONFIG, InventoryItem } from '@/lib/types';

interface StockModalProps {
    isOpen: boolean;
    onClose: () => void;
    householdId: string;
}

export const StockModal: React.FC<StockModalProps> = ({ isOpen, onClose, householdId }) => {
    const { toast } = useToast();

    // --- ESTADOS ---
    const [activeTab, setActiveTab] = useState('reception');
    const [isLoading, setIsLoading] = useState(false);

    // Datos
    const [receptionItems, setReceptionItems] = useState<any[]>([]);
    const [groupedInventory, setGroupedInventory] = useState<any[]>([]);
    const [rawInventoryItems, setRawInventoryItems] = useState<InventoryItem[]>([]);
    const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
    const [suggestionAlerts, setSuggestionAlerts] = useState<any[]>([]);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    // Sorting State
    const [sortBy, setSortBy] = useState<'name' | 'expiry' | 'priority' | 'category'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
            const { data: receptionData } = await supabase
                .from('shopping_list')
                .select('*')
                .eq('household_id', householdId)
                .eq('status', 'bought')
                .order('created_at', { ascending: false });

            if (receptionData) setReceptionItems(receptionData);

            const { data: inventoryData } = await supabase
                .from('inventory_items')
                .select('*, product:product_definitions(*)')
                .eq('household_id', householdId)
                .order('expiry_date', { ascending: true });

            if (inventoryData) {
                setRawInventoryItems(inventoryData as InventoryItem[]);
                processInventory(inventoryData);
            }
        } catch (err) {
            console.error("Error fetching stock:", err);
        } finally {
            setIsLoading(false);
        }
    }, [householdId]);

    useEffect(() => {
        if (isOpen) fetchData();
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
            const { error } = await supabase.from('product_definitions').delete().eq('id', selectedProduct.product_id);
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
            let remaining = qty;
            const batches = rawInventoryItems
                .filter(i => i.product_id === selectedProduct.product_id && i.quantity > 0)
                .sort((a, b) => new Date(a.expiry_date || '9999').getTime() - new Date(b.expiry_date || '9999').getTime());

            for (const batch of batches) {
                if (remaining <= 0) break;
                if (batch.quantity > remaining) {
                    await supabase.from('inventory_items').update({ quantity: batch.quantity - remaining } as any).eq('id', batch.id);
                    remaining = 0;
                } else {
                    remaining -= batch.quantity;
                    if (selectedProduct.is_ghost) {
                        await supabase.from('inventory_items').delete().eq('id', batch.id);
                    } else {
                        await supabase.from('inventory_items').update({ quantity: 0, expiry_date: null } as any).eq('id', batch.id);
                    }
                }
            }

            // --- FIX: Borrar producto ghost si ya no queda nada de nada ---
            if (selectedProduct.is_ghost) {
                const { data: remainingBatches } = await supabase
                    .from('inventory_items')
                    .select('id, quantity')
                    .eq('product_id', selectedProduct.product_id);

                const totalRemaining = remainingBatches?.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0) || 0;

                if (totalRemaining <= 0) {
                    await supabase.from('product_definitions').delete().eq('id', selectedProduct.product_id);
                    setSelectedProduct(null);
                }
            }

            toast({ title: "Consumido", description: `${qty} ${selectedProduct.unit} gastados.` });
            setConsumeAmount('');
            fetchData();
        } catch (e: any) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleDeleteBatch = async (batchId: string) => {
        await supabase.from('inventory_items').delete().eq('id', batchId);

        // --- FIX: Borrar producto ghost si era el último lote ---
        if (selectedProduct?.is_ghost) {
            const { data: remainingBatches } = await supabase
                .from('inventory_items')
                .select('id, quantity')
                .eq('product_id', selectedProduct.product_id);

            if (!remainingBatches || remainingBatches.length === 0) {
                await supabase.from('product_definitions').delete().eq('id', selectedProduct.product_id);
                setSelectedProduct(null);
            }
        }
        fetchData();
    };

    const handleUpdateBatch = async (batchId: string, updates: Partial<InventoryItem>) => {
        await supabase.from('inventory_items').update(updates as any).eq('id', batchId);

        // --- FIX: Borrar producto ghost si la cantidad se puso a 0 y es ghost ---
        if (selectedProduct?.is_ghost && updates.quantity !== undefined && Number(updates.quantity) <= 0) {
            await supabase.from('inventory_items').delete().eq('id', batchId);

            const { data: remainingBatches } = await supabase
                .from('inventory_items')
                .select('id, quantity')
                .eq('product_id', selectedProduct.product_id);

            const totalRemaining = remainingBatches?.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0) || 0;

            if (totalRemaining <= 0) {
                await supabase.from('product_definitions').delete().eq('id', selectedProduct.product_id);
                setSelectedProduct(null);
            }
        }
        fetchData();
    };

    const handleMoveBatch = async (batch: InventoryItem, newLoc: string, qty: number, dates?: { origin: Date | undefined, dest: Date | undefined }) => {
        try {
            const originDate = dates?.origin ? format(dates.origin, 'yyyy-MM-dd') : batch.expiry_date;
            const destDate = dates?.dest ? format(dates.dest, 'yyyy-MM-dd') : batch.expiry_date;

            if (qty >= batch.quantity) {
                await supabase.from('inventory_items').update({ location: newLoc, expiry_date: destDate } as any).eq('id', batch.id);
            } else {
                await supabase.from('inventory_items').update({ quantity: batch.quantity - qty, expiry_date: originDate } as any).eq('id', batch.id);
                await supabase.from('inventory_items').insert({
                    household_id: batch.household_id,
                    product_id: batch.product_id,
                    name: batch.name,
                    category: batch.category,
                    unit: batch.unit,
                    quantity: qty,
                    location: newLoc,
                    expiry_date: destDate
                });
            }
            toast({ title: "Movido", description: `${qty} ${batch.unit} a ${newLoc}.` });
            fetchData();
        } catch (e: any) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleMoveAllBatches = async (destination: string) => {
        if (!selectedProduct) return;
        const batches = rawInventoryItems.filter(i => i.product_id === selectedProduct.product_id && i.quantity > 0);
        for (const batch of batches) {
            await supabase.from('inventory_items').update({ location: destination } as any).eq('id', batch.id);
        }
        toast({ title: "Movido", description: `Todo el stock a ${destination}.` });
        fetchData();
        setIsMassCustomMode(false);
        setMassCustomLoc('');
    };

    const handleAddToShoppingList = async (item: any) => {
        try {
            await supabase.from('shopping_list').insert({
                household_id: householdId,
                item_name: item.name,
                category: item.category,
                priority: item.importance_level,
                status: 'active',
                quantity: 1,
                is_manual: true
            });
            toast({ title: "Añadido", description: `${item.name} a la lista de compra.` });
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    // Wrapper para inserción manual que refresca datos
    const handleBatchAddedManual = async () => {
        if (selectedProduct) {
            await supabase.from('inventory_items').delete().eq('product_id', selectedProduct.product_id).eq('quantity', 0);
        }
        fetchData();
    }

    const allLocations = Array.from(new Set(rawInventoryItems.map(i => i.location).filter(Boolean)));

    const getPriorityWeight = (level: string, isGhost: boolean) => {
        if (isGhost) return 4; // Ghost is lowest priority in sorting unless specified otherwise
        if (level === 'critical') return 1;
        if (level === 'high') return 2;
        return 3; // normal
    };

    const sortedAndFilteredProducts = groupedInventory
        .filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
            const matchesLocation = selectedLocation ? Object.keys(item.locations).includes(selectedLocation) : true;
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

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-[95vw] sm:w-full max-w-3xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl [&>button]:hidden">

                    <DialogTitle className="sr-only">Gestión de Stock</DialogTitle>
                    <DialogDescription className="sr-only">Inventario</DialogDescription>

                    <div className="p-4 border-b border-zinc-800 bg-zinc-900 shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-500" />
                            <span className="font-bold text-lg">Stock Casa</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-zinc-800 rounded-full"><X className="w-5 h-5" /></Button>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 w-full">
                        <div className="px-4 pt-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
                            <TabsList className="grid w-full grid-cols-3 bg-zinc-950">
                                <TabsTrigger value="reception">Recepción {receptionItems.length > 0 && <Badge className="ml-2 bg-blue-600 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">{receptionItems.length}</Badge>}</TabsTrigger>
                                <TabsTrigger value="pantry">Despensa</TabsTrigger>
                                <TabsTrigger value="alerts" className="data-[state=active]:text-red-400">Avisos {(criticalAlerts.length + suggestionAlerts.length) > 0 && <Badge className="ml-2 bg-red-600 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] animate-pulse">{(criticalAlerts.length + suggestionAlerts.length)}</Badge>}</TabsTrigger>
                            </TabsList>
                        </div>

                        {/* RECEPCIÓN */}
                        <TabsContent value="reception" className="flex-1 flex flex-col min-h-0 m-0 w-full h-full data-[state=inactive]:hidden">
                            <ScrollArea className="flex-1 w-full p-4">
                                {isLoading ? <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div> :
                                    receptionItems.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-zinc-500 min-h-[300px]"><CheckCircle2 className="w-12 h-12 mb-3 opacity-20" /><p className="text-sm">Todo colocado.</p></div> :
                                        <div className="space-y-1 pb-4">{receptionItems.map(item => (<ReceptionRow key={item.id} item={item} householdId={householdId} onReceive={fetchData} />))}</div>}
                            </ScrollArea>
                        </TabsContent>

                        {/* DESPENSA */}
                        <TabsContent value="pantry" className="flex-1 flex flex-col min-h-0 m-0 w-full h-full data-[state=inactive]:hidden">
                            {selectedProduct ? (
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
                                            <div>
                                                <h3 className="text-xl font-bold text-white flex items-center gap-2">{selectedProduct.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={cn("text-2xl font-mono font-bold", selectedProduct.total_quantity === 0 ? "text-red-500" : "text-white")}>{selectedProduct.total_quantity}</span>
                                                    <span className="text-zinc-500">{selectedProduct.unit}</span>
                                                    {selectedProduct.is_ghost && <Badge variant="secondary" className="ml-2 bg-purple-900/20 text-purple-400 border-purple-500/30 text-[10px]">Ghost</Badge>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-800">
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
                                            <div className="space-y-2">
                                                {rawInventoryItems.filter(i => i.product_id === selectedProduct.product_id && i.quantity > 0).sort((a, b) => new Date(a.expiry_date || '9999').getTime() - new Date(b.expiry_date || '9999').getTime()).map(batch => (
                                                    <InventoryBatchRow key={batch.id} batch={batch} unit={selectedProduct.unit} householdId={householdId} onDelete={handleDeleteBatch} onUpdate={handleUpdateBatch} onMove={handleMoveBatch} />
                                                ))}
                                                {rawInventoryItems.every(i => i.product_id === selectedProduct.product_id && i.quantity === 0) && <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg"><p className="text-zinc-500 text-xs">Sin stock físico actualmente.</p></div>}
                                            </div>
                                        </div>
                                    </ScrollArea>

                                    {/* AQUI ESTÁ EL BOTÓN CORRECTO: Añadir Lote Manual */}
                                    <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0">
                                        <Button className="w-full bg-blue-600 hover:bg-blue-500 shadow-lg" onClick={() => setIsAddBatchOpen(true)}>
                                            <Plus className="w-4 h-4 mr-2" /> Añadir Lote Manual
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                // VISTA LISTA (Botón Nuevo Producto)
                                <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 w-full h-full justify-start">
                                    <div className="p-3 border-b border-zinc-800 bg-zinc-900 shrink-0 space-y-3">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                                            <Input placeholder="Buscar producto..." className="pl-9 h-10 bg-zinc-950 border-zinc-800 text-sm focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                        </div>
                                        <div className="flex gap-2">
                                            <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}>
                                                <SelectTrigger className="flex-1 h-9 bg-zinc-950 border-zinc-800 text-xs font-bold">
                                                    <SelectValue placeholder="Clase" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-zinc-800">
                                                    <SelectItem value="all" className="text-xs text-white">Todas las Clases</SelectItem>
                                                    {Object.entries(CATEGORY_CONFIG).map(([key, conf]) => (
                                                        <SelectItem key={key} value={key} className="text-xs text-white">{conf.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Select value={selectedLocation || "all"} onValueChange={(v) => setSelectedLocation(v === "all" ? null : v)}>
                                                <SelectTrigger className="flex-1 h-9 bg-zinc-950 border-zinc-800 text-xs font-bold">
                                                    <SelectValue placeholder="Ubicación" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-zinc-800">
                                                    <SelectItem value="all" className="text-xs text-white">Todas las Ubicaciones</SelectItem>
                                                    {allLocations.sort().map(loc => (
                                                        <SelectItem key={loc} value={loc} className="text-xs text-white">{loc}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Select value={selectedPriority || "all"} onValueChange={(v) => setSelectedPriority(v === "all" ? null : v)}>
                                                <SelectTrigger className="flex-1 h-9 bg-zinc-950 border-zinc-800 text-xs font-bold">
                                                    <SelectValue placeholder="Prioridad" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-zinc-800">
                                                    <SelectItem value="all" className="text-xs text-white">Todas las Prioridades</SelectItem>
                                                    <SelectItem value="critical" className="text-xs text-white">Vital</SelectItem>
                                                    <SelectItem value="high" className="text-xs text-white">Alta</SelectItem>
                                                    <SelectItem value="normal" className="text-xs text-white">Normal</SelectItem>
                                                    <SelectItem value="ghost" className="text-xs text-white">Puntuales (Ghost)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Ordenar por</span>
                                            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                                                <SelectTrigger className="flex-1 h-8 bg-zinc-950/50 border-zinc-800 text-[11px] font-medium">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-zinc-800">
                                                    <SelectItem value="name" className="text-xs text-white">Nombre</SelectItem>
                                                    <SelectItem value="expiry" className="text-xs text-white">Caducidad</SelectItem>
                                                    <SelectItem value="priority" className="text-xs text-white">Prioridad</SelectItem>
                                                    <SelectItem value="category" className="text-xs text-white">Clase</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                                                <SelectTrigger className="w-28 h-8 bg-zinc-950/50 border-zinc-800 text-[11px] font-medium">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-zinc-800">
                                                    <SelectItem value="asc" className="text-xs text-white">Ascendente</SelectItem>
                                                    <SelectItem value="desc" className="text-xs text-white">Descendente</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <ScrollArea className="flex-1 w-full">
                                        <div className="p-3 space-y-2 pb-20">
                                            {sortedAndFilteredProducts.map(item => {
                                                const catConf = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.Pantry;
                                                const Icon = catConf.icon;
                                                const priorityColor = item.importance_level === 'critical' ? "border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.1)]" :
                                                    item.importance_level === 'high' ? "border-orange-500/50 shadow-[0_0_8px_rgba(249,115,22,0.1)]" :
                                                        "border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.1)]";
                                                const priorityText = item.importance_level === 'critical' ? 'VITAL' : item.importance_level === 'high' ? 'ALTA' : 'NORM.';
                                                const priorityTextColor = item.importance_level === 'critical' ? "text-red-400" : item.importance_level === 'high' ? "text-orange-400" : "text-blue-400";

                                                return (
                                                    <div key={item.product_id} onClick={() => setSelectedProduct(item)}
                                                        className={cn(
                                                            "rounded-xl border bg-zinc-900/40 p-3.5 flex items-center gap-3 transition-all hover:bg-zinc-900/60 cursor-pointer group/row relative overflow-hidden",
                                                            priorityColor
                                                        )}>
                                                        {/* Priority Label in Top-Right Corner */}
                                                        <div className={cn("absolute top-0 right-0 px-2 py-0.5 text-[9px] font-black tracking-tighter bg-zinc-800/80 rounded-bl-lg shadow-sm z-10", priorityTextColor)}>
                                                            {priorityText}
                                                        </div>

                                                        {/* Icon Group (Class + Add) */}
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-800/60", catConf.color)}>
                                                                <Icon className="w-3.5 h-3.5" />
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                className="h-8 w-11 px-0 shrink-0 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 active:scale-95 transition-all duration-200 rounded-lg flex items-center justify-center gap-0.5 relative overflow-hidden group/cart"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAddToShoppingList(item);
                                                                }}
                                                            >
                                                                <Plus className="w-3 h-3" strokeWidth={3} />
                                                                <ShoppingCart className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>

                                                        {/* Main Content (Name + Metadata) */}
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <div className="font-bold text-[14px] text-zinc-100 leading-tight mb-1 truncate">
                                                                {item.name}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-[12.5px]">
                                                                <div className="flex items-center gap-1.5 text-zinc-400 font-medium whitespace-nowrap">
                                                                    <Layers className="w-3.5 h-3.5 text-zinc-500" />
                                                                    <span>{item.batches.length} {item.batches.length === 1 ? 'lote' : 'lotes'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-zinc-500 italic truncate opacity-80">
                                                                    • {Object.keys(item.locations).join(', ')}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Right Side Info (Quantity) */}
                                                        <div className="shrink-0 flex items-center gap-2 mr-1">
                                                            <div className="flex flex-col items-end">
                                                                <div className={cn(
                                                                    "font-mono font-bold text-[15px] px-2 py-0.5 rounded-md",
                                                                    item.total_quantity === 0 ? "text-red-400 bg-red-400/10" : "text-zinc-100 bg-zinc-800/50"
                                                                )}>
                                                                    {item.total_quantity} <span className="text-[10px] opacity-70 ml-0.5">{item.unit}</span>
                                                                </div>
                                                                {item.earliest_expiry && (
                                                                    <div className={cn(
                                                                        "flex items-center gap-1 text-[11px] font-medium mt-1.5",
                                                                        differenceInDays(new Date(item.earliest_expiry), new Date()) < 7 ? "text-purple-400" : "text-emerald-500"
                                                                    )}>
                                                                        <AlertTriangle className="w-3 h-3" />
                                                                        {format(new Date(item.earliest_expiry), 'dd/MM/yy')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <ChevronRight className="w-3.5 h-3.5 text-zinc-700 opacity-50 transition-transform group-hover/row:translate-x-0.5" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {sortedAndFilteredProducts.length === 0 && <div className="text-center py-10 text-zinc-500 text-xs">No hay productos.</div>}
                                        </div>
                                    </ScrollArea>
                                    <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0 mt-auto"><AddItemDialogWrapper householdId={householdId} onItemAdded={fetchData} /></div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="alerts" className="flex-1 flex flex-col min-h-0 m-0 w-full h-full justify-start data-[state=inactive]:hidden">
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
                                            {criticalAlerts.map(item => (
                                                <div key={item.product_id} className="bg-red-900/10 border border-red-500/30 rounded-xl p-3.5 flex items-center gap-3 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 px-2 py-0.5 text-[8px] font-black tracking-widest bg-red-500/20 text-red-400 rounded-bl-lg">
                                                        VITAL
                                                    </div>
                                                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                                    <div className="flex-1 text-center min-w-0 px-4">
                                                        <div className="font-bold text-sm text-red-200 truncate">{item.name}</div>
                                                        <div className="text-[12.5px] text-red-400/90 mt-0.5 font-medium">{item.reason}</div>
                                                    </div>
                                                    {/* Espaciador para centrado perfecto */}
                                                    <div className="w-5 h-5 shrink-0" />
                                                </div>
                                            ))}
                                        </TabsContent>
                                        <TabsContent value="suggestions" className="mt-0 space-y-2 data-[state=inactive]:hidden">
                                            {suggestionAlerts.length === 0 && <div className="flex flex-col items-center justify-center h-40 text-zinc-500 gap-2"><span className="text-xs">Sin sugerencias.</span></div>}
                                            {suggestionAlerts.map(item => (
                                                <div key={item.product_id} className={cn(
                                                    "bg-zinc-900/40 border rounded-xl p-3.5 flex items-center gap-3 transition-all hover:bg-zinc-900/60 relative overflow-hidden",
                                                    item.severity === 'expiry' ? "border-purple-500/30" : "border-blue-500/30"
                                                )}>
                                                    {/* Priority Label */}
                                                    <div className={cn(
                                                        "absolute top-0 right-0 px-2 py-0.5 text-[9px] font-black tracking-tighter rounded-bl-lg",
                                                        item.severity === 'expiry' ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                                                    )}>
                                                        {item.severity === 'expiry' ? 'CADUC.' : 'OPC.'}
                                                    </div>
                                                    {/* Icon Group (Indicator + Add) */}
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <div className={cn(
                                                            "w-7 h-7 rounded-lg flex items-center justify-center",
                                                            item.severity === 'expiry' ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"
                                                        )}>
                                                            {item.severity === 'expiry' ? <Skull className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            className="h-8 w-11 px-0 shrink-0 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 active:scale-95 transition-all duration-200 rounded-lg flex items-center justify-center gap-0.5"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAddToShoppingList(item);
                                                            }}
                                                        >
                                                            <Plus className="w-3 h-3" strokeWidth={3} />
                                                            <ShoppingCart className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>

                                                    {/* Centered Name / Reason */}
                                                    <div className="flex-1 text-center min-w-0 px-2">
                                                        <div className={cn("font-bold text-sm truncate", item.severity === 'expiry' ? "text-purple-200" : "text-blue-200")}>
                                                            {item.name}
                                                        </div>
                                                        <div className={cn("text-[12.5px] font-medium opacity-90 mt-0.5", item.severity === 'expiry' ? "text-purple-400" : "text-blue-400")}>
                                                            {item.reason}
                                                        </div>
                                                    </div>

                                                    {/* Espaciador para equilibrar la izquierda (~64px) */}
                                                    <div className="w-[64px] shrink-0" />
                                                </div>
                                            ))}
                                        </TabsContent>
                                    </div>
                                </ScrollArea>
                            </Tabs>
                        </TabsContent>
                    </Tabs >
                </DialogContent >
            </Dialog >

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