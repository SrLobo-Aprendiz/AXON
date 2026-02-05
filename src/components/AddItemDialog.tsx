import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Plus, Save, Ghost, X } from 'lucide-react';
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

// MAPA DE TRADUCCIÓN CENTRALIZADO
const CATEGORY_MAP: Record<string, string> = {
  Dairy: 'Lácteos',
  Meat: 'Carne',
  Produce: 'Fresco',
  Bakery: 'Panadería',
  Pantry: 'Despensa',
  Frozen: 'Congelados',
  Beverages: 'Bebidas',
  Household: 'Limpieza/Hogar'
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

  // Form States
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Pantry');
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  
  // Configuración Lógica (Mapeado a min_quantity)
  const [replenishMode, setReplenishMode] = useState<'vip' | 'standard' | 'manual'>('standard');
  
  const [location, setLocation] = useState('Despensa');
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [unit, setUnit] = useState('uds');
  const [isGhost, setIsGhost] = useState(false);

  const resetForm = () => {
    setName('');
    setCategory('Pantry');
    setQuantity('');
    setPrice('');
    setExpiryDate(undefined);
    setReplenishMode('standard');
    setIsGhost(false);
    setLocation('Despensa');
    setIsCustomLocation(false);
    setUnit('uds');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHousehold) return;
    if (!name.trim()) { toast({ title: 'Nombre obligatorio', variant: 'destructive' }); return; }

    const qty = Number(quantity);
    if (!quantity || Number.isNaN(qty) || qty <= 0) {
      toast({ title: 'Cantidad inválida', variant: 'destructive' }); return;
    }

    setIsSubmitting(true);

    let minQty = 0;
    if (replenishMode === 'vip') minQty = 4;     
    if (replenishMode === 'standard') minQty = 2; 
    if (replenishMode === 'manual') minQty = 0;   

    try {
      const newItemData = {
        household_id: currentHousehold.id,
        name: name.trim(), // Se guarda tal cual, la normalización se hace al buscar
        category: category,
        quantity: qty,
        unit: unit,
        status: 'stocked',
        min_quantity: minQty, 
        expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : null,
        price: price ? Number(price) : null,
        is_ghost: isGhost,
        location: location 
      };

      const { error } = await supabase.from('inventory_items').insert(newItemData);
      if (error) throw error;

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (<Button><Plus className="w-4 h-4 mr-2" /> Add Item</Button>)}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo Producto</DialogTitle>
            <DialogDescription>Añadir al inventario de casa.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* NOMBRE */}
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} placeholder="ej. Leche" className="bg-zinc-900 border-zinc-700" />
            </div>

            {/* GHOST */}
            <div className="flex items-center space-x-2 border p-3 rounded-md bg-purple-900/10 border-purple-500/20">
              <Checkbox id="is-ghost" checked={isGhost} onCheckedChange={(c) => setIsGhost(c as boolean)} className="data-[state=checked]:bg-purple-600 border-purple-300"/>
              <Label htmlFor="is-ghost" className="text-purple-300 font-medium cursor-pointer flex items-center gap-2"><Ghost className="w-4 h-4" /> Es compra de prueba (Ghost)</Label>
            </div>

            {/* CATEGORIA (AHORA TRADUCIDA) Y REGLA DE REPOSICIÓN */}
            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                <Label>Categoría</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[200px]">
                    {Object.entries(CATEGORY_MAP).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isGhost && (
                <div className="grid gap-2">
                  <Label>Modo Reposición</Label>
                  <Select value={replenishMode} onValueChange={(v: any) => setReplenishMode(v)}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="vip"><span className="text-red-400 font-bold">VIP (Avisa &lt; 4)</span></SelectItem>
                      <SelectItem value="standard"><span className="text-blue-400">Normal (Avisa &lt; 2)</span></SelectItem>
                      <SelectItem value="manual"><span className="text-zinc-400">Manual (No avisar)</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* CANTIDAD + UNIDAD */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Cantidad</Label>
                <div className="flex gap-2">
                    <Input type="number" min={0} step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" className="bg-zinc-900 border-zinc-700 flex-1" />
                    <Select value={unit} onValueChange={setUnit}>
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
                        <Button size="icon" variant="ghost" onClick={() => { setIsCustomLocation(false); setLocation('Despensa'); }}><X className="w-4 h-4"/></Button>
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