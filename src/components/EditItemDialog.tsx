import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, Save, Trash2, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
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
import { CATEGORIES, CATEGORY_CONFIG, safeDate } from '@/lib/types';
import type { FridgeItem } from '@/lib/types';

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
  const nameRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<'stocked' | 'low' | 'panic'>('stocked');

  // ✅ Delayed focus (Android safe)
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        nameRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Load item data when dialog opens
  useEffect(() => {
    if (item && open) {
      setName(item.name || '');
      setCategory(item.category || '');
      setQuantity(item.quantity || 1);
      setExpiryDate(safeDate(item.expiry_date));
      
      // Map status safely
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
      toast({ title: 'Nombre requerido', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
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

      toast({ title: 'Actualizado', description: 'Cambios guardados correctamente.' });
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
    if (!confirm('¿Estás seguro de eliminar este artículo?')) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('fridge_items').delete().eq('id', item.id);
      if (error) throw error;
      
      toast({ title: 'Eliminado', description: 'Artículo eliminado de la nevera.' });
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
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px] max-h-[85vh] overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader>
            <DialogTitle>Editar Artículo</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Modifica los detalles o la prioridad.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 overflow-y-auto flex-1">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className="text-zinc-500 text-[10px] uppercase font-bold">
                Nombre
              </Label>
              <Input 
                id="edit-name" 
                ref={nameRef}
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                disabled={isSubmitting}
                className="bg-zinc-900 border-zinc-700"
              />
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="edit-category" className="text-zinc-500 text-[10px] uppercase font-bold">
                Categoría
              </Label>
              <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
                <SelectTrigger id="edit-category" className="bg-zinc-900 border-zinc-700">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white max-h-[300px]">
                  {CATEGORIES.map((cat) => {
                    const config = CATEGORY_CONFIG[cat];
                    const Icon = config.icon;
                    return (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Status Selector */}
            <div className="grid gap-2">
              <Label htmlFor="edit-status" className="text-zinc-500 text-[10px] uppercase font-bold">
                Prioridad / Estado
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'stocked' | 'low' | 'panic')} disabled={isSubmitting}>
                <SelectTrigger id="edit-status" className="bg-zinc-900 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                  <SelectItem value="stocked">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4" /> <span>Capricho / Normal (Stocked)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2 text-orange-500">
                      <AlertTriangle className="w-4 h-4" /> <span>Quedándose (Running Low)</span>
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
                <Label htmlFor="edit-quantity" className="text-zinc-500 text-[10px] uppercase font-bold">
                  Cantidad
                </Label>
                <Input 
                  id="edit-quantity" 
                  type="number" 
                  min={1} 
                  value={quantity} 
                  onChange={(e) => setQuantity(parseInt(e.target.value))} 
                  disabled={isSubmitting}
                  className="bg-zinc-900 border-zinc-700"
                />
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
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {expiryDate ? format(expiryDate, 'dd/MM/yy', { locale: es }) : 'Sin fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800 text-white" align="start">
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
          </div>

          <DialogFooter className="border-t border-zinc-800 pt-4 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditItemDialog;
