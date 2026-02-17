import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Pencil, Calendar as CalendarIcon, Trash2, ArrowRightLeft, 
  Split, Check, X, MapPin, Euro 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { cn } from '@/lib/utils';

const safeDate = (d: string | null | undefined) => {
    if (!d) return undefined;
    const date = new Date(d);
    return isNaN(date.getTime()) ? undefined : date;
};

interface InventoryBatchRowProps {
  batch: any;
  unit: string;
  householdId: string;
  onUpdate: (batchId: string, updates: any) => void;
  onDelete: (batchId: string) => void;
  onMove: (batch: any, newLoc: string, qty: number, dates?: { origin: Date|undefined, dest: Date|undefined }) => void;
}

export const InventoryBatchRow: React.FC<InventoryBatchRowProps> = ({
  batch,
  unit,
  householdId,
  onUpdate,
  onDelete,
  onMove,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState(batch.quantity.toString());
  const [editPrice, setEditPrice] = useState(batch.price?.toString() || '');
  const [editLocation, setEditLocation] = useState(''); // Se inicia vacío al editar
  const [editDate, setEditDate] = useState<Date | undefined>(safeDate(batch.expiry_date));

  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveQty, setMoveQty] = useState<string>(batch.quantity.toString());
  const [moveLocation, setMoveLocation] = useState('');
  const [splitDateMode, setSplitDateMode] = useState(false);
  const [splitDateOrigin, setSplitDateOrigin] = useState<Date | undefined>(safeDate(batch.expiry_date));
  const [splitDateDest, setSplitDateDest] = useState<Date | undefined>(safeDate(batch.expiry_date));

  const handleSaveEdit = () => {
    const updates: any = {
        quantity: Number(editQty),
        price: editPrice ? Number(editPrice) : null,
        expiry_date: editDate ? format(editDate, 'yyyy-MM-dd') : null
    };
    // Solo actualizamos ubicación si el usuario escribió algo, si la dejó vacía mantenemos la que tenía
    if (editLocation.trim()) {
        updates.location = editLocation;
    }

    onUpdate(batch.id, updates);
    setIsEditing(false);
  };

  const handleMoveConfirm = () => {
    const q = Number(moveQty);
    if (q <= 0 || q > batch.quantity) return;
    if (!moveLocation.trim()) return;

    const dates = splitDateMode 
        ? { origin: splitDateOrigin, dest: splitDateDest } 
        : undefined;

    onMove(batch, moveLocation, q, dates);
    setIsMoveOpen(false);
    setMoveLocation('');
    setSplitDateMode(false);
  };

  return (
    <div className="group flex flex-col gap-2 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 transition-all">
      
      {!isEditing ? (
        <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1 min-w-[70px]">
                <span className="text-2xl font-bold text-white font-mono">{batch.quantity}</span>
                <span className="text-xs text-zinc-500">{unit}</span>
            </div>

            <div className="flex-1 grid gap-1">
                <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-blue-500 shrink-0"/>
                    <span className="text-sm text-zinc-300 font-medium truncate">{batch.location || 'Sin ubicación'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <div className={cn("flex items-center gap-1", !batch.expiry_date ? "text-zinc-600" : "text-zinc-400")}>
                        <CalendarIcon className="w-3 h-3"/>
                        {batch.expiry_date ? format(safeDate(batch.expiry_date)!, 'dd/MM/yy', { locale: es }) : 'Sin fecha'}
                    </div>
                    {batch.price && (
                        <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-1.5 rounded">
                            <Euro className="w-3 h-3"/> {batch.price}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-500 hover:text-white" onClick={() => {
                    setEditQty(batch.quantity.toString());
                    setEditPrice(batch.price?.toString() || '');
                    setEditLocation(''); // <--- AQUÍ ESTÁ EL CAMBIO: INICIA VACÍO
                    setEditDate(safeDate(batch.expiry_date));
                    setIsEditing(true);
                }}>
                    <Pencil className="h-4 w-4"/>
                </Button>

                <Popover open={isMoveOpen} onOpenChange={setIsMoveOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                            <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 p-4 bg-zinc-950 border-zinc-700 shadow-xl">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Mover / Dividir</h4>
                            </div>
                            <div className="flex items-center gap-3">
                                <Input type="number" className="h-8 w-20 text-center bg-zinc-900 border-zinc-700 text-white font-bold"
                                    value={moveQty} onChange={(e) => setMoveQty(e.target.value)} max={batch.quantity} min={0.1} />
                                <span className="text-xs text-zinc-500">de {batch.quantity} {unit}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-zinc-900 p-2 rounded border border-zinc-800">
                                <Checkbox id="split-dates" checked={splitDateMode} onCheckedChange={(c) => setSplitDateMode(!!c)} className="border-zinc-600"/>
                                <Label htmlFor="split-dates" className="text-xs text-zinc-400 flex items-center gap-1 cursor-pointer">
                                    <Split className="w-3 h-3"/> Cambiar fechas
                                </Label>
                            </div>
                            {splitDateMode && (
                                <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-blue-400 font-bold uppercase">Origen</span>
                                        <Popover>
                                            <PopoverTrigger asChild><Button variant="outline" className="w-full h-7 text-[10px] bg-zinc-900 border-zinc-700 justify-start px-2 text-white">{splitDateOrigin ? format(splitDateOrigin, 'dd/MM') : 'Sin'}</Button></PopoverTrigger>
                                            <PopoverContent className="p-0 bg-zinc-950 border-zinc-800"><Calendar mode="single" selected={splitDateOrigin} onSelect={setSplitDateOrigin} className="bg-zinc-950 text-white"/></PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-purple-400 font-bold uppercase">Destino</span>
                                        <Popover>
                                            <PopoverTrigger asChild><Button variant="outline" className="w-full h-7 text-[10px] bg-zinc-900 border-zinc-700 justify-start px-2 text-white">{splitDateDest ? format(splitDateDest, 'dd/MM') : 'Sin'}</Button></PopoverTrigger>
                                            <PopoverContent className="p-0 bg-zinc-950 border-zinc-800"><Calendar mode="single" selected={splitDateDest} onSelect={setSplitDateDest} className="bg-zinc-950 text-white"/></PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-1">
                                <Label className="text-[10px] text-zinc-500 uppercase font-bold">Mover a</Label>
                                <LocationAutocomplete value={moveLocation} onChange={setMoveLocation} householdId={householdId} placeholder="Nueva ubicación..." />
                            </div>
                            <Button className="w-full h-8 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs" onClick={handleMoveConfirm}>Confirmar Movimiento</Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => { if (confirm('¿Eliminar este lote?')) onDelete(batch.id); }}>
                    <Trash2 className="h-4 w-4"/>
                </Button>
            </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 animate-in fade-in bg-zinc-950/50 p-2 rounded border border-blue-500/30">
            <div className="flex gap-2">
                <div className="w-20">
                    <Label className="text-[10px] text-zinc-500 font-bold">Cant.</Label>
                    <Input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} className="h-8 bg-zinc-900 border-zinc-700 text-center font-bold" />
                </div>
                <div className="flex-1">
                    <Label className="text-[10px] text-zinc-500 font-bold">Ubicación</Label>
                    <LocationAutocomplete 
                         value={editLocation} 
                         onChange={setEditLocation} 
                         householdId={householdId} 
                         placeholder="¿Dónde lo guardas?" 
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <div className="flex-1">
                    <Label className="text-[10px] text-zinc-500 font-bold">Caducidad</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full h-8 justify-start text-left font-normal bg-zinc-900 border-zinc-700 text-xs", !editDate && "text-zinc-500")}>
                                <CalendarIcon className="mr-2 h-3 w-3" />
                                {editDate ? format(editDate, 'dd/MM/yy') : <span>Sin fecha</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800 text-white"><Calendar mode="single" selected={editDate} onSelect={setEditDate} initialFocus className="bg-zinc-950 text-white"/></PopoverContent>
                    </Popover>
                </div>
                <div className="w-24">
                    <Label className="text-[10px] text-zinc-500 font-bold">Precio (€)</Label>
                    <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="h-8 bg-zinc-900 border-zinc-700 text-right" placeholder="0.00" />
                </div>
            </div>
            <div className="flex gap-2 pt-1">
                <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs" onClick={() => setIsEditing(false)}>Cancelar</Button>
                <Button size="sm" className="flex-1 h-7 bg-green-600 hover:bg-green-500 text-xs" onClick={handleSaveEdit}><Check className="w-3 h-3 mr-1"/> Guardar</Button>
            </div>
        </div>
      )}
    </div>
  );
};