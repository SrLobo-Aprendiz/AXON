import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Save, Trash2, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
// Importación correcta conectada a tu types.ts saneado
import type { FridgeItem } from '@/lib/types';

const CATEGORIES = [
  'Dairy', 'Meat', 'Produce', 'Bakery', 'Pantry', 'Frozen', 'Beverages', 'Household',
] as const;

interface EditItemDialogProps {
  item: FridgeItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const EditItemDialog: React.FC<EditItemDialogProps> = ({ item, open, onOpenChange, onUpdate }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  // Tipado estricto para el estado
  const [status, setStatus] = useState<'stocked' | 'low' | 'panic'>('stocked');

  // Load item data when dialog opens
  useEffect(() => {
    if (item && open) {
      setName(item.name || '');
      setCategory(item.category || '');
      setQuantity(item.quantity || 1);
      setExpiryDate(item.expiry_date ? new Date(item.expiry_date) : undefined);
      
      // Lógica de seguridad para mapear el estado correctamente
      const currentStatus = item.status;
      const validStatus = (currentStatus === 'stocked' || currentStatus === 'low' || currentStatus === 'panic') 
        ? currentStatus 
        : 'stocked';
      setStatus(validStatus);
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    if (!name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // 🛠️ FIX CRÍTICO: Ahora enviamos los datos reales del formulario
      // Usamos 'as any' en el payload para evitar conflictos con definiciones antiguas de Supabase
      const updates: any = {
        name: name.trim(),
        category,
        quantity,
        status: status,
        expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : null,
      };

      const { error } = await supabase
        .from('fridge_items')
        .update(updates)
        .eq('id', item.id);

      if (error) throw error;

      toast({ title: 'Updated!', description: 'Item details saved.' });
      onUpdate();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error updating:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (!confirm('Are you sure you want to remove this item?')) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('fridge_items').delete().eq('id', item.id);
      if (error) throw error;
      
      toast({ title: 'Removed', description: 'Item deleted from fridge.' });
      onUpdate();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Modify details or priority.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
                <SelectTrigger id="edit-category"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Status Selector */}
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Priority / Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'stocked' | 'low' | 'panic')} disabled={isSubmitting}>
                <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
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
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input id="edit-quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} disabled={isSubmitting} />
              </div>
              <div className="grid gap-2">
                <Label>Expiry</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('justify-start text-left font
