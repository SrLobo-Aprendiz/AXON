import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InventoryItem, ProductDefinition } from '@/lib/types'; 
import { 
  Package, Search, Calendar as CalendarIcon, MapPin, 
  CheckCircle2, AlertTriangle, AlertCircle, Ghost, Skull,
  ArrowRight, Plus, Trash2, X, Home, ChevronLeft, ChevronRight, Minus, ArrowRightLeft,
  Split, Layers, Settings, Save, Info, Zap, ShoppingCart, Pencil, Check
} from 'lucide-react';
import { format, differenceInDays, isBefore, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import AddItemDialog from './AddItemDialog';
import AddBatchDialog from './AddBatchDialog';
import { Beef, Milk, Carrot, SprayCan, Croissant, Snowflake, Coffee } from 'lucide-react';

interface StockModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
}

const CATEGORY_ICONS: Record<string, { icon: React.ReactNode, color: string, label: string }> = {
  Meat: { icon: <Beef className="w-4 h-4"/>, color: 'text-red-400 bg-red-400/10', label: 'Carne' },
  Dairy: { icon: <Milk className="w-4 h-4"/>, color: 'text-blue-400 bg-blue-400/10', label: 'Lácteos' },
  Produce: { icon: <Carrot className="w-4 h-4"/>, color: 'text-green-400 bg-green-400/10', label: 'Fresco' },
  Bakery: { icon: <Croissant className="w-4 h-4"/>, color: 'text-yellow-400 bg-yellow-400/10', label: 'Panadería' },
  Frozen: { icon: <Snowflake className="w-4 h-4"/>, color: 'text-cyan-400 bg-cyan-400/10', label: 'Congelados' },
  Beverages: { icon: <Coffee className="w-4 h-4"/>, color: 'text-amber-400 bg-amber-400/10', label: 'Bebidas' },
  Household: { icon: <SprayCan className="w-4 h-4"/>, color: 'text-purple-400 bg-purple-400/10', label: 'Limpieza' }, 
  Pantry: { icon: <Package className="w-4 h-4"/>, color: 'text-zinc-400 bg-zinc-400/10', label: 'Despensa' },
};

const DEFAULT_LOCATIONS = ['Despensa', 'Nevera', 'Congelador', 'Baño', 'Limpieza', 'Trastero'];

