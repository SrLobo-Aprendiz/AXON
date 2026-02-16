import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, Save, Ghost, Store, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LocationAutocomplete } from './LocationAutocomplete';
import { CATEGORIES, CATEGORY_CONFIG } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AddItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  onItemAdded: () => void;
  children?: React.ReactNode;
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({ isOpen, onOpenChange, householdId, onItemAdded, children }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [initialQty, setInitialQty] = useState('1');
  const [unit, setUnit] = useState('uds');
  const [location, setLocation] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  
  // Lógica de Precio
  const [priceInput, setPriceInput] = useState('');
  const [priceType, setPriceType] = useState<'total' | 'unit'>('total');
  const [store, setStore] = useState('');

  // Configuración Producto
  const [priority, setPriority] = useState<'critical'|'high'|'normal'>('normal');
  const [minStock, setMinStock] = useState('');
  const [isGhost, setIsGhost] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !category) {
        toast({ title: "Faltan datos", description: "Nombre y categoría son obligatorios.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
        let finalUnitPrice = 0;
        const qty = parseFloat(initialQty) || 0;
        const priceVal = parseFloat(priceInput) || 0;

        if (priceVal > 0 && qty > 0) {
            finalUnitPrice = priceType === 'total' ? (priceVal / qty) : priceVal;
        }

        // Crear Definición
        const { data: prodData, error: prodError } = await supabase.from('product_definitions').insert({
            household_id: householdId,
            name: name.trim(),
            category,
            unit,
            importance_level: isGhost ? 'ghost' : priority,
            min_quantity: (!isGhost && minStock) ? Number(minStock) : null,
            is_ghost: isGhost
        }).select().single();

        if (prodError) throw prodError;

        // Crear Lote Inicial
        if (qty > 0) {
            const { error: batchError } = await supabase.from('inventory_items').insert({
                household_id: householdId,
                product_id: prodData.id,
                name: name.trim(),
                category,
                unit,
                quantity: qty,
                location: location || 'Despensa',
                expiry_date: expiryDate || null,
                price: finalUnitPrice,
                store: store.trim() || null
            });
            if (batchError) throw batchError;
        }

        toast({ title: "Producto creado", description: `${name} añadido al inventario.` });
        onItemAdded();
        
        // Reset
        setName(''); setCategory(''); setInitialQty('1'); setPriceInput(''); setStore(''); setLocation('');
        onOpenChange(false);

    } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        {children && <div onClick={() => onOpenChange(true)}>{children}</div>}
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-blue-500"/> Nuevo Producto</DialogTitle>
                <DialogDescription className="text-zinc-500">Crea un producto y añade su primer lote.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
                {/* BLOQUE 1: DATOS BÁSICOS */}
                <div className="grid gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <div>
                        <Label className="text-xs text-zinc-400">Nombre</Label>
                        <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Leche entera" className="bg-zinc-950 border-zinc-700"/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs text-zinc-400">Categoría</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[200px]">
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>
                                            <div className="flex items-center gap-2">{React.createElement(CATEGORY_CONFIG[cat].icon, { className: "w-3 h-3" })} {CATEGORY_CONFIG[cat].label}</div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs text-zinc-400">Unidad</Label>
                            <Select value={unit} onValueChange={setUnit}>
                                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue/></SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                    {['uds', 'kg', 'g', 'L', 'ml'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* BLOQUE 2: DETALLES DEL LOTE */}
                <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs text-zinc-400">Cantidad Inicial</Label>
                            <Input type="number" value={initialQty} onChange={e=>setInitialQty(e.target.value)} className="bg-zinc-950 border-zinc-700 font-bold text-center"/>
                        </div>
                        <div>
                            <Label className="text-xs text-zinc-400">Precio</Label>
                            <div className="flex gap-1">
                                <Input type="number" placeholder="0.00" value={priceInput} onChange={e=>setPriceInput(e.target.value)} className="bg-zinc-950 border-zinc-700 text-right flex-1"/>
                                <Select value={priceType} onValueChange={(v:any)=>setPriceType(v)}>
                                    <SelectTrigger className="w-[85px] bg-zinc-900 border-zinc-700 text-xs px-2"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                        <SelectItem value="total" className="text-xs">€ Tot</SelectItem>
                                        <SelectItem value="unit" className="text-xs">€/ud</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <Label className="text-xs text-zinc-400">Tienda (Opcional)</Label>
                            <div className="relative">
                                <Store className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600"/>
                                <Input value={store} onChange={e=>setStore(e.target.value)} placeholder="Mercadona, Carrefour..." className="bg-zinc-950 border-zinc-700 pl-9"/>
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs text-zinc-400">Ubicación</Label>
                            <LocationAutocomplete householdId={householdId} value={location} onChange={setLocation} placeholder="¿Dónde va?"/>
                        </div>
                        <div>
                            <Label className="text-xs text-zinc-400">Caducidad</Label>
                            <Input type="date" value={expiryDate} onChange={e=>setExpiryDate(e.target.value)} className="bg-zinc-950 border-zinc-700 block"/>
                        </div>
                    </div>
                </div>

                {/* BLOQUE 3: CONTROL DE STOCK (DISEÑO UNIFICADO CON EDIT PRODUCT) */}
                <div className="space-y-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 transition-all">
                    
                    {/* CABECERA: TITULO + SWITCH GHOST ENCAPSULADO */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-bold flex items-center gap-2 text-zinc-200">
                                <AlertTriangle className="w-4 h-4 text-blue-400"/>
                                Control de Stock
                            </span>
                            <span className="text-[10px] text-zinc-500">
                                Configuración de alertas
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-700 rounded-full pl-3 pr-1 py-1">
                            <span className={cn("text-[10px] font-bold uppercase", isGhost ? "text-purple-400" : "text-zinc-500")}>
                                Modo Ghost
                            </span>
                            <Switch checked={isGhost} onCheckedChange={setIsGhost} className="data-[state=checked]:bg-purple-600 scale-75 origin-right"/>
                        </div>
                    </div>
                    
                    {/* CAJA EXPLICATIVA */}
                    <div className={cn("flex gap-2 items-start p-2 rounded border transition-colors", isGhost ? "bg-purple-900/10 border-purple-500/20" : "bg-blue-900/10 border-blue-500/20")}>
                        <Info className={cn("w-4 h-4 shrink-0 mt-0.5", isGhost ? "text-purple-400" : "text-blue-400")}/>
                        <span className={cn("text-[10px] leading-tight", isGhost ? "text-purple-200" : "text-blue-200")}>
                            {isGhost 
                                ? "Producto oculto en alertas. Útil para caprichos o items que no necesitas reponer obligatoriamente." 
                                : "El sistema te avisará automáticamente cuando el stock baje del mínimo definido abajo."}
                        </span>
                    </div>

                    {/* SELECTORES DE PRIORIDAD (IDÉNTICOS A EDIT PRODUCT) */}
                    {!isGhost && (
                        <div className="grid grid-cols-2 gap-3 pt-1 animate-in fade-in slide-in-from-top-1">
                            <div className="grid gap-1.5">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase">Prioridad</Label>
                                <Select value={priority} onValueChange={(v:any) => setPriority(v)}>
                                    <SelectTrigger className="bg-zinc-950 border-zinc-700 h-8 text-xs"><SelectValue/></SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                        <SelectItem value="critical" className="text-red-400">🔴 Vital</SelectItem>
                                        <SelectItem value="high" className="text-orange-400">🟠 Alta</SelectItem>
                                        <SelectItem value="normal" className="text-blue-400">🔵 Normal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase">Mínimo</Label>
                                <Input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} className="bg-zinc-950 border-zinc-700 h-8 text-xs" placeholder="Ej: 2"/>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <DialogFooter>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
                    Guardar
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
};

export default AddItemDialog;