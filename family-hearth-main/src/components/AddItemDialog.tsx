import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Plus, Save, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CATEGORIES = [
  'Dairy', 'Meat', 'Produce', 'Bakery', 'Pantry', 'Frozen', 'Beverages', 'Household',
] as const;

type ItemStatus = 'stocked' | 'low' | 'panic';

interface AddItemDialogProps {
  children?: React.ReactNode;
  onItemAdded?: () => void;
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({ children, onItemAdded }) => {
  const { currentHousehold, user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ESTADOS DEL FORMULARIO
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Pantry');
  const [quantity, setQuantity] = useState<string>(''); // UX Fix: Empieza vacío
  const [price, setPrice] = useState<string>(''); // Precio unitario opcional
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<ItemStatus>('stocked');

  const resetForm = () => {
    setName('');
    setCategory('Pantry');
    setQuantity('');
    setPrice('');
    setExpiryDate(undefined);
    setStatus('stocked');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentHousehold) {
      toast({ title: 'Error', description: 'No household selected.', variant: 'destructive' });
      return;
    }

    if (!name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }

    const qty = Number(quantity);
    if (!quantity || Number.isNaN(qty) || qty <= 0) {
      toast({ title: 'Quantity required', description: 'Please enter a valid amount.', variant: 'destructive' });
      return;
    }

    const parsedPrice = price.trim() === '' ? null : Number(price);
    if (price.trim() !== '' && (Number.isNaN(parsedPrice) || (parsedPrice ?? 0) < 0)) {
      toast({ title: 'Invalid price', description: 'Please enter a valid price (>= 0).', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // PREPARACIÓN DE DATOS PARA LA TABLA DE INVENTARIO
      const newItemData: any = {
        household_id: currentHousehold.id,
        // created_by: user?.id, // Verifica si tu tabla inventory_items tiene esta columna, a veces es automática
        name: name.trim(),
        category: category,
        quantity: qty,
        status: status, 
        // Asegúrate de crear 'expiry_date' en inventory_items si no existe
        expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : null,
        price: parsedPrice,
      };

      // 🚨 CAMBIO CLAVE: Ahora apuntamos a 'inventory_items'
      const { error } = await supabase
        .from('inventory_items') // <--- AQUÍ ESTABA LA CLAVE
        .insert(newItemData);

      if (error) throw error;

      toast({ title: 'Item added!', description: `${name} added to inventory.` });
      setOpen(false);
      resetForm();
      if (onItemAdded) onItemAdded();

    } catch (err: any) {
      console.error('Error adding item:', err);
      toast({ 
        title: 'Error saving to Inventory', 
        description: err.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>Add an item to your pantry/inventory.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="add-name">Name *</Label>
              <Input 
                id="add-name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                disabled={isSubmitting} 
                placeholder="e.g. Chicken breast" 
              />
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="add-category">Category *</Label>
              <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
                <SelectTrigger id="add-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Status Selector */}
            <div className="grid gap-2">
              <Label htmlFor="add-status">Priority / Status *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ItemStatus)} disabled={isSubmitting}>
                <SelectTrigger id="add-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stocked">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4" /> <span>Capricho / Normal (Stocked)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2 text-orange-500">
                      <AlertTriangle className="w-4 h-4" /> <span>Running Low</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="panic">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-4 h-4" /> <span>Urgente (Panic)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantity & Expiry */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-quantity">Quantity *</Label>
                <Input 
                  id="add-quantity" 
                  type="number" 
                  min={0} 
                  step="0.01"
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                  disabled={isSubmitting}
                  placeholder="e.g. 1" 
                />
              </div>
              <div className="grid gap-2">
                <Label>Expiry Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('justify-start text-left font-normal', !expiryDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiryDate ? format(expiryDate, 'P') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus /></PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Precio */}
            <div className="grid gap-2">
              <Label htmlFor="add-price">Precio</Label>
              <Input
                id="add-price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. 2.99"
              />
              {price.trim() !== '' && quantity.trim() !== '' && !Number.isNaN(Number(price)) && !Number.isNaN(Number(quantity)) && (
                <p className="text-xs text-muted-foreground">
                  Valor total estimado: {(Number(price) * Number(quantity)).toFixed(2)}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="mr-2">Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemDialog;