// --- SUB-COMPONENTE: FILA DE RECEPCIÓN ---
const ReceptionRow = ({ item, householdId, onReceive }: { item: any, householdId: string, onReceive: () => void }) => {
    const { toast } = useToast();
    const [qty, setQty] = useState<string>(item.quantity?.toString() || '1');
    const [unit, setUnit] = useState<string>(item.unit || 'uds'); 
    const [loc, setLoc] = useState('Despensa');
    const [isCustomLoc, setIsCustomLoc] = useState(false); 
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [isChecking, setIsChecking] = useState(true);
    const [isNewProduct, setIsNewProduct] = useState(false);
    const [priorityMode, setPriorityMode] = useState<'critical'|'high'|'normal'>(item.priority || 'normal');
    const [manualMinQty, setManualMinQty] = useState<string>('');

    useEffect(() => {
        const check = async () => {
            if (item.is_ghost) { setIsChecking(false); return; }
            const { data } = await supabase.from('product_definitions')
                .select('id, unit').eq('household_id', householdId).ilike('name', item.item_name).maybeSingle();
            
            if (!data) {
                setIsNewProduct(true);
            } else if (data.unit) {
                setUnit(data.unit);
            }
            setIsChecking(false);
        };
        check();
    }, [item, householdId]);

    const handleConfirm = async () => {
        try {
            let productId: string;
            const { data: existing } = await supabase.from('product_definitions')
                .select('id').eq('household_id', householdId).ilike('name', item.item_name).maybeSingle();

            if (existing) {
                productId = existing.id;
            } else {
                const { data: newProd, error } = await supabase.from('product_definitions').insert({
                    household_id: householdId,
                    name: item.item_name,
                    category: item.category || 'Pantry',
                    unit: unit,
                    importance_level: item.is_ghost ? 'ghost' : priorityMode,
                    min_quantity: manualMinQty ? Number(manualMinQty) : null,
                    is_ghost: item.is_ghost || false
                }).select().single();
                if (error) throw error;
                productId = newProd.id;
            }

            await supabase.from('inventory_items').insert({
                household_id: householdId,
                product_id: productId,
                name: item.item_name,
                category: item.category || 'Pantry', 
                unit: unit,
                quantity: Number(qty),
                location: loc,
                expiry_date: date ? format(date, 'yyyy-MM-dd') : null
            });

            await supabase.from('shopping_list').delete().eq('id', item.id);
            toast({ title: "Guardado", description: `${item.item_name} añadido al stock.` });
            onReceive();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    if (isChecking) return <div className="p-4 text-xs text-zinc-500">Cargando...</div>;

    return (
        <div className={cn("bg-zinc-900 border rounded-lg p-3 mb-2 flex flex-col gap-2 transition-colors", isNewProduct && !item.is_ghost ? "border-blue-500/30 bg-blue-900/5" : "border-zinc-800")}>
            <div className="flex justify-between items-start">
                <div>
                    <span className="font-bold text-white block">{item.item_name}</span>
                    <Badge variant="outline" className="text-[10px] text-zinc-400 mt-1">{item.category}</Badge>
                </div>
                {item.is_ghost && <Badge variant="secondary" className="bg-purple-900/50 text-purple-300 border-purple-500/50"><Ghost className="w-3 h-3 mr-1"/> Ghost</Badge>}
                {isNewProduct && !item.is_ghost && <Badge className="bg-blue-600 animate-pulse">NUEVO</Badge>}
            </div>

            {isNewProduct && !item.is_ghost && (
                <div className="bg-black/20 p-2 rounded border border-blue-500/20 grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                        <Label className="text-[10px] text-blue-300 uppercase font-bold">Importancia</Label>
                        <Select value={priorityMode} onValueChange={(v:any) => setPriorityMode(v)}>
                            <SelectTrigger className="h-7 text-xs bg-zinc-950 border-zinc-700"><SelectValue/></SelectTrigger>
                            <SelectContent className="bg-zinc-900 text-white">
                                <SelectItem value="critical" className="text-red-400">Imprescindible</SelectItem>
                                <SelectItem value="high" className="text-orange-400">P. Media</SelectItem>
                                <SelectItem value="normal" className="text-blue-400">Opcional</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label className="text-[10px] text-blue-300 uppercase font-bold">Min. Stock</Label>
                        <Input type="number" className="h-7 text-xs bg-zinc-950 border-zinc-700" placeholder="Ej: 2" value={manualMinQty} onChange={e=>setManualMinQty(e.target.value)} />
                    </div>
                </div>
            )}

            <div className="flex gap-2 mt-1">
                <div className="flex-1 flex gap-1">
                    <Input type="number" className="h-8 text-xs bg-zinc-950 border-zinc-700 text-center w-16 shrink-0" value={qty} onChange={e=>setQty(e.target.value)} />
                    <Select value={unit} onValueChange={setUnit}>
                        <SelectTrigger className="h-8 w-14 bg-zinc-950 border-zinc-700 px-1 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white min-w-[80px]">
                            {['uds', 'kg', 'g', 'L', 'ml'].map(u => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {isCustomLoc ? (
                    <div className="flex-1 flex gap-1">
                        <Input value={loc} onChange={(e) => setLoc(e.target.value)} className="h-8 text-xs bg-zinc-950 border-blue-500/50" autoFocus placeholder="Lugar..."/>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setIsCustomLoc(false); setLoc('Despensa'); }}><X className="w-3 h-3"/></Button>
                    </div>
                ) : (
                    <Select value={loc} onValueChange={(val) => val === 'custom' ? setIsCustomLoc(true) : setLoc(val)}>
                        <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-700 flex-1"><SelectValue/></SelectTrigger>
                        <SelectContent className="bg-zinc-900 text-white">
                            {DEFAULT_LOCATIONS.map(l=><SelectItem key={l} value={l}>{l}</SelectItem>)}
                            <SelectItem value="custom" className="text-blue-400 font-bold">+ Otro...</SelectItem>
                        </SelectContent>
                    </Select>
                )}

                <Popover>
                    <PopoverTrigger asChild><Button variant="outline" className="h-8 px-2 border-zinc-700 bg-zinc-950 text-zinc-400"><CalendarIcon className="w-4 h-4"/></Button></PopoverTrigger>
                    <PopoverContent className="p-0 bg-zinc-950 border-zinc-800"><Calendar mode="single" selected={date} onSelect={setDate} className="bg-zinc-950 text-white"/></PopoverContent>
                </Popover>
            </div>
            
            <Button className="w-full h-8 bg-green-600 hover:bg-green-500 font-bold text-xs" onClick={handleConfirm}>
                Confirmar Entrada <ArrowRight className="w-3 h-3 ml-2"/>
            </Button>
        </div>
    );
};

// --- SUB-COMPONENTE: FILA DE LOTE ---
const InventoryBatchRow = ({ batch, onDelete, onMove }: { batch: InventoryItem, onDelete: (id: string) => void, onMove: (batch: InventoryItem, newLoc: string, qty: number) => void }) => {
    const [moveQty, setMoveQty] = useState<string>(batch.quantity.toString());
    const [isOpen, setIsOpen] = useState(false);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customLoc, setCustomLoc] = useState('');

    const handleMoveClick = (loc: string) => {
        const qty = parseFloat(moveQty);
        if (qty > 0 && qty <= batch.quantity) {
            onMove(batch, loc, qty);
            setIsOpen(false);
            setIsCustomMode(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-3">
                <div className="text-sm font-bold text-zinc-200 bg-zinc-800 px-2 py-1 rounded">
                    {batch.quantity} <span className="text-[10px] text-zinc-500 font-normal ml-0.5">{batch.unit}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {batch.location}
                    </span>
                    {batch.expiry_date && (
                        <span className={cn("text-xs flex items-center gap-1", 
                            differenceInDays(new Date(batch.expiry_date), new Date()) <= 5 ? "text-red-400 font-bold" : "text-green-500"
                        )}>
                            <CalendarIcon className="w-3 h-3" /> 
                            {format(new Date(batch.expiry_date), 'dd/MM/yyyy')}
                        </span>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-1">
                <Popover open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(open) setMoveQty(batch.quantity.toString()); if(!open) setIsCustomMode(false); }}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-blue-400 h-8 w-8" title="Mover / Dividir">
                            <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3 bg-zinc-950 border-zinc-700 text-white">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-1">
                                <span className="text-[10px] uppercase font-bold text-zinc-400">Mudanza Lote</span>
                                {isCustomMode ? 
                                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={()=>setIsCustomMode(false)}><X className="w-3 h-3"/></Button> 
                                    : <Split className="w-3 h-3 text-zinc-600"/>
                                }
                            </div>
                            
                            <div className="flex items-center gap-2 mb-1">
                                <Label className="text-xs shrink-0">Mover:</Label>
                                <Input type="number" className="h-7 text-xs bg-zinc-900 border-zinc-700 text-right" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} max={batch.quantity} min={0} />
                            </div>

                            {isCustomMode ? (
                                <div className="flex gap-1">
                                    <Input autoFocus value={customLoc} onChange={e=>setCustomLoc(e.target.value)} className="h-7 text-xs bg-zinc-900 border-zinc-700" placeholder="Nuevo lugar..."/>
                                    <Button size="sm" className="h-7 w-7 p-0 bg-blue-600" onClick={()=>handleMoveClick(customLoc)}><Check className="w-3 h-3"/></Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-1 max-h-[120px] overflow-y-auto">
                                    {DEFAULT_LOCATIONS.filter(l => l !== batch.location).map(loc => (
                                        <button key={loc} onClick={() => handleMoveClick(loc)} className="text-left text-[10px] text-zinc-300 hover:bg-blue-600 hover:text-white px-2 py-1.5 rounded transition-colors truncate border border-zinc-800">{loc}</button>
                                    ))}
                                    <button onClick={() => setIsCustomMode(true)} className="text-left text-[10px] text-blue-400 hover:bg-blue-900/20 px-2 py-1.5 rounded transition-colors truncate border border-dashed border-zinc-700">+ Otro...</button>
                                </div>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" onClick={() => onDelete(batch.id)} className="text-zinc-600 hover:text-red-500 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
            </div>
        </div>
    );
};

export const StockModal: React.FC<StockModalProps> = ({ isOpen, onClose, householdId }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('pantry');
  const [receptionItems, setReceptionItems] = useState<any[]>([]);
  const [rawInventoryItems, setRawInventoryItems] = useState<InventoryItem[]>([]);
  const [groupedInventory, setGroupedInventory] = useState<any[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
  const [suggestionAlerts, setSuggestionAlerts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // UI DETALLE
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null); 
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [consumeAmount, setConsumeAmount] = useState<string>(''); 
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editMinQty, setEditMinQty] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editIsGhost, setEditIsGhost] = useState(false);

  // States para Mudanza Masiva y Lotes
  const [isMassCustomMode, setIsMassCustomMode] = useState(false);
  const [massCustomLoc, setMassCustomLoc] = useState('');
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!householdId) return;
    const { data: receptionData } = await supabase.from('shopping_list').select('*').eq('household_id', householdId).eq('status', 'bought').order('created_at', { ascending: false });
    if (receptionData) setReceptionItems(receptionData);

    const { data: inventoryData } = await supabase.from('inventory_items').select('*, product:product_definitions(*)').eq('household_id', householdId).order('expiry_date', { ascending: true });
    
    if (inventoryData) {
        setRawInventoryItems(inventoryData as InventoryItem[]);
        processInventory(inventoryData);
    }
  }, [householdId]);

  useEffect(() => { if (isOpen) fetchData(); }, [isOpen, fetchData]);

  useEffect(() => {
    if (selectedProduct) {
        if (selectedProduct.product_id !== lastSelectedId) {
            setIsEditingSettings(false);
            setIsMassCustomMode(false);
            setLastSelectedId(selectedProduct.product_id);
        }

        const updatedGroup = groupedInventory.find(i => i.product_id === selectedProduct.product_id);
        if (updatedGroup && JSON.stringify(updatedGroup) !== JSON.stringify(selectedProduct)) {
            setSelectedProduct(updatedGroup);
        }
    }
  }, [selectedProduct, groupedInventory, lastSelectedId]);

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
                  batches: []
              });
          }
          const group = groupedMap.get(key)!;
          group.total_quantity += item.quantity;
          group.batch_count += 1;
          group.batches.push(item);

          const isExpiringSoon = item.expiry_date && new Date(item.expiry_date) <= expiryThresholdDate;
          if (isExpiringSoon) group.expiring_quantity += item.quantity;
          else group.healthy_quantity += item.quantity;
          
          if (item.expiry_date && (!group.earliest_expiry || new Date(item.expiry_date) < new Date(group.earliest_expiry))) {
              group.earliest_expiry = item.expiry_date;
          }
      });

      groupedMap.forEach(group => {
          if (group.is_ghost) return; 
          const threshold = group.min_quantity !== null ? group.min_quantity : (group.importance_level==='critical'?4:group.importance_level==='high'?2:1);
          if (group.healthy_quantity <= threshold) {
              if (['critical', 'high'].includes(group.importance_level)) {
                  criticals.push({ ...group, reason: group.expiring_quantity > 0 ? "Stock crítico por caducidad" : "Stock bajo", severity: group.importance_level });
                  return;
              }
          }
          if (group.expiring_quantity > 0) {
              suggestions.push({ ...group, reason: "Caducidad próxima", severity: 'expiry' });
              return;
          }
          if (group.healthy_quantity <= threshold && group.importance_level === 'normal') {
              suggestions.push({ ...group, reason: "Reponer opcional", severity: 'low_optional' });
          }
      });

      setCriticalAlerts(criticals);
      setSuggestionAlerts(suggestions);
      setGroupedInventory(Array.from(groupedMap.values()));
  };

  const handleConsume = async () => {
    if (!selectedProduct || !consumeAmount) return;
    const amountToConsume = Number(consumeAmount);
    if (amountToConsume <= 0) return;

    // Ordenar lotes por fecha de caducidad (FIFO)
    const batches = rawInventoryItems
        .filter(i => i.product_id === selectedProduct.product_id)
        .sort((a, b) => {
             if (!a.expiry_date) return 1;
             if (!b.expiry_date) return -1;
             return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        });

    // Calcular si se va a vaciar todo el stock
    const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
    const willWipeOut = amountToConsume >= totalAvailable;
    const isGhost = selectedProduct.is_ghost;

    let remaining = amountToConsume;
    
    for (const [index, batch] of batches.entries()) {
        if (remaining <= 0) break;

        if (batch.quantity <= remaining) {
            // Gastar lote completo
            remaining -= batch.quantity;
            
            const isLastBatch = index === batches.length - 1;

            if (willWipeOut && isLastBatch) {
                // Es el último lote y nos quedamos a 0
                if (isGhost) {
                    // LÓGICA GHOST: Muerte total (Se borra lote y producto maestro)
                    await supabase.from('inventory_items').delete().eq('id', batch.id);
                    await supabase.from('product_definitions').delete().eq('id', selectedProduct.product_id);
                    
                    toast({ title: "Ghost Eliminado", description: "Producto borrado del sistema." });
                    setSelectedProduct(null); // Cerrar panel
                } else {
                    // LÓGICA NORMAL: Último superviviente (Container vacío)
                    await supabase.from('inventory_items')
                       .update({ quantity: 0, expiry_date: null } as any)
                       .eq('id', batch.id);
                    toast({ title: "Agotado", description: `${selectedProduct.name} se queda a 0.` });
                }
            } else {
                // No es el último, o es parte del consumo masivo intermedio -> Borrar lote
                await supabase.from('inventory_items').delete().eq('id', batch.id);
            }
        } else {
            // Consumo parcial
            const newQty = batch.quantity - remaining;
            remaining = 0;
            await supabase.from('inventory_items').update({ quantity: newQty } as any).eq('id', batch.id);
        }
    }
    
    if (!willWipeOut || (willWipeOut && !isGhost)) {
        if (!willWipeOut) toast({ title: "Consumido", description: `-${amountToConsume} ${selectedProduct.name}` });
    }
    
    setConsumeAmount('');
    fetchData(); 
  };

  const handleUpdateDefinition = async () => {
      if (!selectedProduct) return;
      
      const { error } = await supabase.from('product_definitions').update({
          importance_level: editIsGhost ? 'ghost' : editPriority,
          min_quantity: editMinQty === '' ? null : Number(editMinQty),
          is_ghost: editIsGhost
      }).eq('id', selectedProduct.product_id);

      if (error) toast({ title: "Error", variant: "destructive" });
      else {
          toast({ title: "Actualizado", description: "Configuración guardada correctamente." });
          setIsEditingSettings(false);
          fetchData();
      }
  };

  const handleMoveBatch = async (batch: InventoryItem, newLocation: string, quantityToMove: number) => {
      if (!newLocation || quantityToMove <= 0) return;
      if (quantityToMove >= batch.quantity) {
          await supabase.from('inventory_items').update({ location: newLocation } as any).eq('id', batch.id);
      } else {
          const remainingQty = batch.quantity - quantityToMove;
          await supabase.from('inventory_items').update({ quantity: remainingQty } as any).eq('id', batch.id);
          const { id, created_at, ...itemData } = batch; 
          await supabase.from('inventory_items').insert({ ...itemData, quantity: quantityToMove, location: newLocation, household_id: householdId } as any);
      }
      fetchData();
  };

  const handleMoveAllBatches = async (newLocation: string) => {
      if (!selectedProduct || !newLocation) return;
      await supabase.from('inventory_items').update({ location: newLocation } as any).eq('product_id', selectedProduct.product_id);
      toast({ title: "Reorganizado", description: `Todo movido a ${newLocation}.` });
      fetchData();
  };

  // --- MODIFICADO: Borrado de Lote con lógica Ghost ---
  const handleDeleteInventoryItem = async (id: string) => {
    if (!confirm("¿Borrar este lote?")) return;
    
    // 1. Borrar el lote
    await supabase.from('inventory_items').delete().eq('id', id);

    // 2. Lógica Ghost: Si es el último lote de un ghost, borrar también la definición
    if (selectedProduct && selectedProduct.is_ghost) {
        // Contamos cuántos lotes tiene este producto en el estado actual (antes del refetch)
        const batchCount = rawInventoryItems.filter(i => i.product_id === selectedProduct.product_id).length;
        
        // Si solo quedaba 1 (el que acabamos de borrar), eliminamos el padre
        if (batchCount <= 1) {
             await supabase.from('product_definitions').delete().eq('id', selectedProduct.product_id);
             toast({ title: "Ghost Eliminado", description: "Producto borrado del sistema." });
             setSelectedProduct(null); // Cerramos el panel de detalle
        }
    }

    fetchData();
  };

  const filteredGroupedInventory = groupedInventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) { onClose(); setSelectedProduct(null); setLastSelectedId(null); } }}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-full max-w-2xl max-h-[90vh] h-auto flex flex-col p-0 gap-0">
        
        <DialogHeader className="p-4 border-b border-zinc-800 bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
              {selectedProduct && (
                  <Button variant="ghost" size="icon" onClick={() => setSelectedProduct(null)} className="mr-1 h-8 w-8 text-zinc-400 hover:text-white">
                      <ChevronLeft className="w-5 h-5" />
                  </Button>
              )}
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Package className="w-5 h-5 text-blue-500" />
                {selectedProduct ? selectedProduct.name : 'Stock Casa'}
              </DialogTitle>
          </div>
          <DialogDescription className="sr-only">Inventario</DialogDescription>
        </DialogHeader>

        {selectedProduct ? (
             <div className="flex-1 flex flex-col min-h-0 bg-zinc-950">
                 <div className="p-6 border-b border-zinc-800 flex flex-col items-center gap-4 bg-zinc-900/30 relative">
                     
                     {isEditingSettings ? (
                         <div className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded-lg animate-in fade-in zoom-in-95">
                             <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                                <h4 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2"><Settings className="w-3 h-3"/> Configuración de Producto</h4>
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={()=>setIsEditingSettings(false)}><X className="w-3 h-3"/></Button>
                             </div>
                             
                             <div className="grid grid-cols-1 gap-4">
                                <div className="flex items-center justify-between bg-zinc-900 p-2 rounded border border-zinc-800">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold flex items-center gap-1"><Ghost className="w-3 h-3 text-purple-400"/> Producto Ghost</span>
                                        <span className="text-[10px] text-zinc-500">No genera avisos ni entra en lista de compra</span>
                                    </div>
                                    <input type="checkbox" className="h-4 w-4 accent-purple-500 cursor-pointer" checked={editIsGhost} onChange={(e) => setEditIsGhost(e.target.checked)} />
                                </div>

                                {!editIsGhost && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-1">
                                            <Label className="text-[10px] uppercase text-zinc-500 font-bold">Importancia</Label>
                                            <Select value={editPriority} onValueChange={setEditPriority}>
                                                <SelectTrigger className="h-9 bg-zinc-900 border-zinc-700 text-xs"><SelectValue/></SelectTrigger>
                                                <SelectContent className="bg-zinc-900 text-white">
                                                    <SelectItem value="critical">🔴 Imprescindible</SelectItem>
                                                    <SelectItem value="high">🟠 P. Media</SelectItem>
                                                    <SelectItem value="normal">🔵 Opcional</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1">
                                            <Label className="text-[10px] uppercase text-zinc-500 font-bold">Avisar Stock &lt;</Label>
                                            <Input type="number" className="h-9 bg-zinc-900 border-zinc-700 text-xs font-bold" value={editMinQty} onChange={e=>setEditMinQty(e.target.value)} placeholder="Ej: 2" />
                                        </div>
                                    </div>
                                )}
                             </div>

                             <div className="flex gap-2 mt-4">
                                <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={()=>setIsEditingSettings(false)}>Cancelar</Button>
                                <Button size="sm" className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-500" onClick={handleUpdateDefinition}><Save className="w-3 h-3 mr-2"/> Guardar Cambios</Button>
                             </div>
                         </div>
                     ) : (
                         <>
                            <div className="text-center w-full">
                                <div className="text-4xl font-bold font-mono text-white mb-1">
                                    {selectedProduct.total_quantity} <span className="text-lg text-zinc-500">{selectedProduct.unit || 'uds'}</span>
                                </div>
                                
                                <div className="flex items-center justify-center gap-3 mt-2">
                                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
                                        {selectedProduct.is_ghost ? (
                                            <><Ghost className="w-3 h-3 text-purple-400"/><span className="text-[10px] text-purple-400 uppercase font-bold">Ghost</span></>
                                        ) : (
                                            <>
                                                {selectedProduct.importance_level === 'critical' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                                                {selectedProduct.importance_level === 'high' && <span className="w-2 h-2 rounded-full bg-orange-500"></span>}
                                                {selectedProduct.importance_level === 'normal' && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                                <span className="text-[10px] text-zinc-400 uppercase font-bold">
                                                    {selectedProduct.importance_level === 'critical' ? 'Imprescindible' : selectedProduct.importance_level === 'high' ? 'P. Media' : 'Opcional'}
                                                </span>
                                            </>
                                        )}
                                        <div className="w-px h-3 bg-zinc-700 mx-1"></div>
                                        <span className="text-[10px] text-zinc-500">
                                            Min: {selectedProduct.min_quantity !== null ? selectedProduct.min_quantity : (selectedProduct.importance_level==='critical'?4:selectedProduct.importance_level==='high'?2:1)}
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-white" 
                                        onClick={() => {
                                            setEditIsGhost(selectedProduct.is_ghost);
                                            setEditPriority(selectedProduct.is_ghost ? 'normal' : selectedProduct.importance_level);
                                            setEditMinQty(selectedProduct.min_quantity?.toString() || '');
                                            setIsEditingSettings(true);
                                        }}>
                                        <Pencil className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>

                            <div className="w-full max-w-xs flex gap-2 items-center bg-zinc-900 p-2 rounded-lg border border-zinc-800 mt-2">
                                <Input type="number" placeholder="Gastar..." className="bg-transparent border-none text-right text-lg font-bold focus-visible:ring-0" value={consumeAmount} onChange={(e) => setConsumeAmount(e.target.value)} />
                                <span className="text-zinc-500 text-sm font-bold pr-2">{selectedProduct.unit || 'uds'}</span>
                            </div>
                            <Button size="lg" className="w-full max-w-xs bg-red-600 hover:bg-red-500 text-white font-bold" onClick={handleConsume} disabled={!consumeAmount || Number(consumeAmount) <= 0}>
                                <Minus className="w-5 h-5 mr-2" /> Gastar
                            </Button>
                         </>
                     )}
                 </div>

                 <ScrollArea className="flex-1 p-4">
                     <div className="flex items-center justify-between mb-3 px-1 border-b border-zinc-800 pb-2">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase">Desglose de Lotes</h4>
                        <Popover open={isMassCustomMode} onOpenChange={setIsMassCustomMode}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 gap-1 px-2 border border-blue-900/30">
                                    <Layers className="w-3 h-3" /> Mover todo el Stock
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2 bg-zinc-950 border-zinc-700">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between border-b border-zinc-800 pb-1 mb-1">
                                        <span className="text-[10px] uppercase font-bold text-zinc-500 px-2">Mover todo a...</span>
                                        {massCustomLoc ? <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={()=>setMassCustomLoc('')}><X className="w-3 h-3"/></Button> : null}
                                    </div>
                                    
                                    {massCustomLoc ? (
                                        <div className="flex gap-1 animate-in fade-in">
                                            <Input autoFocus value={massCustomLoc} onChange={e=>setMassCustomLoc(e.target.value)} className="h-7 text-xs bg-zinc-900 border-zinc-700" placeholder="Destino..."/>
                                            <Button size="sm" className="h-7 w-7 p-0 bg-blue-600" onClick={()=>{handleMoveAllBatches(massCustomLoc); setIsMassCustomMode(false); setMassCustomLoc('');}}><Check className="w-3 h-3"/></Button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-1 max-h-[160px] overflow-y-auto">
                                            {DEFAULT_LOCATIONS.map(loc => (
                                                <button key={loc} onClick={() => {handleMoveAllBatches(loc); setIsMassCustomMode(false);}} className="text-left text-xs text-zinc-300 hover:bg-blue-600 hover:text-white px-2 py-1.5 rounded transition-colors border border-zinc-800">
                                                    {loc}
                                                </button>
                                            ))}
                                            <button onClick={() => setMassCustomLoc('custom')} className="text-left text-[10px] text-blue-400 hover:bg-blue-900/20 px-2 py-1.5 rounded transition-colors border border-dashed border-zinc-700">+ Otro...</button>
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                     </div>
                     <div className="space-y-2">
                         {rawInventoryItems
                            .filter(i => i.product_id === selectedProduct.product_id)
                            .sort((a,b) => new Date(a.expiry_date||'9999').getTime() - new Date(b.expiry_date||'9999').getTime())
                            .map(batch => (<InventoryBatchRow key={batch.id} batch={batch} onDelete={handleDeleteInventoryItem} onMove={handleMoveBatch} />))
                         }
                     </div>
                 </ScrollArea>
                 
                 <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                    <Button 
                        onClick={() => setIsAddBatchOpen(true)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold border border-blue-400/20 shadow-lg"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Añadir Lote Manual
                    </Button>

                    <AddBatchDialog 
                        isOpen={isAddBatchOpen}
                        onOpenChange={setIsAddBatchOpen}
                        onBatchAdded={fetchData}
                        product={{
                            id: selectedProduct.product_id,
                            name: selectedProduct.name,
                            unit: selectedProduct.unit,
                            category: selectedProduct.category,
                            household_id: householdId
                        }}
                    />
                 </div>
             </div>
        ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
            <TabsList className="grid w-full grid-cols-3 bg-zinc-950">
              <TabsTrigger value="reception">Recepción {receptionItems.length > 0 && <Badge className="ml-2 bg-blue-600 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">{receptionItems.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="pantry">Mi Despensa</TabsTrigger>
              <TabsTrigger value="alerts" className="data-[state=active]:text-red-400">Avisos {(criticalAlerts.length + suggestionAlerts.length) > 0 && <Badge className="ml-2 bg-red-600 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] animate-pulse">{(criticalAlerts.length + suggestionAlerts.length)}</Badge>}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="reception" className="flex-1 overflow-hidden flex flex-col p-0 m-0">
            {receptionItems.length === 0 ? <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center min-h-[150px]"><CheckCircle2 className="w-10 h-10 mb-3 opacity-20" /><p className="text-sm">Todo colocado.</p></div> : 
             <ScrollArea className="flex-1 p-4"><div className="space-y-1">{receptionItems.map((item) => (<ReceptionRow key={item.id} item={item} householdId={householdId} onReceive={fetchData} />))}</div></ScrollArea>
            }
          </TabsContent>

          <TabsContent value="pantry" className="flex-1 flex flex-col min-h-0 mt-0">
             <div className="p-3 border-b border-zinc-800 bg-zinc-900 shrink-0 space-y-3">
                <div className="relative flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" /><Input placeholder="Buscar producto..." className="pl-8 h-9 bg-zinc-950 border-zinc-800 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"><button onClick={() => setSelectedCategory(null)} className={cn("px-3 py-1 rounded-full text-xs font-bold border transition-all whitespace-nowrap", !selectedCategory ? "bg-white text-black" : "bg-zinc-900 border-zinc-700 text-zinc-500")}>Todo</button>{Object.keys(CATEGORY_ICONS).map(cat => { const conf = CATEGORY_ICONS[cat]; const isSel = selectedCategory === cat; return (<button key={cat} onClick={() => setSelectedCategory(isSel ? null : cat)} className={cn("flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition-all whitespace-nowrap", isSel ? `${conf.color} border-current` : "bg-zinc-900 border-zinc-700 text-zinc-500")}>{conf.icon} {conf.label}</button>)})}</div>
            </div>
            <ScrollArea className="flex-1 p-0 bg-zinc-950">
                <div className="p-3 space-y-2">
                    {filteredGroupedInventory.length === 0 ? <div className="text-center text-zinc-500 py-10 text-sm">Vacío.</div> : filteredGroupedInventory.map(item => {
                            const catConf = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.Pantry;
                            const threshold = item.min_quantity !== null ? item.min_quantity : (item.importance_level==='critical'?4:item.importance_level==='high'?2:1);
                            const isCriticalReal = item.healthy_quantity <= threshold && ['critical','high'].includes(item.importance_level);
                            
                            return (
                                <div key={item.product_id} onClick={() => setSelectedProduct(item)} className={cn("rounded-lg border bg-zinc-900/40 p-3 flex items-center gap-3 transition-all hover:bg-zinc-900 cursor-pointer group", isCriticalReal ? "border-red-500/30 bg-red-900/10" : "border-zinc-800")}>
                                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", catConf.color)}>{catConf.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2"><span className="font-bold text-sm text-zinc-200 truncate">{item.name}</span>{item.is_ghost && <Ghost className="w-3 h-3 text-purple-500" />}{item.batch_count > 1 && (<span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 rounded">{item.batch_count} lotes</span>)}</div>
                                        <div className="text-xs text-zinc-500 flex flex-wrap gap-2 mt-1"><span className="bg-zinc-800 px-1.5 rounded text-white font-mono">{item.total_quantity} {item.unit || 'uds'}</span>{item.earliest_expiry && (<span className={cn(differenceInDays(new Date(item.earliest_expiry), new Date()) < 0 ? "text-red-400 font-bold" : "text-zinc-500")}>Cad: {format(new Date(item.earliest_expiry), 'dd/MM/yy')}</span>)}</div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-white" />
                                </div>
                            );
                        })}
                </div>
            </ScrollArea>
            <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0"><AddItemDialog onItemAdded={fetchData}><Button className="w-full bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20"><Plus className="w-4 h-4 mr-2" /> Añadir Stock Manualmente</Button></AddItemDialog></div>
          </TabsContent>

          <TabsContent value="alerts" className="flex-1 overflow-hidden flex flex-col p-0 m-0">
             <Tabs defaultValue="critical" className="flex-1 flex flex-col">
                 <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900">
                    <TabsList className="grid w-full grid-cols-2 h-7 bg-zinc-950">
                        <TabsTrigger value="critical" className="text-xs data-[state=active]:text-red-400">Críticos ({criticalAlerts.length})</TabsTrigger>
                        <TabsTrigger value="suggestions" className="text-xs data-[state=active]:text-purple-400">Sugerencias ({suggestionAlerts.length})</TabsTrigger>
                    </TabsList>
                 </div>
                 <ScrollArea className="flex-1 p-4">
                    <TabsContent value="critical" className="mt-0 space-y-2">
                        {criticalAlerts.length === 0 && <div className="text-center text-zinc-500 py-5 text-xs">Todo en orden.</div>}
                        {criticalAlerts.map(item => (
                            <div key={item.product_id} className={cn("bg-red-900/10 border rounded-lg p-3 flex items-center gap-3", item.severity === 'critical' ? "border-red-500/40" : "border-orange-500/40")}>
                                <AlertTriangle className={cn("w-5 h-5 shrink-0", item.severity === 'critical' ? "text-red-500" : "text-orange-500")}/>
                                <div className="flex-1">
                                    <div className={cn("font-bold text-sm", item.severity === 'critical' ? "text-red-200" : "text-orange-200")}>{item.name}</div>
                                    <div className={cn("text-xs font-bold", item.severity === 'critical' ? "text-red-400" : "text-orange-400")}>{item.reason}</div>
                                </div>
                            </div>
                        ))}
                    </TabsContent>
                    <TabsContent value="suggestions" className="mt-0 space-y-2">
                        {suggestionAlerts.length === 0 && <div className="text-center text-zinc-500 py-5 text-xs">Sin sugerencias.</div>}
                        {suggestionAlerts.map(item => (
                            <div key={item.product_id} className={cn("bg-zinc-900/50 border rounded-lg p-3 flex items-center gap-3", item.severity === 'expiry' ? "border-purple-500/40 bg-purple-900/5" : "border-blue-500/40 bg-blue-900/5")}>
                                {item.severity === 'expiry' ? <Skull className="w-5 h-5 text-purple-500 shrink-0"/> : <Info className="w-5 h-5 text-blue-500 shrink-0"/>}
                                <div className="flex-1">
                                    <div className={cn("font-bold text-sm", item.severity === 'expiry' ? "text-purple-200" : "text-blue-200")}>{item.name}</div>
                                    <div className={cn("text-xs", item.severity === 'expiry' ? "text-purple-400 font-bold" : "text-blue-400")}>{item.reason}</div>
                                </div>
                                <Button size="sm" className="h-7 bg-zinc-800 hover:bg-zinc-700 text-xs px-2" onClick={() => {
                                    supabase.from('shopping_list').insert({
                                        household_id: householdId,
                                        item_name: item.name,
                                        category: item.category,
                                        priority: item.importance_level,
                                        status: 'active',
                                        quantity: 1,
                                        is_manual: true
                                    }).then(() => {
                                        toast({ title: "Añadido", description: `${item.name} a la lista.` });
                                    });
                                }}>
                                    <ShoppingCart className="w-3 h-3 mr-1"/> Añadir
                                </Button>
                            </div>
                        ))}
                    </TabsContent>
                 </ScrollArea>
             </Tabs>
          </TabsContent>
        </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StockModal;