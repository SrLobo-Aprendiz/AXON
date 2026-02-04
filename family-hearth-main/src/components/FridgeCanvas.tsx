import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FridgeItem, InventoryItem } from '../lib/types';
import { 
  Plus, ShoppingCart, StickyNote, AlertCircle, Info, Coffee, 
  ChevronDown, ChevronRight, Trash2, PackageSearch, AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns'; 

// MODALES
import { ShoppingListModal } from './ShoppingListModal';
import { StockModal } from './StockModal';

interface FridgeCanvasProps {
  householdId: string;
}

type Priority = 'critical' | 'normal' | 'low';

export const FridgeCanvas: React.FC<FridgeCanvasProps> = ({ householdId }) => {
  const { user } = useAuth();
  
  // UI Data States
  const [notes, setNotes] = useState<FridgeItem[]>([]);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [maxShoppingPriority, setMaxShoppingPriority] = useState<'panic'|'low'|'stocked'>('stocked');
  const [receptionCount, setReceptionCount] = useState(0); 
  const [stockStatusColor, setStockStatusColor] = useState<'green'|'yellow'|'red'>('green'); 
  const [stockAlertCount, setStockAlertCount] = useState(0); 

  // Modals
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  
  // Note Form
  const [newNoteText, setNewNoteText] = useState('');
  const [newNotePriority, setNewNotePriority] = useState<Priority>('normal');
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  // --- AUTOMATIZACIÓN INTELIGENTE (EL CEREBRO) ---
  const runAutomation = useCallback(async () => {
    if (!householdId) return;

    const [inventoryRes, shoppingListRes, receptionRes] = await Promise.all([
      supabase.from('inventory_items').select('*').eq('household_id', householdId),
      supabase.from('shopping_list').select('id, item_name').eq('household_id', householdId).in('status', ['active', 'checked', 'postponed']), 
      supabase.from('shopping_list').select('item_name, quantity').eq('household_id', householdId).eq('status', 'bought')
    ]);

    const inventory = (inventoryRes.data || []) as InventoryItem[];
    // Mapeamos lo que hay en lista de compra para poder borrarlo luego
    const shoppingListMap = new Map<string, string>(); // Nombre -> ID
    shoppingListRes.data?.forEach(i => shoppingListMap.set(i.item_name.trim().toLowerCase(), i.id));
    
    const receptionMap = new Map<string, number>();
    receptionRes.data?.forEach(i => {
      const k = i.item_name.trim().toLowerCase();
      receptionMap.set(k, (receptionMap.get(k) || 0) + (i.quantity || 1));
    });

    const today = new Date();
    const productStats = new Map<string, { totalQty: number, minQty: number, category: string }>();

    inventory.forEach(item => {
      if (item.is_ghost) return;
      const key = item.name.trim().toLowerCase();
      const daysLeft = item.expiry_date ? differenceInDays(new Date(item.expiry_date), today) : 999;
      const effectiveQty = daysLeft <= 2 ? 0 : item.quantity;
      
      // Obtenemos el min_quantity de este lote, o 0 si es null
      const currentMinQty = item.min_quantity || 0;

      if (!productStats.has(key)) {
        productStats.set(key, { totalQty: 0, minQty: currentMinQty, category: item.category });
      }
      
      const stat = productStats.get(key)!;
      stat.totalQty += effectiveQty;
      
      // IMPORTANTE: Nos quedamos con la regla más estricta (el min_quantity más alto de todos los lotes)
      // Si tienes un lote VIP (4) y uno Manual (0), el producto es VIP (4).
      if (currentMinQty > stat.minQty) {
          stat.minQty = currentMinQty;
      }
    });

    let panicCount = 0;
    let lowCount = 0;
    const itemsToDeleteFromList: string[] = [];

    for (const [nameKey, stats] of productStats.entries()) {
      const realStock = stats.totalQty + (receptionMap.get(nameKey) || 0);
      let priority: 'panic' | 'low' | null = null;

      // Definir umbrales de alerta
      if (stats.minQty >= 4 && realStock <= 4) priority = 'panic';
      else if (stats.minQty >= 2 && realStock <= 2) priority = 'low';

      // 1. LÓGICA DE AÑADIR (SI FALTA)
      if (priority) {
        if (priority === 'panic') panicCount++;
        if (priority === 'low') lowCount++;

        if (!shoppingListMap.has(nameKey)) {
          console.log(`🤖 Auto-compra: ${nameKey} (${priority})`);
          const displayName = nameKey.charAt(0).toUpperCase() + nameKey.slice(1);
          await supabase.from('shopping_list').upsert({
            household_id: householdId,
            item_name: displayName,
            category: stats.category,
            priority: priority,
            is_manual: false,
            status: 'active'
          }, { onConflict: 'household_id, item_name', ignoreDuplicates: true } as any);
        }
      } 
      
      // 2. LÓGICA DE LIMPIEZA (SI SOBRA O YA HAY)
      // Condición: Si el stock real supera el mínimo requerido.
      // Si minQty es 0 (Manual), basta con tener > 0 para borrarlo de la lista.
      else if (realStock > stats.minQty) {
          if (shoppingListMap.has(nameKey)) {
              console.log(`🧹 Limpieza: ${nameKey} tiene ${realStock} (Mín: ${stats.minQty}). Borrando de lista.`);
              itemsToDeleteFromList.push(shoppingListMap.get(nameKey)!);
          }
      }
    }

    // Ejecutar borrado masivo
    if (itemsToDeleteFromList.length > 0) {
        await supabase.from('shopping_list').delete().in('id', itemsToDeleteFromList);
    }

    if (panicCount > 0) setStockStatusColor('red');
    else if (lowCount > 0) setStockStatusColor('yellow');
    else setStockStatusColor('green');
    setStockAlertCount(panicCount + lowCount);

  }, [householdId]);

  // Carga de datos para UI
  const fetchData = useCallback(async () => {
    if (!householdId) return;

    // A) Notas
    const { data: notesData } = await supabase.from('fridge_items').select('*').eq('household_id', householdId).order('created_at', { ascending: false }); 
    if (notesData) setNotes((notesData as any) || []);

    // B) Lista Compra
    const { data: shoppingData } = await supabase.from('shopping_list').select('priority').eq('household_id', householdId).not('status', 'in', '("bought","archived")');
    if (shoppingData) {
      setShoppingCount(shoppingData.length);
      const hasPanic = shoppingData.some(i => i.priority === 'panic');
      const hasLow = shoppingData.some(i => i.priority === 'low');
      if (hasPanic) setMaxShoppingPriority('panic');
      else if (hasLow) setMaxShoppingPriority('low');
      else setMaxShoppingPriority('stocked');
    }

    // C) Recepción
    const { count: countLimbo } = await supabase.from('shopping_list').select('*', { count: 'exact', head: true }).eq('household_id', householdId).eq('status', 'bought'); 
    setReceptionCount(countLimbo || 0);

  }, [householdId]);

  // Suscripciones
  useEffect(() => { 
    fetchData();
    runAutomation(); // Ejecutar cerebro al inicio

    const channel = supabase.channel('fridge_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
         fetchData();
         // Esperamos un poco para que la BD asiente cambios antes de re-evaluar automatización
         setTimeout(runAutomation, 500); 
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fridge_items' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData, runAutomation]);

  // -- GESTIÓN DE NOTAS (UI Only) --
  const handleAddNote = async () => {
    if (!newNoteText.trim() || !user) return;
    await supabase.from('fridge_items').insert({ household_id: householdId, content: newNoteText, layer: newNotePriority, created_by: user.id, position_x: 0, position_y: 0, rotation: 0 } as any);
    setNewNoteText(''); setIsAddingNote(false); fetchData();
  };
  const handleDeleteNote = async (noteId: string) => { if(confirm("¿Borrar?")) await supabase.from('fridge_items').delete().eq('id', noteId); fetchData(); };

  // Helpers Visuales
  const getPriorityColor = (priority: string) => { switch (priority) { case 'critical': return 'bg-red-900/20 border-red-500 text-red-200'; case 'low': return 'bg-zinc-800 border-zinc-600 text-zinc-400'; default: return 'bg-blue-900/20 border-blue-500 text-blue-200'; }};
  const getPriorityIcon = (priority: string) => { switch (priority) { case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />; case 'low': return <Coffee className="w-4 h-4 text-zinc-500" />; default: return <Info className="w-4 h-4 text-blue-500" />; }};
  const getShoppingBadgeColor = () => { if (maxShoppingPriority === 'panic') return 'bg-red-500 animate-pulse border-red-900'; if (maxShoppingPriority === 'low') return 'bg-orange-500 border-orange-900'; return 'bg-green-600 border-zinc-900'; };
  const getStockBorderColor = () => { if (stockStatusColor === 'red') return 'border-red-500/80 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.2)]'; if (stockStatusColor === 'yellow') return 'border-orange-500/80 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.2)]'; return 'border-zinc-700 bg-zinc-800/50'; };

  return (
    <div className="flex flex-col md:flex-row h-[600px] w-full bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden relative">
      {/* NEVERA */}
      <div className="flex-1 relative bg-[#18181b] bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] min-h-[300px] z-0">
        <div className="absolute bottom-4 left-4 text-zinc-800 font-bold text-4xl opacity-20 pointer-events-none select-none">AXON</div>
        
        {/* IMÁN LISTA */}
        <div onClick={() => setShowShoppingList(true)} className="absolute top-10 left-10 w-28 h-28 cursor-pointer transition-transform hover:scale-105 active:scale-95 z-20 group">
          <div className="absolute inset-0 bg-white rotate-2 shadow-2xl rounded-sm flex flex-col items-center justify-center border-t-8 border-zinc-200 group-hover:rotate-0 transition-transform duration-300">
            <ShoppingCart className="w-8 h-8 text-zinc-800 mb-2" /><span className="font-bold text-black text-xs uppercase text-center leading-tight">Lista<br/>Súper</span>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-600 shadow-md ring-2 ring-black/20"></div>
          </div>
          {shoppingCount > 0 && <div className={cn("absolute -top-2 -right-2 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 z-30 shadow-lg", getShoppingBadgeColor())}>{shoppingCount}</div>}
        </div>

        {/* IMÁN STOCK */}
        <div onClick={() => setShowStockModal(true)} className="absolute bottom-10 right-10 w-32 h-32 cursor-pointer transition-transform hover:scale-105 active:scale-95 z-20 group">
          <div className={cn("absolute inset-0 -rotate-3 shadow-xl rounded-xl flex flex-col items-center justify-center border-2 group-hover:rotate-0 transition-all duration-300", getStockBorderColor())}>
            <PackageSearch className={cn("w-8 h-8 mb-1", stockStatusColor === 'red' ? "text-red-400" : stockStatusColor === 'yellow' ? "text-orange-400" : "text-blue-400")} />
            <span className="font-bold text-zinc-300 text-xs uppercase text-center">Stock<br/>Casa</span>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-3 bg-yellow-500/80 rotate-1 shadow-sm"></div>
          </div>
          {receptionCount > 0 && <div className="absolute -top-3 -left-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-zinc-900 z-30 shadow-lg flex items-center gap-1 animate-bounce"><span>+{receptionCount}</span></div>}
          {stockAlertCount > 0 && <div className={cn("absolute -bottom-2 -right-2 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-zinc-900 z-30 shadow-lg", stockStatusColor === 'red' ? 'bg-red-500 animate-pulse' : 'bg-orange-500')}><AlertTriangle className="w-3 h-3" /></div>}
        </div>
      </div>

      {/* NOTAS (Lateral) */}
      <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-900 flex flex-col z-10">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shadow-sm">
          <h3 className="font-bold text-white flex items-center gap-2"><StickyNote className="w-4 h-4 text-zinc-400" /> Notas</h3>
          <Button size="sm" variant="secondary" className="h-8 text-xs font-semibold" onClick={() => setIsAddingNote(true)}><Plus className="w-3 h-3 mr-1" /> Nota</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-zinc-900/50 flex flex-col justify-start">
          {isAddingNote && (
            <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-600 shadow-lg">
              <Input autoFocus placeholder="..." className="mb-3 h-9 text-sm bg-zinc-900 text-white border-zinc-600" value={newNoteText} onChange={e => setNewNoteText(e.target.value)} />
              <div className="flex justify-between items-center">
                <div className="flex gap-2">{(['critical','normal','low'] as Priority[]).map(p => <button key={p} onClick={()=>setNewNotePriority(p)} className={cn("w-5 h-5 rounded-full border", p==='critical'?'bg-red-500':p==='low'?'bg-zinc-500':'bg-blue-500', newNotePriority===p ? 'ring-2 ring-white':'opacity-50')}/>)}</div>
                <div className="flex gap-2"><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={()=>setIsAddingNote(false)}>X</Button><Button size="sm" className="h-7 text-xs bg-green-600" onClick={handleAddNote}>OK</Button></div>
              </div>
            </div>
          )}
          {notes.map((note) => {
             const isExpanded = expandedNote === note.id;
             const priority = note.layer || 'normal';
             return (
               <div key={note.id} className={`rounded-lg border ${getPriorityColor(priority)}`}>
                 <div className="flex items-center p-3 cursor-pointer" onClick={() => setExpandedNote(isExpanded ? null : note.id)}>
                   <div className="mr-3">{getPriorityIcon(priority)}</div><span className="text-sm font-medium flex-1 truncate">{note.content}</span>
                   {isExpanded ? <ChevronDown className="w-4 h-4 opacity-50"/> : <ChevronRight className="w-4 h-4 opacity-50"/>}
                 </div>
                 {isExpanded && <div className="px-3 pb-3 pt-2 text-xs border-t border-black/10 mt-1 flex justify-between items-center bg-black/10"><span className="opacity-60">{note.created_by===user?.id?'Tú':'Otro'}</span><Button variant="ghost" size="sm" className="h-6 px-2 text-red-400 hover:text-red-200" onClick={(e)=>{e.stopPropagation();handleDeleteNote(note.id)}}><Trash2 className="w-3 h-3"/> Borrar</Button></div>}
               </div>
             )
          })}
        </div>
      </div>

      <ShoppingListModal isOpen={showShoppingList} onClose={() => setShowShoppingList(false)} householdId={householdId} />
      <StockModal isOpen={showStockModal} onClose={() => setShowStockModal(false)} householdId={householdId} />
    </div>
  );
};