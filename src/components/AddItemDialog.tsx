import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Plus, Save, Ghost, X, Search, Check, Settings2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from "@/components/ui/switch";
import { ProductDefinition } from '@/lib/types';

// MAPA DE TRADUCCIÓN
const CATEGORY_MAP: Record<string, string> = {
  Pantry: 'Despensa', Dairy: 'Lácteos', Meat: 'Carne', Produce: 'Fresco', 
  Bakery: 'Panadería', Frozen: 'Congelados', Beverages: 'Bebidas', Household: 'Limpieza/Hogar'
};

const DEFAULT_LOCATIONS = ['Despensa', 'Nevera', 'Congelador', 'Baño', 'Limpieza'];
const UNITS = [
  { value: 'uds', label: 'Unidades (uds)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'L', label: 'Litros (L)' },
  { value: 'ml', label: 'Mililitros (ml)' },
];

interface AddItemDialogProps {
  children?: React.ReactNode;
  onItemAdded?: () => void;
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({ children, onItemAdded }) => {
  const { currentHousehold } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ESTADOS DE AUTOCOMPLETADO ---
  const [searchResults, setSearchResults] = useState<ProductDefinition[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDefinition | null>(null);

  // --- FORMULARIO ---
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Pantry');
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  
  // IMPORTANCIA (Solo los 3 niveles lógicos)
  const [priority, setPriority] = useState<'critical' | 'high' | 'normal'>('normal');
  
  // CANTIDAD MÍNIMA MANUAL (El "Cuándo")
  const [useCustomMin, setUseCustomMin] = useState(false);
  const [minQuantity, setMinQuantity] = useState<string>(''); 

  const [location, setLocation] = useState('Despensa');
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [unit, setUnit] = useState<'uds' | 'kg' | 'g' | 'L' | 'ml'>('uds');
  const [isGhost, setIsGhost] = useState(false);

  const resetForm = () => {
    setName(''); setCategory('Pantry'); setQuantity(''); setPrice('');
    setExpiryDate(undefined); setPriority('normal'); setIsGhost(false);
    setLocation('Despensa'); setIsCustomLocation(false); setUnit('uds');
    setMinQuantity(''); setUseCustomMin(false); setSelectedProduct(null); setShowSuggestions(false);
  };

  // Búsqueda en tiempo real
  useEffect(() => {
    const search = async () => {
      if (!name.trim() || !currentHousehold) { setSearchResults([]); return; }
      if (selectedProduct && selectedProduct.name === name) return;

      const { data } = await supabase
        .from('product_definitions')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .ilike('name', `%${name}%`)
        .limit(5);
      
      if (data) setSearchResults(data as ProductDefinition[]);
    };
    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [name, currentHousehold, selectedProduct]);

  // Selección de producto existente
  const handleSelectProduct = (product: ProductDefinition) => {
    setSelectedProduct(product);
    setName(product.name);
    setCategory(product.category);
    setUnit(product.unit as any);
    setIsGhost(product.is_ghost);

    // Recuperar configuración guardada
    if (!product.is_ghost) {
        setPriority(product.importance_level === 'ghost' ? 'normal' : product.importance_level as any);
        // Si tiene un mínimo personalizado, activamos el switch y llenamos el input
        if (product.min_quantity !== null) {
            setUseCustomMin(true);
            setMinQuantity(product.min_quantity.toString());
        } else {
            setUseCustomMin(false);
            setMinQuantity('');
        }
    }
    
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHousehold) return;
    if (!name.trim()) { toast({ title: 'Falta nombre', variant: 'destructive' }); return; }

    const qty = Number(quantity);
    if (!quantity || Number.isNaN(qty) || qty <= 0) {
      toast({ title: 'Cantidad inválida', variant: 'destructive' }); return;
    }

    setIsSubmitting(true);

    // --- LÓGICA FINAL ---
    const finalImportance = isGhost ? 'ghost' : priority;
    
    // Si el switch está activo y hay valor, usamos ese (ej: 0.5 kg). 
    // Si NO está activo, enviamos NULL para que la BD use los defectos (4, 2, 1).
    const finalMinQty = (!isGhost && useCustomMin && minQuantity) ? Number(minQuantity) : null;

    try {
      let productId: string;

      if (selectedProduct) {
        productId = selectedProduct.id;
        // Actualizar maestro si cambiaron configuraciones estructurales
        if (selectedProduct.importance_level !== finalImportance || 
            selectedProduct.is_ghost !== isGhost ||
            selectedProduct.min_quantity !== finalMinQty) {
            await supabase.from('product_definitions').update({
                importance_level: finalImportance,
                is_ghost: isGhost,
                min_quantity: finalMinQty
            }).eq('id', productId);
        }
      } else {
        // Crear nuevo maestro (CEREBRO)
        const { data: newProd, error: prodError } = await supabase
          .from('product_definitions')
          .insert({
            household_id: currentHousehold.id,
            name: name.trim(),
            category,
            unit,
            importance_level: finalImportance,
            is_ghost: isGhost,
            min_quantity: finalMinQty
          })
          .select()
          .single();

        if (prodError) throw prodError;
        productId = newProd.id;
      }

      // Insertar Lote (CUERPO)
      // FIX CRÍTICO: Enviamos 'name', 'category' y 'unit' también aquí para satisfacer a la BD
      const { error: batchError } = await supabase.from('inventory_items').insert({
        household_id: currentHousehold.id,
        product_id: productId, // Enlace ID
        name: name.trim(),     // <--- NECESARIO (Legacy Support)
        category: category,    // <--- NECESARIO (Legacy Support)
        unit: unit,            // <--- NECESARIO (Legacy Support)
        quantity: qty,
        location: location,
        expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : null,
        price: price ? Number(price) : null
      });

      if (batchError) throw batchError;

      toast({ title: 'Guardado', description: `${name} añadido a ${location}.` });
      setOpen(false);
      resetForm();
      if (onItemAdded) onItemAdded();

    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = !!selectedProduct; 

  // Helper para mostrar el texto explicativo
  const getMinPlaceholder = () => {
    if (priority === 'critical') return "Por defecto: Avisa con menos de 4";
    if (priority === 'high') return "Por defecto: Avisa con menos de 2";
    return "Por defecto: Avisa con menos de 1";
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if(!val) resetForm(); setOpen(val); }}>
      <DialogTrigger asChild>
        {children || (<Button><Plus className="w-4 h-4 mr-2" /> Añadir Stock</Button>)}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo Producto</DialogTitle>
            <DialogDescription>Añadir al inventario de casa.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* NOMBRE */}
            <div className="grid gap-2 relative">
              <Label>Nombre</Label>
              <div className="relative">
                  <Input 
                    value={name} 
                    onChange={(e) => { 
                        setName(e.target.value); 
                        setSelectedProduct(null); 
                        setShowSuggestions(true); 
                    }} 
                    onFocus={() => setShowSuggestions(true)}
                    disabled={isSubmitting} 
                    placeholder="ej. Leche" 
                    className="bg-zinc-900 border-zinc-700 pr-10" 
                    autoFocus
                  />
                  {selectedProduct ? <Check className="absolute right-3 top-3 w-4 h-4 text-green-500" /> : <Search className="absolute right-3 top-3 w-4 h-4 text-zinc-500" />}
              </div>
              
              {showSuggestions && searchResults.length > 0 && !selectedProduct && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  {searchResults.map(p => (
                    <div key={p.id} onClick={() => handleSelectProduct(p)} className="px-3 py-2 hover:bg-zinc-800 cursor-pointer flex justify-between items-center group">
                        <span className="text-sm font-medium text-zinc-200 group-hover:text-white">{p.name}</span>
                        <span className="text-xs text-zinc-500">{CATEGORY_MAP[p.category] || p.category}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedProduct && <p className="text-[10px] text-green-400 flex items-center gap-1">Producto existente detectado. Usando configuración guardada.</p>}
            </div>

            {/* GHOST */}
            <div className="flex items-center space-x-2 border p-3 rounded-md bg-purple-900/10 border-purple-500/20">
              <Checkbox id="is-ghost" checked={isGhost} onCheckedChange={(c) => setIsGhost(c as boolean)} className="data-[state=checked]:bg-purple-600 border-purple-300"/>
              <Label htmlFor="is-ghost" className="text-purple-300 font-medium cursor-pointer flex items-center gap-2"><Ghost className="w-4 h-4" /> Es compra de prueba (Ghost)</Label>
            </div>

            {/* CATEGORIA Y PRIORIDAD */}
            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                <Label>Categoría</Label>
                <Select value={category} onValueChange={setCategory} disabled={isReadOnly}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[200px]">
                    {Object.entries(CATEGORY_MAP).map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {!isGhost && (
                <div className="grid gap-2">
                  <Label>Importancia</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="critical">
                          <span className="text-red-400 font-bold flex items-center gap-2">Imprescindible</span>
                      </SelectItem>
                      <SelectItem value="high">
                          <span className="text-orange-400 font-medium flex items-center gap-2">P. Media</span>
                      </SelectItem>
                      <SelectItem value="normal">
                          <span className="text-blue-400 flex items-center gap-2">Opcional</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* CONFIGURACIÓN DE CANTIDAD MÍNIMA PERSONALIZADA */}
            {!isGhost && (
                <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="custom-min" className="text-xs text-zinc-400 flex items-center gap-2 cursor-pointer">
                            <Settings2 className="w-3 h-3"/> Personalizar aviso de stock
                        </Label>
                        <Switch id="custom-min" checked={useCustomMin} onCheckedChange={setUseCustomMin} className="scale-75 data-[state=checked]:bg-blue-600"/>
                    </div>
                    
                    {useCustomMin ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-top-1 fade-in">
                            <Input 
                                type="number" 
                                step="0.1" 
                                min="0"
                                value={minQuantity} 
                                onChange={(e) => setMinQuantity(e.target.value)} 
                                placeholder="Ej: 0.5" 
                                className="h-8 bg-zinc-950 border-zinc-700 text-xs w-24" 
                                autoFocus
                            />
                            <div className="flex flex-col">
                                <span className="text-xs text-zinc-300 font-bold">Avisar si baja de esto</span>
                                <span className="text-[10px] text-zinc-500">Mantiene la prioridad {priority === 'critical' ? 'Roja' : priority === 'high' ? 'Naranja' : 'Azul'}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-[10px] text-zinc-500 pl-5 italic">{getMinPlaceholder()}</p>
                    )}
                </div>
            )}

            {/* CANTIDAD + UNIDAD */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Cantidad</Label>
                <div className="flex gap-2">
                    <Input type="number" min={0} step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" className="bg-zinc-900 border-zinc-700 flex-1" />
                    <Select value={unit} onValueChange={(v:any) => setUnit(v)} disabled={isReadOnly}>
                        <SelectTrigger className="w-[80px] bg-zinc-900 border-zinc-700 px-2"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white min-w-[120px]">
                            {UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.value}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
              </div>
               <div className="grid gap-2">
                <Label>Precio (€)</Label>
                <Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="bg-zinc-900 border-zinc-700" />
              </div>
            </div>

             {/* UBICACIÓN + CADUCIDAD */}
             <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Ubicación</Label>
                  {isCustomLocation ? (
                     <div className="flex gap-1">
                        <Input value={location} onChange={(e) => setLocation(e.target.value)} className="bg-zinc-900 border-blue-500/50" autoFocus placeholder="Lugar..."/>
                        <Button size="icon" variant="ghost" type="button" onClick={() => { setIsCustomLocation(false); setLocation('Despensa'); }}><X className="w-4 h-4"/></Button>
                     </div>
                  ) : (
                    <Select value={location} onValueChange={(val) => { val === 'custom' ? setIsCustomLocation(true) : setLocation(val) }}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        {DEFAULT_LOCATIONS.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                        <SelectItem value="custom" className="text-blue-400 font-bold">+ Otro...</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Caducidad</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('justify-start text-left font-normal bg-zinc-900 border-zinc-700', !expiryDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiryDate ? format(expiryDate, 'P') : 'Sin fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800 text-white">
                       <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus className="bg-zinc-950 text-zinc-100 rounded-md border border-zinc-800"/>
                    </PopoverContent>
                  </Popover>
                </div>
             </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500 text-white">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemDialog;