import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InventoryItem } from '@/lib/types'; 
import { 
  Package, Search, Calendar as CalendarIcon, MapPin, 
  CheckCircle2, AlertTriangle, AlertCircle, Ghost, Skull,
  ArrowRight, Plus, Trash2, X, Home, Bell, ChevronLeft, ChevronRight, Minus, ArrowRightLeft,
  Split, Layers // <--- ICONO PARA MOVER TODO
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
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

// --- SUB-COMPONENTE: FILA DE LOTE (MUDANZA INDIVIDUAL) ---
const InventoryBatchRow = ({ batch, onDelete, onMove }: { batch: InventoryItem, onDelete: (id: string) => void, onMove: (batch: InventoryItem, newLoc: string, qty: number) => void }) => {
    const [moveQty, setMoveQty] = useState<string>(batch.quantity.toString());
    const [isOpen, setIsOpen] = useState(false);

    const handleMoveClick = (loc: string) => {
        const qty = parseFloat(moveQty);
        if (qty > 0 && qty <= batch.quantity) {
            onMove(batch, loc, qty);
            setIsOpen(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-3">
                <div className="text-sm font-bold text-zinc-200 bg-zinc-800 px-2 py-1 rounded">
                    {batch.quantity} {batch.unit}
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
                <Popover open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(open) setMoveQty(batch.quantity.toString()); }}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-blue-400 h-8 w-8" title="Mover / Dividir">
                            <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3 bg-zinc-950 border-zinc-700 text-white">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-1">
                                <span className="text-[10px] uppercase font-bold text-zinc-400">Mudanza Lote</span>
                                <Split className="w-3 h-3 text-zinc-600"/>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                                <Label className="text-xs shrink-0">Mover:</Label>
                                <Input type="number" className="h-7 text-xs bg-zinc-900 border-zinc-700 text-right" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} max={batch.quantity} min={0} />
                                <span className="text-xs text-zinc-500">{batch.unit}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500">Elige destino:</span>
                            <div className="grid grid-cols-2 gap-1 max-h-[120px] overflow-y-auto">
                                {DEFAULT_LOCATIONS.filter(l => l !== batch.location).map(loc => (
                                    <button key={loc} onClick={() => handleMoveClick(loc)} className="text-left text-[10px] text-zinc-300 hover:bg-blue-600 hover:text-white px-2 py-1.5 rounded transition-colors truncate border border-zinc-800">{loc}</button>
                                ))}
                            </div>
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
  const [groupedInventory, setGroupedInventory] = useState<InventoryItem[]>([]);
  const [alertItems, setAlertItems] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  const [tempDates, setTempDates] = useState<Record<string, Date | undefined>>({});
  const [tempLocs, setTempLocs] = useState<Record<string, string>>({});
  const [customLocMode, setCustomLocMode] = useState<Record<string, boolean>>({});

  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null); 
  const [consumeAmount, setConsumeAmount] = useState<string>(''); 

  const fetchData = useCallback(async () => {
    if (!householdId) return;

    const { data: receptionData } = await supabase
      .from('shopping_list').select('*').eq('household_id', householdId).eq('status', 'bought').order('created_at', { ascending: false });
    if (receptionData) {
        setReceptionItems(receptionData);
        if (receptionData.length > 0 && activeTab === 'pantry' && !isOpen) setActiveTab('reception');
    }

    const { data: inventoryData } = await supabase
      .from('inventory_items').select('*').eq('household_id', householdId).order('expiry_date', { ascending: true });
    
    if (inventoryData) {
        setRawInventoryItems(inventoryData as InventoryItem[]);
        processInventory(inventoryData as InventoryItem[]);
    }
  }, [householdId, isOpen]);

  useEffect(() => { if (isOpen) fetchData(); }, [isOpen, fetchData]);

  useEffect(() => {
    if (selectedProduct) {
        const updatedGroup = groupedInventory.find(i => i.name === selectedProduct.name);
        if (updatedGroup) setSelectedProduct(updatedGroup);
        else setSelectedProduct(null);
    }
  }, [groupedInventory]);

  const processInventory = (items: InventoryItem[]) => {
      const groupedMap = new Map<string, InventoryItem>();
      const alertsMap = new Map<string, any>();
      const today = new Date();

      items.forEach(item => {
          const key = item.name.toLowerCase();
          
          if (!groupedMap.has(key)) {
              groupedMap.set(key, { ...item, total_quantity: 0, batch_count: 0, earliest_expiry: null });
          }
          const group = groupedMap.get(key)!;
          group.total_quantity = (group.total_quantity || 0) + item.quantity;
          group.batch_count = (group.batch_count || 0) + 1;
          
          if (item.expiry_date) {
              if (!group.earliest_expiry || new Date(item.expiry_date) < new Date(group.earliest_expiry)) {
                  group.earliest_expiry = item.expiry_date;
              }
          }

          if (item.expiry_date && !item.is_ghost) {
              const days = differenceInDays(new Date(item.expiry_date), today);
              if (days <= 5) {
                  const reason = days <= 0 ? 'Caducado' : `Caduca en ${days} días`;
                  if (!alertsMap.has(key)) alertsMap.set(key, { id: item.id, name: item.name, reasons: [reason], severity: days <= 2 ? 'panic' : 'low', type: 'expiry' });
                  else {
                      const ex = alertsMap.get(key);
                      if(!ex.reasons.includes(reason)) ex.reasons.push(reason);
                      if (days <= 2) ex.severity = 'panic';
                      ex.type = ex.type === 'stock' ? 'mixed' : 'expiry';
                  }
              }
          }
      });

      Array.from(groupedMap.values()).forEach(group => {
          if (!group.is_ghost && (group.min_quantity || 0) > 0) {
              if ((group.total_quantity || 0) <= (group.min_quantity || 0)) {
                  const key = group.name.toLowerCase();
                  const reason = `Quedan ${group.total_quantity} (Mínimo: ${group.min_quantity})`;
                  if (!alertsMap.has(key)) alertsMap.set(key, { id: group.id+'_stock', name: group.name, reasons: [reason], severity: 'panic', type: 'stock' });
                  else {
                      const ex = alertsMap.get(key);
                      ex.reasons.push(reason);
                      ex.severity = 'panic';
                      ex.type = 'mixed';
                  }
              }
          }
      });

      setAlertItems(Array.from(alertsMap.values()).sort((a, b) => (a.severity === 'panic' ? -1 : 1)));
      setGroupedInventory(Array.from(groupedMap.values()));
  };

  const handleConsume = async () => {
    if (!selectedProduct || !consumeAmount) return;
    const amountToConsume = Number(consumeAmount);
    if (amountToConsume <= 0) return;

    const batches = rawInventoryItems
        .filter(i => i.name.toLowerCase() === selectedProduct.name.toLowerCase())
        .sort((a, b) => {
             if (!a.expiry_date) return 1;
             if (!b.expiry_date) return -1;
             return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        });

    let remaining = amountToConsume;
    let consumedLog = 0;

    for (const batch of batches) {
        if (remaining <= 0) break;
        if (batch.quantity <= remaining) {
            remaining -= batch.quantity;
            consumedLog += batch.quantity;
            await supabase.from('inventory_items').delete().eq('id', batch.id);
        } else {
            const newQty = batch.quantity - remaining;
            consumedLog += remaining;
            remaining = 0;
            await supabase.from('inventory_items').update({ quantity: newQty } as any).eq('id', batch.id);
        }
    }
    toast({ title: "Consumido", description: `Has gastado ${consumedLog} de ${selectedProduct.name}.` });
    setConsumeAmount('');
    fetchData(); 
  };

  // --- MUDANZA INDIVIDUAL ---
  const handleMoveBatch = async (batch: InventoryItem, newLocation: string, quantityToMove: number) => {
      if (!newLocation || quantityToMove <= 0) return;

      if (quantityToMove >= batch.quantity) {
          await supabase.from('inventory_items').update({ location: newLocation } as any).eq('id', batch.id);
          toast({ title: "Mudanza completa", description: `Todo el lote movido a ${newLocation}` });
      } else {
          const remainingQty = batch.quantity - quantityToMove;
          await supabase.from('inventory_items').update({ quantity: remainingQty } as any).eq('id', batch.id);
          const { id, created_at, updated_at, ...itemData } = batch; 
          await supabase.from('inventory_items').insert({ ...itemData, quantity: quantityToMove, location: newLocation, household_id: householdId } as any);
          toast({ title: "Lote dividido", description: `${quantityToMove} movidos a ${newLocation}.` });
      }
      fetchData();
  };

  // --- MUDANZA MASIVA (NUEVO) ---
  const handleMoveAllBatches = async (newLocation: string) => {
      if (!selectedProduct || !newLocation) return;
      
      const { error } = await supabase.from('inventory_items')
          .update({ location: newLocation } as any)
          .eq('household_id', householdId)
          .ilike('name', selectedProduct.name); // Case insensitive match

      if (error) {
          toast({ title: "Error", description: "No se pudo mover todo.", variant: "destructive" });
      } else {
          toast({ title: "Reorganizado", description: `Todo el stock movido a ${newLocation}.` });
          fetchData();
      }
  };

  const handleReceiveItem = async (item: any) => {
    try {
        const finalLocation = tempLocs[item.id] || 'Despensa';
        let minQty = 2; if (item.priority === 'panic') minQty = 4; if (item.priority === 'low') minQty = 2;
        const { error } = await supabase.from('inventory_items').insert({
            household_id: householdId, name: item.item_name, category: item.category || 'Pantry', quantity: item.quantity || 1, unit: 'uds', status: 'stocked', min_quantity: minQty, is_ghost: item.is_ghost || false,
            expiry_date: tempDates[item.id] ? format(tempDates[item.id]!, 'yyyy-MM-dd') : null, location: finalLocation
        });
        if (error) throw error;
        await supabase.from('shopping_list').delete().eq('id', item.id);
        toast({ title: "Guardado", description: `${item.item_name} guardado.` });
        fetchData();
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDeleteInventoryItem = async (id: string) => {
    if (!confirm("¿Borrar este lote?")) return;
    await supabase.from('inventory_items').delete().eq('id', id);
    fetchData();
  };

  const filteredGroupedInventory = groupedInventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    const matchesLocation = selectedLocation && selectedLocation !== 'all' ? item.location === selectedLocation : true;
    return matchesSearch && matchesCategory && matchesLocation;
  });
  const availableLocations = Array.from(new Set(rawInventoryItems.map(i => i.location).filter(Boolean))).sort();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) { onClose(); setSelectedProduct(null); } }}>
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
                 {/* ZONA CONSUMO */}
                 <div className="p-6 border-b border-zinc-800 flex flex-col items-center gap-4 bg-zinc-900/30">
                     <div className="text-center">
                         <div className="text-4xl font-bold font-mono text-white mb-1">
                             {selectedProduct.total_quantity} <span className="text-lg text-zinc-500">{selectedProduct.unit || 'uds'}</span>
                         </div>
                         <div className="text-xs text-zinc-500 uppercase tracking-widest">Disponible Total</div>
                     </div>

                     <div className="w-full max-w-xs flex gap-2 items-center bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                         <Input type="number" placeholder="Gastar..." className="bg-transparent border-none text-right text-lg font-bold focus-visible:ring-0" value={consumeAmount} onChange={(e) => setConsumeAmount(e.target.value)} />
                         <span className="text-zinc-500 text-sm font-bold pr-2">{selectedProduct.unit || 'uds'}</span>
                     </div>

                     <Button size="lg" className="w-full max-w-xs bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-900/20" onClick={handleConsume} disabled={!consumeAmount || Number(consumeAmount) <= 0}>
                         <Minus className="w-5 h-5 mr-2" /> Gastar
                     </Button>
                 </div>

                 {/* LISTA DE LOTES (Con Mudanza Inteligente) */}
                 <ScrollArea className="flex-1 p-4">
                     <div className="flex items-center justify-between mb-3 px-1 border-b border-zinc-800 pb-2">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase">Desglose de Lotes</h4>
                        
                        {/* --- BOTÓN MOVER TODO --- */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 gap-1 px-2 border border-blue-900/30">
                                    <Layers className="w-3 h-3" /> Mover todo el Stock
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2 bg-zinc-950 border-zinc-700">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] uppercase font-bold text-zinc-500 px-2">Mover todo a...</span>
                                    <div className="grid grid-cols-1 gap-1 max-h-[160px] overflow-y-auto">
                                        {DEFAULT_LOCATIONS.map(loc => (
                                            <button key={loc} onClick={() => handleMoveAllBatches(loc)} className="text-left text-xs text-zinc-300 hover:bg-blue-600 hover:text-white px-2 py-1.5 rounded transition-colors border border-zinc-800">
                                                {loc}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                     </div>
                     
                     <div className="space-y-2">
                         {rawInventoryItems
                            .filter(i => i.name.toLowerCase() === selectedProduct.name.toLowerCase())
                            .sort((a,b) => new Date(a.expiry_date||'9999').getTime() - new Date(b.expiry_date||'9999').getTime())
                            .map(batch => (
                                <InventoryBatchRow 
                                    key={batch.id} 
                                    batch={batch} 
                                    onDelete={handleDeleteInventoryItem}
                                    onMove={handleMoveBatch} 
                                />
                            ))
                         }
                     </div>
                 </ScrollArea>
                 
                 <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                      <AddItemDialog onItemAdded={fetchData}>
                      <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold border border-blue-400/20">
                        <Plus className="w-4 h-4 mr-2" /> Añadir Lote Nuevo (Compra Manual)
                    </Button>
                      </AddItemDialog>
                 </div>
             </div>
        ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
            <TabsList className="grid w-full grid-cols-3 bg-zinc-950">
              <TabsTrigger value="reception">Recepción {receptionItems.length > 0 && <Badge className="ml-2 bg-blue-600 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">{receptionItems.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="pantry">Mi Despensa</TabsTrigger>
              <TabsTrigger value="alerts" className="data-[state=active]:text-red-400">Avisos {alertItems.length > 0 && <Badge className="ml-2 bg-red-600 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">{alertItems.length}</Badge>}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="reception" className="flex-1 overflow-hidden flex flex-col p-0 m-0">
            {receptionItems.length === 0 ? <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center min-h-[150px]"><CheckCircle2 className="w-10 h-10 mb-3 opacity-20" /><p className="text-sm">Todo colocado.</p></div> : 
             <ScrollArea className="flex-1 p-4"><div className="space-y-3">{receptionItems.map((item) => (
                    <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col gap-3">
                      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="font-bold text-white text-lg">{item.item_name}</span></div><Badge variant="outline" className="border-zinc-700 text-zinc-400">{item.category}</Badge></div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full mt-1">
                        <div className="flex-1 min-w-[140px]">{customLocMode[item.id] ? (<div className="flex gap-1"><Input placeholder="Lugar..." className="h-8 text-xs bg-zinc-950 border-blue-500/50" autoFocus value={tempLocs[item.id] || ''} onChange={(e) => setTempLocs(prev => ({...prev, [item.id]: e.target.value}))}/><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setCustomLocMode(prev => ({...prev, [item.id]: false}))}><X className="w-3 h-3"/></Button></div>) : (<Select value={tempLocs[item.id] || 'Despensa'} onValueChange={(val) => { if (val === 'custom') setCustomLocMode(prev => ({...prev, [item.id]: true})); else setTempLocs(prev => ({...prev, [item.id]: val})); }}><SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-700"><div className="flex items-center gap-2 text-zinc-400"><Home className="w-3 h-3" /><SelectValue placeholder="Ubicación" /></div></SelectTrigger><SelectContent className="bg-zinc-900 border-zinc-800 text-white">{DEFAULT_LOCATIONS.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}<SelectItem value="custom" className="text-blue-400 font-bold">+ Otro...</SelectItem></SelectContent></Select>)}</div>
                        <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("h-8 text-xs flex-1 justify-start border-0", !tempDates[item.id] ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700" : "bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-md shadow-blue-900/20")}><CalendarIcon className="w-3 h-3 mr-2 shrink-0" />{tempDates[item.id] ? format(tempDates[item.id]!, 'dd/MM/yy') : 'Caducidad'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800 text-zinc-100"><Calendar mode="single" selected={tempDates[item.id]} onSelect={(d) => setTempDates(prev => ({...prev, [item.id]: d}))} initialFocus className="bg-zinc-950 text-white rounded-md border-zinc-800" /></PopoverContent></Popover>
                        <Button size="sm" className="h-8 bg-green-600 hover:bg-green-500 text-white gap-1 w-full sm:w-auto" onClick={() => handleReceiveItem(item)}>Confirmar <ArrowRight className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  ))}</div></ScrollArea>}
          </TabsContent>

          <TabsContent value="pantry" className="flex-1 flex flex-col min-h-0 mt-0">
             <div className="p-3 border-b border-zinc-800 bg-zinc-900 shrink-0 space-y-3">
                <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" /><Input placeholder="Buscar producto..." className="pl-8 h-9 bg-zinc-950 border-zinc-800 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div><Select value={selectedLocation} onValueChange={setSelectedLocation}><SelectTrigger className="w-[140px] h-9 bg-zinc-950 border-zinc-800 text-xs"><div className="flex items-center gap-2 truncate"><MapPin className="w-3.5 h-3.5 text-blue-400" /><SelectValue placeholder="Sitio" /></div></SelectTrigger><SelectContent className="bg-zinc-900 border-zinc-800 text-white"><SelectItem value="all">Todos los sitios</SelectItem>{availableLocations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent></Select></div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"><button onClick={() => setSelectedCategory(null)} className={cn("px-3 py-1 rounded-full text-xs font-bold border transition-all whitespace-nowrap", !selectedCategory ? "bg-white text-black" : "bg-zinc-900 border-zinc-700 text-zinc-500")}>Todo</button>{Object.keys(CATEGORY_ICONS).map(cat => { const conf = CATEGORY_ICONS[cat]; const isSel = selectedCategory === cat; return (<button key={cat} onClick={() => setSelectedCategory(isSel ? null : cat)} className={cn("flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition-all whitespace-nowrap", isSel ? `${conf.color} border-current` : "bg-zinc-900 border-zinc-700 text-zinc-500")}>{conf.icon} {conf.label}</button>)})}</div>
            </div>
            <ScrollArea className="flex-1 p-0 bg-zinc-950">
                <div className="p-3 space-y-2">
                    {filteredGroupedInventory.length === 0 ? <div className="text-center text-zinc-500 py-10 text-sm">Vacío.</div> : filteredGroupedInventory.map(item => {
                            const catConf = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.Pantry;
                            return (
                                <div key={item.id} onClick={() => setSelectedProduct(item)} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 flex items-center gap-3 transition-all hover:bg-zinc-900 cursor-pointer hover:border-blue-500/30 group">
                                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", catConf.color)}>{catConf.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2"><span className="font-bold text-sm text-zinc-200 truncate">{item.name}</span>{item.is_ghost && <Ghost className="w-3 h-3 text-purple-500" />}{item.batch_count && item.batch_count > 1 && (<span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 rounded">{item.batch_count} lotes</span>)}</div>
                                        <div className="text-xs text-zinc-500 flex flex-wrap gap-2 mt-1"><span className="bg-zinc-800 px-1.5 rounded text-white font-mono">{item.total_quantity} {item.unit || 'uds'}</span>{item.earliest_expiry && (<span className={cn(new Date(item.earliest_expiry) < new Date() ? "text-red-400 font-bold" : "text-zinc-500")}>Cad: {format(new Date(item.earliest_expiry), 'dd/MM/yy')}</span>)}</div>
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
             <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                    {alertItems.map(item => (
                        <div key={item.id} className={cn("rounded-lg border p-3 flex items-center gap-3 bg-zinc-900/60", item.severity === 'panic' ? "border-red-500/50" : "border-orange-500/50")}>
                            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", item.severity === 'panic' ? "bg-red-500/20 text-red-500" : "bg-orange-500/20 text-orange-500")}>{item.type === 'expiry' || item.type === 'mixed' ? <Skull className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}</div>
                            <div className="flex-1"><div className="font-bold text-sm text-zinc-200">{item.name}</div><div className="flex flex-col gap-0.5 mt-1">{item.reasons.map((r: string, idx: number) => (<span key={idx} className="text-xs font-semibold block" style={{ color: item.severity === 'panic' ? '#f87171' : '#fb923c' }}>• {r}</span>))}</div></div>
                        </div>
                    ))}
                </div>
             </ScrollArea>
          </TabsContent>
        </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};