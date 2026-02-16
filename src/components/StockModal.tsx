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
  const [selectedProduct, setSelectedProduct] = useState<any>(null); 
  
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
                batches: []
            });
        }
        const group = groupedMap.get(key)!;
        
        group.total_quantity += item.quantity;
        
        if (item.quantity > 0) {
            group.batch_count += 1;
            group.batches.push(item);
            
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
    setGroupedInventory(Array.from(groupedMap.values()).sort((a,b) => a.name.localeCompare(b.name)));
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
            .sort((a,b) => new Date(a.expiry_date || '9999').getTime() - new Date(b.expiry_date || '9999').getTime());

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
        toast({ title: "Consumido", description: `${qty} ${selectedProduct.unit} gastados.` });
        setConsumeAmount('');
        fetchData();
    } catch (e: any) {
        toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
      await supabase.from('inventory_items').delete().eq('id', batchId);
      fetchData();
  };

  const handleUpdateBatch = async (batchId: string, updates: Partial<InventoryItem>) => {
      await supabase.from('inventory_items').update(updates as any).eq('id', batchId);
      fetchData();
  };

  const handleMoveBatch = async (batch: InventoryItem, newLoc: string, qty: number, dates?: { origin: Date|undefined, dest: Date|undefined }) => {
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

  const filteredProducts = groupedInventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if(!open) onClose(); }}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-full max-w-3xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden [&>button]:hidden">
          
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
                    {isLoading ? <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div> : 
                     receptionItems.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-zinc-500 min-h-[300px]"><CheckCircle2 className="w-12 h-12 mb-3 opacity-20"/><p className="text-sm">Todo colocado.</p></div> : 
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
                                <Button variant="ghost" onClick={() => setSelectedProduct(null)} className="text-zinc-400 hover:text-white pl-0 gap-1 h-8"><ChevronLeft className="w-4 h-4"/> Volver</Button>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-900/10" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="w-4 h-4"/></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => setShowEditDialog(true)}><Pencil className="w-4 h-4"/></Button>
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
                                    <Button size="sm" variant="destructive" className="h-8 px-3" onClick={handleConsume} disabled={!consumeAmount}><Minus className="w-4 h-4"/></Button>
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
                                    {rawInventoryItems.filter(i => i.product_id === selectedProduct.product_id && i.quantity > 0).sort((a,b) => new Date(a.expiry_date||'9999').getTime() - new Date(b.expiry_date||'9999').getTime()).map(batch => (
                                        <InventoryBatchRow key={batch.id} batch={batch} unit={selectedProduct.unit} householdId={householdId} onDelete={handleDeleteBatch} onUpdate={handleUpdateBatch} onMove={handleMoveBatch}/>
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
                            <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" /><Input placeholder="Buscar producto..." className="pl-8 h-9 bg-zinc-950 border-zinc-800 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div>
                            <ScrollArea className="w-full whitespace-nowrap pb-1">
                                <div className="flex gap-2"><button onClick={() => setSelectedCategory(null)} className={cn("px-3 py-1 rounded-full text-xs font-bold border transition-all", !selectedCategory ? "bg-white text-black" : "bg-zinc-900 border-zinc-700 text-zinc-500")}>Todo</button>{Object.keys(CATEGORY_CONFIG).map(cat => { const conf = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG]; const isSel = selectedCategory === cat; const Icon = conf.icon; return (<button key={cat} onClick={() => setSelectedCategory(isSel ? null : cat)} className={cn("flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition-all", isSel ? `${conf.color} border-current` : "bg-zinc-900 border-zinc-700 text-zinc-500")}><Icon className="w-3 h-3"/> {conf.label}</button>)})}</ div>
                            </ScrollArea>
                        </div>
                        <ScrollArea className="flex-1 w-full">
                            <div className="p-3 space-y-2 pb-20">
                                {filteredProducts.map(item => {
                                    const catConf = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.Pantry; const Icon = catConf.icon; const threshold = item.min_quantity !== null ? item.min_quantity : (item.importance_level==='critical'?4:item.importance_level==='high'?2:1); const isCritical = (item.healthy_quantity <= threshold && ['critical','high'].includes(item.importance_level)) || item.total_quantity === 0;
                                    return (
                                        <div key={item.product_id} onClick={() => setSelectedProduct(item)} className={cn("rounded-lg border bg-zinc-900/40 p-3 flex items-center gap-3 transition-all hover:bg-zinc-900 cursor-pointer", isCritical ? "border-red-500/30 bg-red-900/5" : "border-zinc-800")}>
                                            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", catConf.color)}><Icon className="w-4 h-4"/></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between"><span className="font-bold text-sm text-zinc-200 truncate">{item.name}</span>{item.is_ghost && <Ghost className="w-3 h-3 text-purple-500"/>}</div>
                                                <div className="text-xs text-zinc-500 flex items-center gap-2 mt-1"><span className={cn("font-mono font-bold px-1.5 rounded", item.total_quantity === 0 ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-300")}>{item.total_quantity} {item.unit}</span>{item.batch_count > 1 && <span>• {item.batch_count} lotes</span>}{item.has_expiring_batch && <Skull className="w-3 h-3 text-purple-500 animate-pulse"/>}</div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-zinc-700"/>
                                        </div>
                                    )
                                })}
                                {filteredProducts.length === 0 && <div className="text-center py-10 text-zinc-500 text-xs">No hay productos.</div>}
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
                                {criticalAlerts.length === 0 && <div className="flex flex-col items-center justify-center h-40 text-zinc-500 gap-2"><CheckCircle2 className="w-8 h-8 opacity-50 text-green-500"/><span className="text-xs">Todo en orden por aquí.</span></div>}
                                {criticalAlerts.map(item => (
                                    <div key={item.product_id} className="bg-red-900/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-3">
                                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0"/>
                                        <div className="flex-1"><div className="font-bold text-sm text-red-200">{item.name}</div><div className="text-xs text-red-400">{item.reason}</div></div>
                                    </div>
                                ))}
                            </TabsContent>
                            <TabsContent value="suggestions" className="mt-0 space-y-2 data-[state=inactive]:hidden">
                                {suggestionAlerts.length === 0 && <div className="flex flex-col items-center justify-center h-40 text-zinc-500 gap-2"><span className="text-xs">Sin sugerencias.</span></div>}
                                {suggestionAlerts.map(item => (
                                    <div key={item.product_id} className={cn("bg-zinc-900/50 border rounded-lg p-3 flex items-center gap-3", item.severity === 'expiry' ? "border-purple-500/30" : "border-blue-500/30")}>
                                        {item.severity === 'expiry' ? <Skull className="w-5 h-5 text-purple-500 shrink-0"/> : <Info className="w-5 h-5 text-blue-500 shrink-0"/>}
                                        <div className="flex-1"><div className={cn("font-bold text-sm", item.severity === 'expiry' ? "text-purple-200" : "text-blue-200")}>{item.name}</div><div className={cn("text-xs", item.severity === 'expiry' ? "text-purple-400" : "text-blue-400")}>{item.reason}</div></div>
                                        <Button size="sm" variant="ghost" className="h-8 hover:bg-white/10" onClick={() => handleAddToShoppingList(item)}><Plus className="w-4 h-4 mr-2"/> Añadir</Button>
                                    </div>
                                ))}
                            </TabsContent>
                        </div>
                     </ScrollArea>
                 </Tabs>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <EditProductDialog product={selectedProduct} isOpen={showEditDialog} onOpenChange={setShowEditDialog} onUpdated={fetchData} />
      {selectedProduct && <AddBatchDialog product={selectedProduct} isOpen={isAddBatchOpen} onOpenChange={setIsAddBatchOpen} onBatchAdded={handleBatchAddedManual} />}
      
      {/* DIÁLOGO CONFIRMACIÓN BORRAR */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="bg-zinc-950 border-red-900/50 text-white w-[90%] max-w-sm rounded-xl">
              <DialogHeader>
                  <DialogTitle className="text-red-500 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> ¿Eliminar Producto?</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                      Estás a punto de borrar <b>"{selectedProduct?.name}"</b> y todo su historial de stock. Esta acción no se puede deshacer.
                  </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 justify-end mt-2">
                  <Button variant="ghost" onClick={()=>setShowDeleteConfirm(false)}>Cancelar</Button>
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