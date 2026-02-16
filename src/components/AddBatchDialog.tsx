import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, Save, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationAutocomplete } from './LocationAutocomplete';

interface AddBatchDialogProps {
  product: {
    id: string;
    name: string;
    unit: string;
    category: string;
    household_id: string;
  };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onBatchAdded: () => void;
}

const AddBatchDialog: React.FC<AddBatchDialogProps> = ({ product, isOpen, onOpenChange, onBatchAdded }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const quantityRef = useRef<HTMLInputElement>(null);
  
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState<'total' | 'unit'>('total');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [location, setLocation] = useState('Despensa');
  const [store, setStore] = useState(''); // Estado para la tienda

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        quantityRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const resetForm = () => {
    setQuantity(''); 
    setPrice(''); 
    setExpiryDate(undefined);
    setLocation('Despensa');
    setStore('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0) {
      toast({ title: 'Cantidad inválida', variant: 'destructive' }); 
      return;
    }

    setIsSubmitting(true);
    try {
      let finalUnitPrice = 0;
      const qty = parseFloat(quantity) || 0;
      const p = parseFloat(price) || 0;

      if (p > 0 && qty > 0) {
          finalUnitPrice = priceType === 'total' ? (p / qty) : p;
      }

      const { error } = await supabase.from('inventory_items').insert({
        household_id: product.household_id,
        product_id: product.id,
        quantity: qty,
        location: location,
        store: store.trim() || null, // Guardamos tienda
        expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : null,
        price: finalUnitPrice
      });

      if (error) throw error;

      toast({ 
        title: 'Lote añadido', 
        description: `Se han sumado ${quantity} ${product.unit} a ${product.name}.` 
      });
      onOpenChange(false);
      resetForm();
      onBatchAdded();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if(!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[400px] max-h-[85vh] overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <span className="text-blue-500 font-mono text-xs border border-blue-500/30 px-2 py-0.5 rounded">LOTE</span>
                Añadir a {product.name}
            </DialogTitle>
            <DialogDescription>Añadiendo nuevo lote físico al stock actual.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6 overflow-y-auto flex-1">
            {/* CANTIDAD */}
            <div className="grid gap-2">
              <Label className="text-zinc-500 text-[10px] uppercase font-bold">Cantidad a añadir</Label>
              <div className="flex items-center gap-3">
                <Input 
                    ref={quantityRef}
                    type="number" 
                    step="0.01" 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                    placeholder="0" 
                    className="bg-zinc-900 border-zinc-700 text-lg font-bold"
                />
                <span className="text-xl font-mono text-zinc-600 bg-zinc-900/50 px-4 py-2 rounded-md border border-zinc-800 min-w-[70px] text-center">
                    {product.unit}
                </span>
              </div>
            </div>

            {/* PRECIO Y CADUCIDAD */}
            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                <Label className="text-zinc-500 text-[10px] uppercase font-bold">Precio (€)</Label>
                <div className="flex gap-1">
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={price} 
                      onChange={(e) => setPrice(e.target.value)} 
                      placeholder="0.00" 
                      className="bg-zinc-900 border-zinc-700 text-right flex-1 min-w-0" 
                    />
                    <Select value={priceType} onValueChange={(v:any)=>setPriceType(v)}>
                        <SelectTrigger className="w-[70px] bg-zinc-900 border-zinc-700 px-1 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white min-w-[80px]">
                            <SelectItem value="total" className="text-xs">Tot</SelectItem>
                            <SelectItem value="unit" className="text-xs">/ud</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>

               <div className="grid gap-2">
                  <Label className="text-zinc-500 text-[10px] uppercase font-bold">Caducidad</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className={cn(
                          'justify-start text-left font-normal bg-zinc-900 border-zinc-700 text-xs', 
                          !expiryDate && 'text-zinc-500'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {expiryDate ? format(expiryDate, 'dd/MM/yy', { locale: es }) : 'Sin fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800 text-white">
                       <Calendar 
                         mode="single" 
                         selected={expiryDate} 
                         onSelect={setExpiryDate} 
                         locale={es}
                         fixedWeeks
                         initialFocus 
                         className="bg-zinc-950 text-zinc-100 rounded-md border border-zinc-800"
                       />
                    </PopoverContent>
                  </Popover>
                </div>
            </div>

            {/* TIENDA (NUEVO) */}
            <div className="grid gap-2">
                <Label className="text-zinc-500 text-[10px] uppercase font-bold">Tienda (Opcional)</Label>
                <div className="relative">
                    <Store className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600"/>
                    <Input 
                        value={store} 
                        onChange={(e) => setStore(e.target.value)} 
                        placeholder="Mercadona, Carrefour..." 
                        className="bg-zinc-900 border-zinc-700 pl-9"
                    />
                </div>
            </div>

             {/* UBICACIÓN */}
            <div className="grid gap-2">
                <Label className="text-zinc-500 text-[10px] uppercase font-bold">Ubicación</Label>
                <LocationAutocomplete 
                    value={location} 
                    onChange={setLocation} 
                    householdId={product.household_id} 
                    placeholder="¿Dónde lo guardas?"
                />
            </div>
          </div>

          <DialogFooter className="border-t border-zinc-800 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Lote
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBatchDialog;