import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InventoryItem, ProductDefinition } from '@/lib/types'; 
import { 
  Package, Search, Calendar as CalendarIcon, MapPin, 
  CheckCircle2, AlertTriangle, AlertCircle, Ghost, Skull,
  ArrowRight, Plus, Trash2, X, Home, ChevronLeft, ChevronRight, Minus, ArrowRightLeft,
  Split, Layers, Settings, Save, Info, Zap, ShoppingCart, Pencil, Check, Divide
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
import { Checkbox } from "@/components/ui/checkbox";
import { LocationAutocomplete } from './LocationAutocomplete';

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


// Helper seguro para fechas (Evita crash en móviles antiguos)
const safeDate = (d: string | null | undefined) => {
    if (!d) return undefined;
    const date = new Date(d);
    return isNaN(date.getTime()) ? undefined : date;
};



// --- SUB-COMPONENTE: RECEPTION ROW (Con selector GHOST añadido) ---
const ReceptionRow = ({ item, householdId, onReceive }: { item: any, householdId: string, onReceive: () => void }) => {
    const { toast } = useToast();
    const [qty, setQty] = useState<string>(item.quantity?.toString() || '1');
    const [unit, setUnit] = useState<string>(item.unit || 'uds'); 
    const [loc, setLoc] = useState('');
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [isChecking, setIsChecking] = useState(true);
    const [isNewProduct, setIsNewProduct] = useState(false);
    
    // Estado local para controlar si es Ghost aquí y ahora
    const [isGhostMode, setIsGhostMode] = useState(item.is_ghost || false);
    
    const [priorityMode, setPriorityMode] = useState<'critical'|'high'|'normal'>(item.priority || 'normal');
    const [manualMinQty, setManualMinQty] = useState<string>('');

    useEffect(() => {
        const check = async () => {
            // Si ya venía como ghost de la lista, respetamos eso inicialmente, pero permitimos cambiarlo
            // Quitamos el return anticipado para permitir editar si deja de ser ghost
            const { data } = await supabase.from('product_definitions')
                .select('id, unit').eq('household_id', householdId).ilike('name', item.item_name).maybeSingle();
            
            if (!data) setIsNewProduct(true);
            else if (data.unit) setUnit(data.unit);
            
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
                    // AQUÍ USAMOS LA NUEVA LÓGICA GHOST
                    importance_level: isGhostMode ? 'ghost' : priorityMode,
                    min_quantity: (!isGhostMode && manualMinQty) ? Number(manualMinQty) : null,
                    is_ghost: isGhostMode
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

            await supabase.from('inventory_items').delete().eq('product_id', productId).eq('quantity', 0);
            await supabase.from('shopping_list').delete().eq('id', item.id);
            
            toast({ title: "Guardado", description: `${item.item_name} añadido al stock.` });
            onReceive();
        } catch (e: any) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    if (isChecking) return <div className="p-4 text-xs text-zinc-500">Cargando...</div>;

    return (
        <div className={cn("bg-zinc-900 border rounded-lg p-3 mb-2 flex flex-col gap-2 transition-colors", isNewProduct ? "border-blue-500/30 bg-blue-900/5" : "border-zinc-800")}>
            <div className="flex justify-between items-start">
                <div>
                    <span className="font-bold text-white block">{item.item_name}</span>
                    <Badge variant="outline" className="text-[10px] text-zinc-400 mt-1">{item.category}</Badge>
                </div>
                {/* Badge visual solo informativo */}
                {isGhostMode && <Badge variant="secondary" className="bg-purple-900/50 text-purple-300 border-purple-500/50"><Ghost className="w-3 h-3 mr-1"/> Ghost</Badge>}
                {isNewProduct && !isGhostMode && <Badge className="bg-blue-600 animate-pulse">NUEVO</Badge>}
            </div>

            {/* ZONA DE CONFIGURACIÓN DE PRODUCTO NUEVO */}
            {isNewProduct && (
                <div className="bg-black/20 p-2 rounded border border-blue-500/20 flex flex-col gap-2">
                    
                    {/* TOGGLE GHOST */}
                    <div className="flex items-center gap-2 mb-1">
                        <Checkbox 
                            id={`ghost-${item.id}`} 
                            checked={isGhostMode} 
                            onCheckedChange={(c: boolean) => setIsGhostMode(c)}
                            className="border-zinc-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                        />
                        <label htmlFor={`ghost-${item.id}`} className="text-xs text-zinc-300 cursor-pointer select-none flex items-center gap-1">
                            Es Ghost <Ghost className="w-3 h-3 text-purple-400"/> 
                            <span className="text-[9px] text-zinc-500 ml-1">(No avisa al agotarse)</span>
                        </label>
                    </div>

                    {/* SI NO ES GHOST, MOSTRAMOS IMPORTANCIA Y MINIMO */}
                    {!isGhostMode && (
                        <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-1">
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

                <div className="flex-1">
                    <LocationAutocomplete
                        value={loc}
                        onChange={setLoc}
                        householdId={householdId}
                        placeholder="Lugar..."
                    />
                </div>

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

/// --- SUB-COMPONENTE: FILA DE LOTE (CORREGIDO: Colores y Celda Vacía) ---
const InventoryBatchRow = ({ 
    batch, 
    onDelete, 
    onMove, 
    onRefresh 
}: { 
    batch: InventoryItem, 
    onDelete: (id: string) => void, 
    onMove: (batch: InventoryItem, newLoc: string, qty: number, dates?: { origin: Date|undefined, dest: Date|undefined }) => void,
    onRefresh: () => void
}) => {
    const { toast } = useToast();
    // Estado Mudanza
    const [moveQty, setMoveQty] = useState<string>(batch.quantity.toString());
    const [isOpen, setIsOpen] = useState(false);
    // Estado Split Fechas
    const [splitDateMode, setSplitDateMode] = useState(false);
    const [splitDateOrigin, setSplitDateOrigin] = useState<Date | undefined>(safeDate(batch.expiry_date));
    const [splitDateDest, setSplitDateDest] = useState<Date | undefined>(safeDate(batch.expiry_date));
    
    // CORRECCIÓN 1: Iniciar vacío para que no pre-rellene texto y el buscador funcione limpio
    const [moveLocation, setMoveLocation] = useState(''); 

    const handleMove = () => {
        const q = Number(moveQty);
        if (q <= 0 || q > batch.quantity) {
            toast({ title: "Error", description: "Cantidad inválida", variant: "destructive" });
            return;
        }
        if (!moveLocation.trim()) {
             toast({ title: "Falta destino", description: "Elige una ubicación.", variant: "destructive" });
             return;
        }

        const dates = splitDateMode 
            ? { origin: splitDateOrigin, dest: splitDateDest }
            : undefined;
        
        onMove(batch, moveLocation, q, dates);
        setIsOpen(false);
        setSplitDateMode(false);
        setSplitDateOrigin(safeDate(batch.expiry_date));
        setSplitDateDest(safeDate(batch.expiry_date));
        setMoveLocation(''); // Resetear al terminar
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex flex-col gap-2 group hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    <div className="flex flex-col">
                        <span className="font-mono text-sm text-white font-bold">{batch.quantity} {batch.unit || 'uds'}</span>
                        {batch.expiry_date && (
                            <span className={cn("text-[10px] font-bold", differenceInDays(new Date(batch.expiry_date), new Date()) < 0 ? "text-red-500 animate-pulse" : "text-zinc-500")}>
                                Cad: {format(new Date(batch.expiry_date), 'dd/MM/yy')}
                            </span>
                        )}
                    </div>
                    
                    {/* Divisor Visual */}
                    <div className="w-px h-8 bg-zinc-600/50"></div> 
                    
                    <span className="text-xs text-zinc-300 flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-blue-500"/> {batch.location || '—'}
                    </span>
                </div>
                <div className="flex gap-1">
                    <Popover open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-900/20 hover:text-blue-400 text-zinc-400">
                                <ArrowRightLeft className="w-4 h-4"/>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-3 bg-zinc-950 border-zinc-700">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                    <h4 className="text-[10px] uppercase font-bold text-zinc-400">Mover Lote</h4>
                                </div>
                                
                                <div className="flex gap-2 items-center">
                                    {/* CORRECCIÓN 2: text-white añadido al Input de cantidad */}
                                    <Input 
                                        type="number" 
                                        className="h-8 text-xs bg-zinc-900 border-zinc-700 w-20 text-center font-bold text-white" 
                                        value={moveQty} 
                                        onChange={e => setMoveQty(e.target.value)} 
                                        max={batch.quantity} 
                                        min={1} 
                                    />
                                    <span className="text-xs text-zinc-500">de {batch.quantity}</span>
                                </div>

                                <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded border border-zinc-800">
                                    <Checkbox checked={splitDateMode} onCheckedChange={(c: boolean) => setSplitDateMode(c)} className="h-3 w-3 border-zinc-600"/>
                                    <span className="text-[10px] text-zinc-400 flex items-center gap-1"><Split className="w-3 h-3"/> Cambiar fechas</span>
                                </div>

                                {splitDateMode && (
                                    <div className="grid grid-cols-2 gap-2 p-2 bg-black/20 rounded animate-in fade-in">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] text-blue-400 uppercase font-bold">Fecha Origen</span>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    {/* CORRECCIÓN 3: text-white añadido al botón de fecha */}
                                                    <Button variant="outline" className="h-7 text-[10px] px-1 border-zinc-700 bg-zinc-900 justify-start text-white">
                                                        {splitDateOrigin ? format(splitDateOrigin, 'dd/MM') : <span className="text-zinc-600">Sin</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="p-0 bg-zinc-950 border-zinc-800"><Calendar mode="single" selected={splitDateOrigin} onSelect={setSplitDateOrigin} className="bg-zinc-950 text-white"/></PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] text-purple-400 uppercase font-bold">Fecha Destino</span>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    {/* CORRECCIÓN 3: text-white añadido al botón de fecha */}
                                                    <Button variant="outline" className="h-7 text-[10px] px-1 border-zinc-700 bg-zinc-900 justify-start text-white">
                                                        {splitDateDest ? format(splitDateDest, 'dd/MM') : <span className="text-zinc-600">Sin</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="p-0 bg-zinc-950 border-zinc-800"><Calendar mode="single" selected={splitDateDest} onSelect={setSplitDateDest} className="bg-zinc-950 text-white"/></PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <Label className="text-[10px] text-zinc-500 uppercase font-bold">Destino</Label>
                                    <LocationAutocomplete
                                        value={moveLocation}
                                        onChange={setMoveLocation}
                                        householdId={batch.household_id}
                                        placeholder="Destino..."
                                    />
                                </div>

                                <Button 
                                    size="sm" 
                                    className="h-8 bg-blue-600 hover:bg-blue-500 text-white w-full" 
                                    onClick={handleMove}
                                >
                                    <Check className="w-3 h-3 mr-1"/> Confirmar Movimiento
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-900/20 hover:text-red-500 text-zinc-500" onClick={() => onDelete(batch.id)}>
                        <Trash2 className="w-4 h-4"/>
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
export const StockModal: React.FC<StockModalProps> = ({ isOpen, onClose, householdId }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('reception');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [groupedInventory, setGroupedInventory] = useState<any[]>([]);
  const [rawInventoryItems, setRawInventoryItems] = useState<InventoryItem[]>([]);
  const [receptionItems, setReceptionItems] = useState<any[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
  const [suggestionAlerts, setSuggestionAlerts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [consumeAmount, setConsumeAmount] = useState('');
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [isMassCustomMode, setIsMassCustomMode] = useState(false);
  const [massCustomLoc, setMassCustomLoc] = useState('');
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editIsGhost, setEditIsGhost] = useState(false);
  const [editPriority, setEditPriority] = useState<'critical'|'high'|'normal'>('normal');
  const [editMinQty, setEditMinQty] = useState('');

  // PEGAR ESTO ANTES DE "const fetchData"
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
                has_expiring_batch: false,
                batches: []
            });
        }
        const group = groupedMap.get(key)!;
        
        // Sumar SIEMPRE al total (Aquí es donde arreglamos el error de "0 uds")
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

    // Generar Alertas (Recuperando tu lógica original que funcionaba)
    groupedMap.forEach(group => {
        if (group.is_ghost) return; 
        const threshold = group.min_quantity !== null ? group.min_quantity : (group.importance_level==='critical'?4:group.importance_level==='high'?2:1);
        
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
    setGroupedInventory(Array.from(groupedMap.values()));
};
const fetchData = useCallback(async () => {
    if (!householdId) return;

    // 1. Pedimos la lista de la compra (Recepción)
    const { data: receptionData } = await supabase.from('shopping_list').select('*').eq('household_id', householdId).eq('status', 'bought').order('created_at', { ascending: false });
    if (receptionData) setReceptionItems(receptionData);

    // 2. Pedimos TODO el inventario en crudo (SIN usar rpc, para evitar errores)
    const { data: inventoryData } = await supabase.from('inventory_items').select('*, product:product_definitions(*)').eq('household_id', householdId).order('expiry_date', { ascending: true });
    
    if (inventoryData) {
        setRawInventoryItems(inventoryData as InventoryItem[]);
        // Llamamos a la calculadora manual de arriba
        processInventory(inventoryData);
    }
  }, [householdId]);

 
  useEffect(() => { if (isOpen) fetchData(); }, [isOpen, fetchData]);

  useEffect(() => {
    if (isOpen && lastSelectedId && !selectedProduct) {
        const found = groupedInventory.find(i => i.product_id === lastSelectedId);
        if (found) setSelectedProduct(found);
    }
  }, [isOpen, groupedInventory, lastSelectedId, selectedProduct]);

  const handleDeleteProduct = async () => {
    if (!selectedProduct || !confirm("⚠️ BORRADO TOTAL: Eliminarás el producto y TODOS sus lotes. ¿Seguro?")) return;
    await supabase.from('product_definitions').delete().eq('id', selectedProduct.product_id);
    toast({ title: "Eliminado", description: `${selectedProduct.name} y sus lotes fueron borrados.`, variant: "destructive" });
    setSelectedProduct(null);
    setLastSelectedId(null);
    fetchData();
  };

  const handleUpdateDefinition = async () => {
    if (!selectedProduct) return;
    await supabase.from('product_definitions')
        .update({
            is_ghost: editIsGhost,
            importance_level: editIsGhost ? 'ghost' : editPriority,
            min_quantity: editMinQty ? Number(editMinQty) : null
        } as any)
        .eq('id', selectedProduct.product_id);
    
    toast({ title: "Actualizado", description: "Configuración guardada." });
    setIsEditingSettings(false);
    fetchData();
  };

  const handleMoveBatch = async (
    batch: InventoryItem, 
    newLoc: string, 
    qty: number, 
    dates?: { origin: Date|undefined, dest: Date|undefined }
  ) => {
    try {
        const originDate = dates?.origin ? format(dates.origin, 'yyyy-MM-dd') : batch.expiry_date;
        const destDate = dates?.dest ? format(dates.dest, 'yyyy-MM-dd') : batch.expiry_date;

        if (qty >= batch.quantity) {
            await supabase.from('inventory_items')
                .update({ location: newLoc, expiry_date: destDate } as any)
                .eq('id', batch.id);
        } else {
            await supabase.from('inventory_items')
                .update({ quantity: batch.quantity - qty, expiry_date: originDate } as any)
                .eq('id', batch.id);
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
        toast({ title: "Movido", description: `${qty} ${batch.unit || 'uds'} a ${newLoc}.` });
        fetchData();
    } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleMoveAllBatches = async (destination: string) => {
    if (!selectedProduct) return;
    try {
        const batches = rawInventoryItems.filter(i => i.product_id === selectedProduct.product_id && i.quantity > 0);
        for (const batch of batches) {
            await supabase.from('inventory_items')
                .update({ location: destination } as any)
                .eq('id', batch.id);
        }
        toast({ title: "Movido", description: `Todo el stock a ${destination}.` });
        fetchData();
    } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleConsume = async () => {
    if (!selectedProduct || !consumeAmount) return;
    const qty = Number(consumeAmount);
    if (qty <= 0 || qty > selectedProduct.total_quantity) {
        toast({ title: "Error", description: "Cantidad inválida.", variant: "destructive" });
        return;
    }

    try {
        let remaining = qty;
        const batches = rawInventoryItems
            .filter(i => i.product_id === selectedProduct.product_id && i.quantity > 0)
            .sort((a,b) => new Date(a.expiry_date || '9999').getTime() - new Date(b.expiry_date || '9999').getTime());

        for (const batch of batches) {
            if (remaining <= 0) break;
            if (batch.quantity >= remaining) {
                const newQty = batch.quantity - remaining;
                if (newQty === 0 && !selectedProduct.is_ghost) {
                    // Persistencia a 0 (Modo Importancia)
                    await supabase.from('inventory_items')
                        .update({ quantity: 0, expiry_date: null } as any)
                        .eq('id', batch.id);
                } else if (newQty === 0 && selectedProduct.is_ghost) {
                    // Muerte Total (Modo Ghost)
                    await supabase.from('inventory_items').delete().eq('id', batch.id);
                } else {
                    await supabase.from('inventory_items')
                        .update({ quantity: newQty } as any)
                        .eq('id', batch.id);
                }
                remaining = 0;
            } else {
                remaining -= batch.quantity;
                if (selectedProduct.is_ghost) {
                    // GHOST: Muerte Real
                    await supabase.from('inventory_items').delete().eq('id', batch.id);
                } else {
                    // IMPORTANCIA: Persistencia a 0
                    await supabase.from('inventory_items')
                        .update({ quantity: 0, expiry_date: null } as any)
                        .eq('id', batch.id);
                }
            }
        }
        
        toast({ title: "Gastado", description: `${qty} ${selectedProduct.unit || 'uds'} consumidos.` });
        setConsumeAmount('');
        fetchData();
    } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // --- FUNCIÓN MODIFICADA: Borrado de Lote (Small Trash Can) ---
  const handleDeleteInventoryItem = async (id: string) => {
    if (!confirm("¿Borrar este lote?")) return;
    
    // Contar cuántos lotes REALES (qty > 0) quedan
    const activeBatches = rawInventoryItems.filter(i => i.product_id === selectedProduct.product_id && i.quantity > 0);
    const isLastActiveBatch = activeBatches.length <= 1; // El que vamos a borrar es el último

    if (isLastActiveBatch) {
        if (selectedProduct.is_ghost) {
            // Caso GHOST: Muerte total
            await supabase.from('product_definitions').delete().eq('id', selectedProduct.product_id);
            toast({ title: "Ghost Eliminado", description: "Producto borrado del sistema." });
            setSelectedProduct(null);
        } else {
            // Caso NORMAL (Importancia): Persistencia a 0
            await supabase.from('inventory_items')
                .update({ quantity: 0, expiry_date: null } as any)
                .eq('id', id);
            toast({ title: "Lote Agotado", description: "Se mantiene aviso de stock 0.", variant: "destructive" });
        }
    } else {
        // Caso Estándar: Hay más lotes, borrar solo este
        await supabase.from('inventory_items').delete().eq('id', id);
    }
    
    fetchData();
  };

  // Wrapper para limpiar lotes 0 tras inserción manual
  const handleBatchAddedManual = async () => {
    if (selectedProduct) {
        // Auto-Limpieza
        await supabase.from('inventory_items')
            .delete()
            .eq('product_id', selectedProduct.product_id)
            .eq('quantity', 0);
    }
    fetchData();
  }

  const filteredGroupedInventory = groupedInventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) { onClose(); setSelectedProduct(null); setLastSelectedId(null); } }}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-full max-w-2xl max-h-[90vh] h-auto flex flex-col p-0 gap-0">
        
        <DialogHeader className="p-4 border-b border-zinc-800 bg-zinc-900 shrink-0">
          <div className="flex items-center justify-between">
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
              {selectedProduct && (
                  <Button variant="ghost" size="icon" className="text-zinc-600 hover:text-red-500 hover:bg-red-900/10" onClick={handleDeleteProduct} title="Borrado Total (Producto + Lotes)">
                      <Trash2 className="w-5 h-5" />
                  </Button>
              )}
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
                                <div className={cn("text-4xl font-bold font-mono mb-1", selectedProduct.total_quantity === 0 ? "text-red-500 animate-pulse" : "text-white")}>
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
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-blue-900/30 pb-1 mb-2">
                            Desglose de Lotes</h4>
                        
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
                                    </div>
                                    
                                    <div className="px-1">
                                        <LocationAutocomplete
                                            value={massCustomLoc}
                                            onChange={setMassCustomLoc}
                                            householdId={householdId}
                                            placeholder="Destino..."
                                        />
                                    </div>
                                    <Button 
                                        size="sm" 
                                        className="h-7 bg-blue-600 hover:bg-blue-500 text-white text-xs mt-1 mx-1" 
                                        onClick={() => {
                                            if (massCustomLoc) {
                                                handleMoveAllBatches(massCustomLoc); 
                                                setIsMassCustomMode(false); 
                                                setMassCustomLoc('');
                                            }
                                        }}
                                        disabled={!massCustomLoc}
                                    >
                                        <Check className="w-3 h-3 mr-1"/> Confirmar
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                     </div>
                     <div className="space-y-2">
                         {rawInventoryItems
                            .filter(i => i.product_id === selectedProduct.product_id && i.quantity > 0) // FILTRO OCULTAR 0 UDS
                            .sort((a,b) => new Date(a.expiry_date||'9999').getTime() - new Date(b.expiry_date||'9999').getTime())
                            .map(batch => (<InventoryBatchRow key={batch.id} batch={batch} onDelete={handleDeleteInventoryItem} onMove={handleMoveBatch} onRefresh={fetchData} />))
                         }
                         {/* Mensaje de estado limpio si solo hay lotes virtuales */}
                         {rawInventoryItems.some(i => i.product_id === selectedProduct.product_id && i.quantity === 0) && rawInventoryItems.filter(i => i.product_id === selectedProduct.product_id && i.quantity > 0).length === 0 && (
                            <div className="text-center py-6 text-zinc-500 text-xs italic">
                                Stock agotado. El producto se mantiene visible en la lista principal.
                            </div>
                         )}
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
                        onBatchAdded={handleBatchAddedManual}
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
            {/* ✅ FIX #2: SCROLL AREA WITH FIXED HEIGHT */}
            <ScrollArea className="h-[calc(100vh-220px)] w-full pr-4">
                <div className="p-3 space-y-2">
                    {filteredGroupedInventory.length === 0 ? <div className="text-center text-zinc-500 py-10 text-sm">Vacío.</div> : filteredGroupedInventory.map(item => {
                            const catConf = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.Pantry;
                            const threshold = item.min_quantity !== null ? item.min_quantity : (item.importance_level==='critical'?4:item.importance_level==='high'?2:1);
                            
                            // Visualización en lista: También usa la lógica "Stock Efectivo" para el color rojo
                            const isCriticalReal = (item.healthy_quantity <= threshold && ['critical','high'].includes(item.importance_level)) || item.total_quantity === 0;
                            
                            return (
                                <div key={item.product_id} onClick={() => setSelectedProduct(item)} className={cn("rounded-lg border bg-zinc-900/40 p-3 flex items-center gap-3 transition-all hover:bg-zinc-900 cursor-pointer group", isCriticalReal ? "border-red-500/30 bg-red-900/10" : "border-zinc-800")}>
                                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", catConf.color)}>{catConf.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2"><span className="font-bold text-sm text-zinc-200 truncate">{item.name}</span>{item.is_ghost && <Ghost className="w-3 h-3 text-purple-500" />}{item.batch_count > 1 && (<span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 rounded">{item.batch_count} lotes</span>)}</div>
                                        <div className="text-xs text-zinc-500 flex flex-wrap gap-2 mt-1">
                                            <span className={cn("bg-zinc-800 px-1.5 rounded font-mono", item.total_quantity === 0 ? "text-red-400 font-bold bg-red-900/20" : "text-white")}>
                                                {item.total_quantity} {item.unit || 'uds'}
                                            </span>
                                            {/* Calavera Morada si hay algo caducando */}
                                            {item.has_expiring_batch && (
                                                <Skull className="w-3 h-3 text-purple-500 ml-1 inline-block animate-pulse" />
                                            )}
                                            {item.earliest_expiry && (<span className={cn(differenceInDays(new Date(item.earliest_expiry), new Date()) < 0 ? "text-red-400 font-bold" : "text-zinc-500")}>Cad: {format(new Date(item.earliest_expiry), 'dd/MM/yy')}</span>)}
                                        </div>
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
                            <div key={item.product_id} className={cn("bg-red-900/10 border rounded-lg p-3 flex items-center gap-3", item.severity === 'critical' || item.total_quantity === 0 ? "border-red-500/40" : "border-orange-500/40")}>
                                <AlertTriangle className={cn("w-5 h-5 shrink-0", item.severity === 'critical' || item.total_quantity === 0 ? "text-red-500" : "text-orange-500")}/>
                                <div className="flex-1">
                                    <div className={cn("font-bold text-sm", item.severity === 'critical' || item.total_quantity === 0 ? "text-red-200" : "text-orange-200")}>{item.name}</div>
                                    <div className={cn("text-xs font-bold", item.severity === 'critical' || item.total_quantity === 0 ? "text-red-400" : "text-orange-400")}>{item.reason}</div>
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