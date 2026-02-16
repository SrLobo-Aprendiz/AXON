import React, { useState, useEffect } from 'react';
import { Save, Loader2, Ghost, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { CATEGORIES, CATEGORY_CONFIG } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EditProductDialogProps {
  product: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export const EditProductDialog: React.FC<EditProductDialogProps> = ({ product, isOpen, onOpenChange, onUpdated }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Campos de Edición
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('uds');
  const [isGhost, setIsGhost] = useState(false);
  const [priority, setPriority] = useState<'critical'|'high'|'normal'>('normal');
  const [minQty, setMinQty] = useState('');
  
  // NUEVO: Estado para actualizar lotes antiguos
  const [updateBatches, setUpdateBatches] = useState(false);

  // Cargar datos al abrir
  useEffect(() => {
    if (product && isOpen) {
      setName(product.name || '');
      setCategory(product.category || 'Pantry');
      setUnit(product.unit || 'uds');
      setIsGhost(product.is_ghost || false);
      setPriority(product.is_ghost ? 'normal' : (product.importance_level || 'normal'));
      setMinQty(product.min_quantity?.toString() || '');
      setUpdateBatches(false); // Resetear siempre al abrir
    }
  }, [product, isOpen]);

  const handleSave = async () => {
    if (!product) return;
    if (!name.trim()) { toast({ title: "El nombre es obligatorio", variant: "destructive" }); return; }

    setIsSubmitting(true);
    try {
        // 1. Actualizar el Producto Padre (Definición)
        const { error } = await supabase.from('product_definitions')
            .update({
                name: name.trim(),
                category: category,
                unit: unit,
                is_ghost: isGhost,
                importance_level: isGhost ? 'ghost' : priority,
                min_quantity: (!isGhost && minQty) ? Number(minQty) : null
            } as any)
            .eq('id', product.product_id); // Ojo: product.product_id es el ID de la definición

        if (error) throw error;

        // 2. Si el usuario quiere, actualizamos también todos los lotes (Inventory Items)
        if (updateBatches) {
            const { error: batchError } = await supabase.from('inventory_items')
                .update({
                    name: name.trim(),
                    category: category,
                    unit: unit,
                    // No actualizamos location, expiry, etc. Solo datos descriptivos.
                } as any)
                .eq('product_id', product.product_id);

            if (batchError) throw batchError;
        }

        toast({ 
            title: "Producto actualizado", 
            description: updateBatches 
                ? "Se han actualizado la definición y todos los lotes existentes." 
                : "Cambios guardados en la definición del producto." 
        });
        
        onUpdated();
        onOpenChange(false);
    } catch (e: any) {
        toast({ title: "Error al guardar", description: e.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-full max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            Editar Producto
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-xs">
            Modifica la configuración general de {product?.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
            {/* 1. Datos Básicos */}
            <div className="space-y-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <div className="grid gap-1.5">
                    <Label className="text-xs font-bold text-zinc-400">Nombre</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} className="bg-zinc-950 border-zinc-700 h-9" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-bold text-zinc-400">Categoría</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-700 h-9 text-xs"><SelectValue/></SelectTrigger>
                            <SelectContent className="bg-zinc-950 border-zinc-800 text-white max-h-[200px]">
                                {CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>
                                        <div className="flex items-center gap-2">
                                            {React.createElement(CATEGORY_CONFIG[cat].icon, { className: "w-3 h-3" })}
                                            {CATEGORY_CONFIG[cat].label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-bold text-zinc-400">Unidad</Label>
                        <Select value={unit} onValueChange={setUnit}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-700 h-9 text-xs"><SelectValue/></SelectTrigger>
                            <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                                {['uds', 'kg', 'g', 'L', 'ml'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                {/* NUEVO: Checkbox para propagar cambios */}
                <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/50">
                    <Checkbox 
                        id="update-batches" 
                        checked={updateBatches} 
                        onCheckedChange={(c: boolean) => setUpdateBatches(c)}
                        className="border-zinc-600 data-[state=checked]:bg-blue-600"
                    />
                    <label htmlFor="update-batches" className="text-xs text-zinc-400 cursor-pointer select-none flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 text-zinc-500"/>
                        Actualizar también el nombre/categoría en los lotes existentes
                    </label>
                </div>
            </div>

            {/* 2. Configuración de Alertas */}
            <div className="space-y-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 transition-all">
                
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
                        <Switch 
                            checked={isGhost} 
                            onCheckedChange={setIsGhost} 
                            className="data-[state=checked]:bg-purple-600 scale-75 origin-right"
                        />
                    </div>
                </div>
                
                <div className={cn("flex gap-2 items-start p-2 rounded border transition-colors", isGhost ? "bg-purple-900/10 border-purple-500/20" : "bg-blue-900/10 border-blue-500/20")}>
                    <Info className={cn("w-4 h-4 shrink-0 mt-0.5", isGhost ? "text-purple-400" : "text-blue-400")}/>
                    <span className={cn("text-[10px] leading-tight", isGhost ? "text-purple-200" : "text-blue-200")}>
                        {isGhost 
                            ? "Producto oculto en alertas. Útil para caprichos o items que no necesitas reponer obligatoriamente." 
                            : "El sistema te avisará automáticamente cuando el stock baje del mínimo definido abajo."}
                    </span>
                </div>

                {!isGhost && (
                    <div className="grid grid-cols-2 gap-3 pt-1 animate-in fade-in slide-in-from-top-1">
                        <div className="grid gap-1.5">
                            <Label className="text-[10px] font-bold text-zinc-500 uppercase">Prioridad</Label>
                            <Select value={priority} onValueChange={(v:any) => setPriority(v)}>
                                <SelectTrigger className="bg-zinc-950 border-zinc-700 h-8 text-xs"><SelectValue/></SelectTrigger>
                                <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                                    <SelectItem value="critical" className="text-red-400">🔴 Vital</SelectItem>
                                    <SelectItem value="high" className="text-orange-400">🟠 Alta</SelectItem>
                                    <SelectItem value="normal" className="text-blue-400">🔵 Normal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-[10px] font-bold text-zinc-500 uppercase">Mínimo</Label>
                            <Input 
                                type="number" 
                                value={minQty} 
                                onChange={e => setMinQty(e.target.value)} 
                                className="bg-zinc-950 border-zinc-700 h-8 text-xs" 
                                placeholder="Ej: 2"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>

        <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
                Guardar
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};