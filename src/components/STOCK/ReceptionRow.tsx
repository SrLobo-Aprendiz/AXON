import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Ghost, ArrowRight, Loader2, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Corregida ruta de importación
import { LocationAutocomplete } from '@/components/LocationAutocomplete';

interface ShoppingItem {
  id: string;
  item_name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  priority?: 'critical' | 'high' | 'normal' | 'ghost';
  is_ghost?: boolean;
}

interface ReceptionRowProps {
  item: ShoppingItem;
  householdId: string;
  onReceive: () => void;
}

export const ReceptionRow: React.FC<ReceptionRowProps> = ({ item, householdId, onReceive }) => {
    const { toast } = useToast();
    
    // Estados básicos
    const [qty, setQty] = useState<string>(item.quantity?.toString() || '1');
    const [unit, setUnit] = useState<string>(item.unit || 'uds'); 
    const [loc, setLoc] = useState('');
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [store, setStore] = useState('');
    
    // Precio Inteligente (SELECTOR UNIFICADO)
    const [priceInput, setPriceInput] = useState('');
    const [priceType, setPriceType] = useState<'total' | 'unit'>('total');

    // Lógica
    const [isChecking, setIsChecking] = useState(true);
    const [isNewProduct, setIsNewProduct] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Config Producto
    const [isGhostMode, setIsGhostMode] = useState(item.is_ghost || false);
    const [priorityMode, setPriorityMode] = useState<'critical'|'high'|'normal'>(
        (item.priority === 'ghost' ? 'normal' : item.priority) || 'normal'
    );
    const [manualMinQty, setManualMinQty] = useState<string>('');

    useEffect(() => {
        const check = async () => {
            try {
                const { data } = await supabase.from('product_definitions')
                    .select('id, unit, is_ghost, importance_level')
                    .eq('household_id', householdId)
                    .ilike('name', item.item_name)
                    .maybeSingle();
                
                if (!data) {
                    setIsNewProduct(true);
                } else {
                    if (data.unit) setUnit(data.unit);
                    setIsGhostMode(data.is_ghost || false);
                }
            } catch (e) { console.error(e); } 
            finally { setIsChecking(false); }
        };
        check();
    }, [item, householdId]);

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            let productId: string;

            // 1. Calcular precio unitario
            let finalUnitPrice = 0;
            const q = parseFloat(qty) || 0;
            const p = parseFloat(priceInput) || 0;
            
            if (p > 0 && q > 0) {
                finalUnitPrice = priceType === 'total' ? (p / q) : p;
            }

            // 2. Obtener o Crear Producto
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
                    importance_level: isGhostMode ? 'ghost' : priorityMode,
                    min_quantity: (!isGhostMode && manualMinQty) ? Number(manualMinQty) : null,
                    is_ghost: isGhostMode
                }).select().single();
                
                if (error) throw error;
                productId = newProd.id;
            }

            // 3. Insertar Lote
            await supabase.from('inventory_items').insert({
                household_id: householdId,
                product_id: productId,
                name: item.item_name,
                category: item.category || 'Pantry', 
                unit: unit,
                quantity: q,
                location: loc || 'Despensa',
                price: finalUnitPrice,
                store: store || null,
                expiry_date: date ? format(date, 'yyyy-MM-dd') : null
            });

            // 4. Limpieza
            await supabase.from('inventory_items').delete().eq('product_id', productId).eq('quantity', 0);
            await supabase.from('shopping_list').delete().eq('id', item.id);
            
            toast({ title: "Recibido", description: `${item.item_name} guardado.` });
            onReceive();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isChecking) return <div className="p-4 text-xs text-zinc-500 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Verificando...</div>;

    return (
        <div className={cn("bg-zinc-900 border rounded-lg p-3 mb-2 flex flex-col gap-2 transition-colors", isNewProduct ? "border-blue-500/30 bg-blue-900/5" : "border-zinc-800")}>
            
            {/* CABECERA */}
            <div className="flex justify-between items-start">
                <div>
                    <span className="font-bold text-white block text-sm">{item.item_name}</span>
                    <Badge variant="outline" className="text-[10px] text-zinc-400 mt-1 border-zinc-700">{item.category}</Badge>
                </div>
                {isGhostMode && <Badge variant="secondary" className="bg-purple-900/50 text-purple-300 border-purple-500/50 text-[10px]"><Ghost className="w-3 h-3 mr-1"/> Ghost</Badge>}
                {isNewProduct && !isGhostMode && <Badge className="bg-blue-600 text-[10px] animate-pulse">NUEVO</Badge>}
            </div>

            {/* CONFIG SI ES NUEVO */}
            {isNewProduct && (
                <div className="bg-black/20 p-2 rounded border border-blue-500/20 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-1">
                        <Checkbox 
                            id={`ghost-${item.id}`} 
                            checked={isGhostMode} 
                            onCheckedChange={(c: boolean) => setIsGhostMode(c)}
                            className="border-zinc-600 data-[state=checked]:bg-purple-600 border-purple-500/50"
                        />
                        <label htmlFor={`ghost-${item.id}`} className="text-xs text-zinc-300 cursor-pointer select-none flex items-center gap-1">
                            Es Ghost <span className="text-[9px] text-zinc-500 ml-1">(Sin alertas)</span>
                        </label>
                    </div>
                    {!isGhostMode && (
                        <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-1">
                            <div className="flex flex-col gap-1">
                                <Label className="text-[10px] text-blue-300 uppercase font-bold">Importancia</Label>
                                <Select value={priorityMode} onValueChange={(v:any) => setPriorityMode(v)}>
                                    <SelectTrigger className="h-7 text-xs bg-zinc-950 border-zinc-700"><SelectValue/></SelectTrigger>
                                    <SelectContent className="bg-zinc-900 text-white border-zinc-800">
                                        <SelectItem value="critical" className="text-red-400 font-bold">🔴 Vital</SelectItem>
                                        <SelectItem value="high" className="text-orange-400 font-bold">🟠 Alta</SelectItem>
                                        <SelectItem value="normal" className="text-blue-400 font-bold">🔵 Normal</SelectItem>
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

            {/* INPUTS DE RECEPCIÓN */}
            <div className="grid grid-cols-2 gap-2 mt-1">
                {/* 1. Cantidad */}
                <div className="flex gap-1">
                    <Input type="number" className="h-8 text-sm bg-zinc-950 border-zinc-700 text-center font-bold" value={qty} onChange={e=>setQty(e.target.value)} />
                    <Select value={unit} onValueChange={setUnit}>
                        <SelectTrigger className="h-8 w-14 bg-zinc-950 border-zinc-700 px-1 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white min-w-[80px]">
                            {['uds', 'kg', 'g', 'L', 'ml'].map(u => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {/* 2. Precio Inteligente (SELECTOR) */}
                <div className="flex gap-1">
                    <Input 
                        type="number" 
                        placeholder="0.00" 
                        className="h-8 text-sm bg-zinc-950 border-zinc-700 text-right flex-1 min-w-0"
                        value={priceInput} 
                        onChange={e=>setPriceInput(e.target.value)} 
                    />
                    <Select value={priceType} onValueChange={(v:any)=>setPriceType(v)}>
                        <SelectTrigger className="h-8 w-[70px] bg-zinc-950 border-zinc-700 px-1 text-[10px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white min-w-[80px]">
                            <SelectItem value="total" className="text-xs">€ Tot</SelectItem>
                            <SelectItem value="unit" className="text-xs">€/ud</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* 3. Tienda */}
                <div className="relative">
                    <Store className="absolute left-2 top-2 w-3 h-3 text-zinc-600"/>
                    <Input className="h-8 text-xs bg-zinc-950 border-zinc-700 pl-7" placeholder="Tienda..." value={store} onChange={e=>setStore(e.target.value)} />
                </div>

                {/* 4. Ubicación */}
                <LocationAutocomplete value={loc} onChange={setLoc} householdId={householdId} placeholder="Lugar..." />
            </div>
            
            <div className="flex gap-2 mt-1">
                <Popover>
                    <PopoverTrigger asChild><Button variant="outline" className={cn("h-9 flex-1 px-2 border-zinc-700 bg-zinc-950 text-xs justify-start", !date && "text-zinc-500")}><CalendarIcon className="w-3 h-3 mr-2"/> {date ? format(date, 'dd/MM') : "Caducidad"}</Button></PopoverTrigger>
                    <PopoverContent className="p-0 bg-zinc-950 border-zinc-800"><Calendar mode="single" selected={date} onSelect={setDate} className="bg-zinc-950 text-white"/></PopoverContent>
                </Popover>
                
                <Button className="h-9 bg-green-600 hover:bg-green-500 font-bold text-xs px-4" onClick={handleConfirm} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin"/> : <><ArrowRight className="w-3 h-3 mr-1"/> OK</>}
                </Button>
            </div>
        </div>
    );
};