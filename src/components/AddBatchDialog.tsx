import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Save, X } from 'lucide-react';
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

const DEFAULT_LOCATIONS = ['Despensa', 'Nevera', 'Congelador', 'Baño', 'Limpieza', 'Trastero'];

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
  
  // Campos del lote
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [location, setLocation] = useState('Despensa');
  const [isCustomLocation, setIsCustomLocation] = useState(false);

  const resetForm = () => {
    setQuantity(''); setPrice(''); setExpiryDate(undefined);
    setLocation('Despensa'); setIsCustomLocation(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0) {
      toast({ title: 'Cantidad inválida', variant: 'destructive' }); return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('inventory_items').insert({
        household_id: product.household_id,
        product_id: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        quantity: Number(quantity),
        location: location,
        expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : null,
        price: price ? Number(price) : null
      });

      if (error) throw error;

      toast({ title: 'Lote añadido', description: `Se han sumado ${quantity} ${product.unit} a ${product.name}.` });
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
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <span className="text-blue-500 font-mono text-xs border border-blue-500/30 px-2 py-0.5 rounded">LOTE</span>
                Añadir a {product.name}
            </DialogTitle>
            <DialogDescription>Añadiendo nuevo lote físico al stock actual.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6">
            {/* CANTIDAD (Con unidad fija al lado) */}
            <div className="grid gap-2">
              <Label className="text-zinc-500 text-[10px] uppercase font-bold">Cantidad a añadir</Label>
              <div className="flex items-center gap-3">
                <Input 
                    type="number" step="0.01" value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                    placeholder="0" 
                    className="bg-zinc-900 border-zinc-700 text-lg font-bold"
                    autoFocus 
                />
                <span className="text-xl font-mono text-zinc-600 bg-zinc-900/50 px-4 py-2 rounded-md border border-zinc-800 min-w-[70px] text-center">
                    {product.unit}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                <Label className="text-zinc-500 text-[10px] uppercase font-bold">Precio Lote (€)</Label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="bg-zinc-900 border-zinc-700" />
              </div>

               <div className="grid gap-2">
                  <Label className="text-zinc-500 text-[10px] uppercase font-bold">Caducidad</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('justify-start text-left font-normal bg-zinc-900 border-zinc-700 text-xs', !expiryDate && 'text-zinc-500')}>
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {expiryDate ? format(expiryDate, 'dd/MM/yy') : 'Sin fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800 text-white">
                       <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus className="bg-zinc-950 text-zinc-100 rounded-md border border-zinc-800"/>
                    </PopoverContent>
                  </Popover>
                </div>
            </div>

             {/* UBICACIÓN */}
            <div className="grid gap-2">
                <Label className="text-zinc-500 text-[10px] uppercase font-bold">Ubicación</Label>
                {isCustomLocation ? (
                    <div className="flex gap-1">
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} className="bg-zinc-900 border-blue-500/50" autoFocus placeholder="¿Dónde está?"/>
                    <Button size="icon" variant="ghost" type="button" onClick={() => { setIsCustomLocation(false); setLocation('Despensa'); }}><X className="w-4 h-4"/></Button>
                    </div>
                ) : (
                <Select value={location} onValueChange={(val) => { val === 'custom' ? setIsCustomLocation(true) : setLocation(val) }}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {DEFAULT_LOCATIONS.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                    <SelectItem value="custom" className="text-blue-400 font-bold">+ Nuevo lugar...</SelectItem>
                    </SelectContent>
                </Select>
                )}
            </div>
          </div>

          <DialogFooter className="border-t border-zinc-800 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8">
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