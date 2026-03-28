import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Idioma español
import { CalendarIcon, Loader2, Save } from 'lucide-react';
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
import { StoreAutocomplete } from './StoreAutocomplete';

interface AddBatchDialogProps {
  product: {
    id: string;
    name: string;
    unit: string;
    category: string;
  };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onBatchAdded: () => void;
  householdId: string; // <-- Recibida desde StockModal.tsx
}

const AddBatchDialog: React.FC<AddBatchDialogProps> = ({ product, isOpen, onOpenChange, onBatchAdded, householdId }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const quantityRef = useRef<HTMLInputElement>(null);
  
  // Estados idénticos a AddItemDialog para consistencia
  const [quantity, setQuantity] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [priceType, setPriceType] = useState<'total' | 'unit'>('total');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [location, setLocation] = useState(''); 
  const [store, setStore] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => quantityRef.current?.focus(), 300);
    } else {
      setQuantity(''); setPriceInput(''); setExpiryDate(undefined); setLocation(''); setStore('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0) return;

    setIsSubmitting(true);
    try {
      let unitPrice = 0;
      const qty = parseFloat(quantity);
      const p = parseFloat(priceInput) || 0;
      if (p > 0) unitPrice = priceType === 'total' ? (p / qty) : p;

      const { error } = await supabase.from('inventory_items').insert({
        household_id: householdId,
        product_id: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        quantity: qty,
        location: location || 'Despensa',
        store: store.trim() || null,
        expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : null,
        price: unitPrice
      });

      if (error) throw error;

      toast({ title: 'Lote añadido', description: `${product.name} actualizado.` });
      onOpenChange(false);
      onBatchAdded();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <span className="text-blue-500 font-mono text-xs border border-blue-500/30 px-2 py-0.5 rounded">LOTE</span>
                Añadir a {product?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold text-zinc-500 uppercase">Cantidad</Label>
              <div className="flex items-center gap-3">
                <Input ref={quantityRef} type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} className="bg-zinc-900 border-zinc-700 h-12 text-lg font-bold"/>
                <span className="bg-zinc-900/50 px-4 py-2 rounded-md border border-zinc-800 h-12 flex items-center min-w-[60px] justify-center">{product?.unit}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                <Label className="text-[10px] font-bold text-zinc-500 uppercase">Precio (€)</Label>
                <div className="flex gap-1">
                    <Input type="number" step="0.01" value={priceInput} onChange={e => setPriceInput(e.target.value)} className="bg-zinc-900 border-zinc-700 text-right flex-1"/>
                    <Select value={priceType} onValueChange={(v:any)=>setPriceType(v)}>
                        <SelectTrigger className="w-[75px] bg-zinc-900 border-zinc-700 px-1 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white"><SelectItem value="total">Tot</SelectItem><SelectItem value="unit">/ud</SelectItem></SelectContent>
                    </Select>
                </div>
              </div>

               <div className="grid gap-2">
                  <Label className="text-[10px] font-bold text-zinc-500 uppercase">Caducidad</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('justify-start bg-zinc-900 border-zinc-700 h-10 w-full text-xs', !expiryDate && 'text-zinc-500')}>
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {expiryDate ? format(expiryDate, 'dd/MM/yy', { locale: es }) : 'Sin fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 bg-zinc-950 border-zinc-800" align="end">
                        <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} locale={es} className="bg-zinc-950 text-white" initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
            </div>

            <div className="grid gap-2">
                <Label className="text-[10px] font-bold text-zinc-500 uppercase">Tienda</Label>
                <StoreAutocomplete value={store} onChange={setStore} householdId={householdId} placeholder="Tienda" />
            </div>

             <div className="grid gap-2">
                  <Label className="text-[10px] font-bold text-zinc-500 uppercase">Ubicación</Label>
                  <LocationAutocomplete value={location} onChange={setLocation} householdId={householdId} placeholder="¿Dónde lo guardas?" />
             </div>
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500 px-8 font-bold">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Guardar Lote
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBatchDialog;