import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import {
    Package, Search, AlertTriangle, ShoppingCart,
    Plus, Loader2, X, CheckCircle2,
    ChevronRight, Layers
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
import { cn } from '@/lib/utils';
import { ERROR_CODES, getErrorContent } from '@/lib/constants/errors';

// Componentes Modulares
import { ReceptionRow } from '@/components/stock/ReceptionRow';
import { InventoryBatchRow } from '@/components/stock/InventoryBatchRow';
import { EditProductDialog } from '@/components/stock/EditProductDialog';
import { ProductSwipeRow } from '@/components/stock/ProductSwipeRow';
import AddItemDialog from './AddItemDialog';
import AddBatchDialog from './AddBatchDialog';
import { LocationAutocomplete } from './LocationAutocomplete';
import { usePerformanceSettings } from '@/hooks/usePerformanceSettings';
import { useInventoryData } from '@/hooks/useInventoryData.hook';

// Configuración
import { InventoryItem } from '@/lib/types';

interface StockModalProps {
    isOpen: boolean;
    onClose: () => void;
    householdId: string;
}

export const StockModal: React.FC<StockModalProps> = ({ isOpen, onClose, householdId }) => {
    const { toast } = useToast();
    const { useLowPerfUI, isMobile } = usePerformanceSettings();

    // --- HOOK DE DATOS MODULAR ---
    const {
        isLoading,
        receptionItems,
        groupedInventory,
        rawInventoryItems,
        criticalAlerts,
        suggestionAlerts,
        storeSuggestions,
        locationSuggestions,
        fetchData
    } = useInventoryData(householdId);

    // --- ESTADOS LOCALES DE UI ---
    const [activeTab, setActiveTab] = useState('reception');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    // Sorting State
    const [sortBy, setSortBy] = useState<'name' | 'expiry' | 'priority' | 'category'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Swipe-to-add
    const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});
    const [swipingId, setSwipingId] = useState<string | null>(null);
    const SWIPE_THRESHOLD = 80;

    // Modales
    const [consumeAmount, setConsumeAmount] = useState('');
    const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Mover Todo
    const [isMassCustomMode, setIsMassCustomMode] = useState(false);
    const [massCustomLoc, setMassCustomLoc] = useState('');

    useEffect(() => {
        if (isOpen) {
            const t = setTimeout(() => fetchData(), 250);
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
                selectedProduct.product_id, qty, selectedProduct.is_ghost, rawInventoryItems
            );
            if (productDeleted) setSelectedProduct(null);
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
                .from('inventory_items').select('id, quantity').eq('product_id', selectedProduct.product_id);
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
                .from('inventory_items').select('id, quantity').eq('product_id', selectedProduct.product_id);
            if (!remainingBatches || remainingBatches?.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0) <= 0) {
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

    const handleBatchAddedManual = async () => {
        if (selectedProduct) await inventoryService.cleanupZeroQuantityBatches(selectedProduct.product_id);
        fetchData();
    };

    // --- FILTRADO Y ÚLTIMO PROCESO DE UI ---
    const filteredProducts = useMemo(() => {
        let result = [...groupedInventory];
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            result = result.filter(p => p.name.toLowerCase().includes(s) || Object.keys(p.locations).some(l => l.toLowerCase().includes(s)));
        }
        if (selectedCategory) result = result.filter(p => p.category === selectedCategory);
        if (selectedLocation) result = result.filter(p => p.locations[selectedLocation]);
        if (selectedPriority) result = result.filter(p => p.importance_level === selectedPriority);

        result.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
            else if (sortBy === 'expiry') {
                const dateA = a.earliest_expiry ? new Date(a.earliest_expiry).getTime() : Infinity;
                const dateB = b.earliest_expiry ? new Date(b.earliest_expiry).getTime() : Infinity;
                comparison = dateA - dateB;
            } else if (sortBy === 'priority') {
                const weights: any = { critical: 4, high: 3, normal: 2, low: 1 };
                comparison = (weights[b.importance_level] || 0) - (weights[a.importance_level] || 0);
            } else if (sortBy === 'category') comparison = a.category.localeCompare(b.category);
            return sortOrder === 'asc' ? comparison : -comparison;
        });
        return result;
    }, [groupedInventory, searchTerm, selectedCategory, selectedLocation, selectedPriority, sortBy, sortOrder]);

    const setSwipeOffset = useCallback((id: string, offset: number) => {
        setSwipeOffsets(prev => ({ ...prev, [id]: offset }));
    }, []);

    const allLocations = useMemo(() =>
        Array.from(new Set(rawInventoryItems.map(i => i.location?.trim()).filter(Boolean))).sort()
    , [rawInventoryItems]);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-full max-w-lg h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl [&>button]:hidden">
                    <DialogHeader className="sr-only"><DialogTitle>Control de Stock</DialogTitle><DialogDescription>Gestionar inventario</DialogDescription></DialogHeader>

                    {/* HEADER */}
                    <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg"><Package className="w-5 h-5 text-blue-500" /></div>
                            <div><div className="text-lg font-bold leading-none">Despensa</div><div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">Control de Existencias</div></div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-zinc-800 rounded-full"><X className="w-5 h-5" /></Button>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/30 shrink-0">
                            <TabsList className="grid w-full grid-cols-3 h-9 bg-zinc-950/50 p-1">
                                <TabsTrigger value="reception" className="text-xs data-[state=active]:bg-zinc-800">Recepción ({receptionItems.length})</TabsTrigger>
                                <TabsTrigger value="pantry" className="text-xs data-[state=active]:bg-zinc-800">Inventario ({groupedInventory.length})</TabsTrigger>
                                <TabsTrigger value="alerts" className="text-xs data-[state=active]:bg-zinc-800 relative">
                                    Avisos 
                                    {(criticalAlerts.length > 0) && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* CONTENIDOS */}
                        <TabsContent value="reception" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
                            <ScrollArea className="h-full p-4">
                                <div className="space-y-3 pb-10">
                                    {receptionItems.length === 0 && <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4"><div className="p-4 bg-zinc-900 rounded-full"><Package className="w-8 h-8 opacity-20" /></div><div className="text-center"><p className="text-sm font-medium italic">No hay productos pendientes.</p><p className="text-xs opacity-60 mt-1">Usa la lista de compra para reponer.</p></div></div>}
                                    {receptionItems.map(item => <ReceptionRow key={item.id} item={item} householdId={householdId} onProcessed={fetchData} locationSuggestions={locationSuggestions} storeSuggestions={storeSuggestions} existingProduct={groupedInventory.find(p => p.name.toLowerCase() === item.item_name.toLowerCase())} />)}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="pantry" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=inactive]:hidden">
                            <div className="p-4 space-y-3 bg-zinc-900/20 border-b border-zinc-800 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                                    <Input placeholder="Buscar por nombre o ubicación..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 bg-zinc-950 border-zinc-800 text-sm focus:ring-blue-500/20" />
                                </div>
                                <div className="flex gap-2 items-center justify-between">
                                    <AddItemDialogWrapper householdId={householdId} onItemAdded={fetchData} />
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="h-8 w-8 p-0 bg-zinc-950 border-zinc-800"><Layers className={cn("w-4 h-4 transition-transform", sortOrder === 'desc' && "rotate-180")} /></Button>
                                    </div>
                                </div>
                            </div>
                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-2 pb-10">
                                    {filteredProducts.map(item => (
                                        <ProductSwipeRow key={item.product_id} item={item} onSelect={setSelectedProduct} onAddToShoppingList={handleAddToShoppingList} swipingId={swipingId} setSwipingId={setSwipingId} swipeOffset={swipeOffsets[item.product_id] || 0} setSwipeOffset={setSwipeOffset} SWIPE_THRESHOLD={SWIPE_THRESHOLD} />
                                    ))}
                                    {filteredProducts.length === 0 && <div className="text-center py-10 text-zinc-600 text-sm italic">No se encontraron productos.</div>}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="alerts" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=inactive]:hidden">
                            <Tabs defaultValue="critical" className="h-full flex flex-col">
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
                                                <div key={item.product_id} className="bg-red-900/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden">
                                                    <div className={cn("absolute top-0 left-0 px-2 py-0.5 text-[8px] font-black tracking-widest rounded-br-lg", item.importance_level === 'critical' ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400")}>{item.importance_level.toUpperCase()}</div>
                                                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                                    <div className="flex-1 text-center min-w-0 px-2"><div className="font-bold text-[13px] text-red-200 truncate">{item.name}</div><div className="text-[11px] text-red-400/90 mt-0.5 font-medium">{item.reason}</div></div>
                                                    <div className="w-5 h-5 shrink-0" />
                                                </div>
                                            ))}
                                        </TabsContent>
                                        <TabsContent value="suggestions" className="mt-0 space-y-2 data-[state=inactive]:hidden">
                                            {suggestionAlerts.length === 0 && <div className="flex flex-col items-center justify-center h-40 text-zinc-500 gap-2"><span className="text-xs">Sin sugerencias.</span></div>}
                                            {suggestionAlerts.map(item => {
                                                const sid = `sugg_${item.product_id}`;
                                                return <ProductSwipeRow key={sid} item={item} onSelect={setSelectedProduct} onAddToShoppingList={handleAddToShoppingList} swipingId={swipingId} setSwipingId={setSwipingId} swipeOffset={swipeOffsets[sid] || 0} setSwipeOffset={setSwipeOffset} SWIPE_THRESHOLD={SWIPE_THRESHOLD} />;
                                            })}
                                        </TabsContent>
                                    </div>
                                </ScrollArea>
                            </Tabs>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            <EditProductDialog product={selectedProduct} isOpen={showEditDialog} onOpenChange={setShowEditDialog} onUpdated={fetchData} />
            {selectedProduct && <AddBatchDialog product={selectedProduct} isOpen={isAddBatchOpen} onOpenChange={setIsAddBatchOpen} onBatchAdded={handleBatchAddedManual} householdId={householdId} />}

            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="bg-zinc-950 border-red-900/50 text-white w-[90%] max-w-sm rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-red-500 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> ¿Eliminar Producto?</DialogTitle>
                        <DialogDescription className="text-zinc-400">Estás a punto de borrar <b>"{selectedProduct?.name}"</b> y todo su historial de stock. Esta acción no se puede deshacer.</DialogDescription>
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
            <Button className="w-full bg-blue-600 hover:bg-blue-500 shadow-lg" onClick={() => setIsOpen(true)}><Plus className="w-4 h-4 mr-2" /> Nuevo Producto</Button>
            <AddItemDialog isOpen={isOpen} onOpenChange={setIsOpen} householdId={householdId} onItemAdded={onItemAdded} />
        </>
    );
};