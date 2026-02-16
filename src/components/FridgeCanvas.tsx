import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FridgeItem, InventoryItem, ProductDefinition } from '../lib/types';
import { 
  Plus, ShoppingCart, StickyNote, AlertCircle, Info, Coffee, 
  ChevronDown, ChevronRight, Trash2, PackageSearch, AlertTriangle, 
  ShoppingBasket, Skull, X, PanelRightOpen
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

// Interfaz extendida para el Join
interface InventoryItemWithProduct extends InventoryItem {
  product?: ProductDefinition;
}

type Priority = 'critical' | 'normal' | 'low';

export const FridgeCanvas: React.FC<FridgeCanvasProps> = ({ householdId }) => {
  const { user } = useAuth();
  
  // UI Data States
  const [notes, setNotes] = useState<FridgeItem[]>([]);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [maxShoppingPriority, setMaxShoppingPriority] = useState<'panic'|'low'|'stocked'>('stocked');
  
  // ESTADOS DEL IMÁN DE STOCK
  const [receptionCount, setReceptionCount] = useState(0); 
  const [criticalCount, setCriticalCount] = useState(0);     
  const [highCount, setHighCount] = useState(0);             
  const [normalCount, setNormalCount] = useState(0);         
  const [expiryOnlyCount, setExpiryOnlyCount] = useState(0); 
  const [hasCriticalExpiry, setHasCriticalExpiry] = useState(false); 
  const [hasHighExpiry, setHasHighExpiry] = useState(false);         

  // ESTADO DEL PANEL DE NOTAS
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Modals
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  
  // Note Form
  const [newNoteText, setNewNoteText] = useState('');
  const [newNotePriority, setNewNotePriority] = useState<Priority>('normal');
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  // ✅ REF PARA FIX CRASH OPPO
  const noteInputRef = useRef<HTMLInputElement>(null);

  // ✅ EFECTO FOCUS RETARDADO (Para evitar bloqueo de teclado al abrir nota)
  useEffect(() => {
    if (isAddingNote) {
      const timer = setTimeout(() => {
        noteInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAddingNote]);

  // --- AUTOMATIZACIÓN INTELIGENTE (EL CEREBRO) ---
  const runAutomation = useCallback(async () => {
    if (!householdId) return;

    const [inventoryRes, shoppingListRes, receptionRes] = await Promise.all([
      supabase.from('inventory_items').select('*, product:product_definitions(*)').eq('household_id', householdId),
      supabase.from('shopping_list').select('id, item_name').eq('household_id', householdId).in('status', ['active', 'checked', 'postponed']), 
      supabase.from('shopping_list').select('item_name, quantity').eq('household_id', householdId).eq('status', 'bought')
    ]);

    const inventory = (inventoryRes.data || []) as InventoryItemWithProduct[];
    
    const shoppingListMap = new Map<string, string>(); 
    shoppingListRes.data?.forEach(i => shoppingListMap.set(i.item_name.trim().toLowerCase(), i.id));
    
    const receptionMap = new Map<string, number>();
    receptionRes.data?.forEach(i => {
      const k = i.item_name.trim().toLowerCase();
      receptionMap.set(k, (receptionMap.get(k) || 0) + (i.quantity || 1));
    });

    const today = new Date();
    // Mapa por Producto -> Estadísticas
    const productStats = new Map<string, { 
        name: string,
        totalQty: number, 
        effectiveQty: number,
        minQty: number, 
        importance: string,
        category: string,
        isExpiring: boolean 
    }>();

    inventory.forEach(item => {
      const prod = item.product;
      if (prod?.is_ghost || item.is_ghost) return;
      
      const key = prod ? prod.name.trim().toLowerCase() : item.name.trim().toLowerCase();
      
      // Lógica de caducidad estricta (<= 3 días)
      const daysLeft = item.expiry_date ? differenceInDays(new Date(item.expiry_date), today) : 999;
      const isExpiringBatch = daysLeft <= 3;
      const effectiveQty = isExpiringBatch ? 0 : item.quantity;
      
      if (!productStats.has(key)) {
        let threshold = 0;
        if (prod) {
            if (prod.min_quantity !== null) threshold = prod.min_quantity;
            else {
                if (prod.importance_level === 'critical') threshold = 4;
                else if (prod.importance_level === 'high') threshold = 2;
                else threshold = 1;
            }
        }
        
        productStats.set(key, { 
            name: prod ? prod.name : item.name,
            totalQty: 0, 
            effectiveQty: 0,
            minQty: threshold, 
            importance: prod ? prod.importance_level : 'normal',
            category: prod ? prod.category : item.category,
            isExpiring: false
        });
      }
      
      const stat = productStats.get(key)!;
      stat.totalQty += item.quantity;
      stat.effectiveQty += effectiveQty;
      if (isExpiringBatch) stat.isExpiring = true;
    });

    // Contadores para el Imán
    let cCrit = 0, cHigh = 0, cNorm = 0, cExpOnly = 0;
    let critExp = false, highExp = false;

    const itemsToDeleteFromList: string[] = [];

    for (const [nameKey, stats] of productStats.entries()) {
      const realStock = stats.effectiveQty + (receptionMap.get(nameKey) || 0);
      let priority: 'panic' | 'low' | null = null;
      let isStockLow = false;

      // ANALISIS DE ESTADO
      if (stats.importance === 'critical' && realStock <= stats.minQty) {
          priority = 'panic'; isStockLow = true; cCrit++;
          if (stats.isExpiring) critExp = true;
      }
      else if (stats.importance === 'high' && realStock <= stats.minQty) {
          priority = 'low'; isStockLow = true; cHigh++;
          if (stats.isExpiring) highExp = true;
      }
      else if (stats.importance === 'normal' && realStock <= stats.minQty && stats.minQty > 0) {
          priority = 'low'; // Opcional
          cNorm++;
      }

      // Si no es stock bajo pero caduca (y no es ghost), cuenta como alerta de caducidad pura
      if (!isStockLow && stats.isExpiring) {
          cExpOnly++;
      }
      
      // Fallback Legacy
      if (!priority && !stats.importance) {
         if (stats.minQty >= 4 && realStock <= 4) priority = 'panic';
         else if (stats.minQty >= 2 && realStock <= 2) priority = 'low';
      }

      // 1. AUTO-COMPRA (Solo Critical y High)
      if (['critical', 'high'].includes(stats.importance) && priority) {
        if (!shoppingListMap.has(nameKey)) {
          console.log(`🤖 Auto-compra: ${stats.name} (${priority})`);
          await supabase.from('shopping_list').upsert({
            household_id: householdId,
            item_name: stats.name,
            category: stats.category,
            priority: priority,
            is_manual: false,
            status: 'active'
          }, { onConflict: 'household_id, item_name', ignoreDuplicates: true } as any);
        }
      } 
      // 2. LIMPIEZA
      else if (realStock > stats.minQty && shoppingListMap.has(nameKey)) {
          itemsToDeleteFromList.push(shoppingListMap.get(nameKey)!);
      }
    }

    if (itemsToDeleteFromList.length > 0) {
        await supabase.from('shopping_list').delete().in('id', itemsToDeleteFromList);
    }

    // Actualizar estados visuales del imán
    setCriticalCount(cCrit);
    setHighCount(cHigh);
    setNormalCount(cNorm);
    setExpiryOnlyCount(cExpOnly);
    setHasCriticalExpiry(critExp);
    setHasHighExpiry(highExp);

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
    runAutomation(); 

    const channel = supabase.channel('fridge_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
         fetchData();
         setTimeout(runAutomation, 500); 
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fridge_items' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_definitions' }, () => {
         setTimeout(runAutomation, 500);
      })
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
  
  // LOGICA DE COLOR DEL IMAN (BORDE)
  const getStockBorderClass = () => { 
    if (criticalCount > 0) {
        if (hasCriticalExpiry) return 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse-red-purple';
        return 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]';
    }
    if (highCount > 0) {
        if (hasHighExpiry) return 'border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.2)] animate-pulse-orange-purple';
        return 'border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.2)]';
    }
    if (expiryOnlyCount > 0) return 'border-purple-500 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)] animate-pulse';
    if (normalCount > 0) return 'border-blue-500 bg-blue-500/5 border-dashed';
    return 'border-zinc-700 bg-zinc-800/50'; 
  };
  
  const getMainStockIcon = () => {
      if (criticalCount > 0) return <AlertTriangle className="w-8 h-8 mb-1 text-red-500 animate-bounce" />;
      if (highCount > 0) return <AlertTriangle className="w-8 h-8 mb-1 text-orange-500" />;
      if (expiryOnlyCount > 0) return <Skull className="w-8 h-8 mb-1 text-purple-500 animate-pulse" />;
      if (normalCount > 0) return <PackageSearch className="w-8 h-8 mb-1 text-blue-400" />;
      return <PackageSearch className="w-8 h-8 mb-1 text-green-500" />;
  };

  // Contadores de Notas para el botón colapsado
  const noteStats = {
      critical: notes.filter(n => n.layer === 'critical').length,
      normal: notes.filter(n => (n.layer === 'normal' || !n.layer)).length,
      low: notes.filter(n => n.layer === 'low').length,
  };

  return (
    <div className="flex relative h-[600px] w-full bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
      
      {/* 1. NEVERA (Ocupa todo el espacio por defecto) */}
      <div className="w-full h-full relative bg-[#18181b] bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] z-0">
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
          <div className={cn("absolute inset-0 -rotate-3 shadow-xl rounded-xl flex flex-col items-center justify-center border-2 group-hover:rotate-0 transition-all duration-300 pt-2", getStockBorderClass())}>
            {getMainStockIcon()}
            <span className="font-bold text-zinc-300 text-xs uppercase text-center mb-1">Stock<br/>Casa</span>
            
            {/* MINI CONTADORES (Fila Inferior) */}
            <div className="flex items-center gap-1 mt-1 px-1 bg-black/20 rounded-full py-0.5 border border-white/5">
                {criticalCount > 0 && (<div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-black shadow-sm", hasCriticalExpiry ? "bg-gradient-to-br from-red-600 to-purple-600 animate-pulse" : "bg-red-600")}>{criticalCount}</div>)}
                {highCount > 0 && (<div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-black shadow-sm", hasHighExpiry ? "bg-gradient-to-br from-orange-500 to-purple-600" : "bg-orange-500")}>{highCount}</div>)}
                {normalCount > 0 && (<div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white border border-black shadow-sm">{normalCount}</div>)}
                {expiryOnlyCount > 0 && (<div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-[9px] font-bold text-white border border-black shadow-sm"><Skull className="w-3 h-3" /></div>)}
                {(criticalCount + highCount + normalCount + expiryOnlyCount) === 0 && (<div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[9px] font-bold text-white border border-black shadow-sm">✓</div>)}
            </div>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-3 bg-yellow-500/80 rotate-1 shadow-sm"></div>
          </div>
          {receptionCount > 0 && (
            <div className="absolute -top-4 -left-4 bg-blue-600 text-white p-1.5 rounded-lg border-2 border-zinc-900 z-30 shadow-lg flex flex-col items-center animate-bounce">
                <ShoppingBasket className="w-4 h-4" /><span className="text-[10px] font-bold leading-none mt-0.5">+{receptionCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. GATILLO DEL PANEL DE NOTAS (Flotante a la derecha) */}
      {!isNotesOpen && (
          <button 
            onClick={() => setIsNotesOpen(true)}
            className="absolute top-1/2 right-0 -translate-y-1/2 bg-zinc-800 border-l border-t border-b border-zinc-700 rounded-l-xl p-2 z-30 shadow-2xl hover:bg-zinc-700 transition-all flex flex-col items-center gap-2 group"
          >
            <PanelRightOpen className="w-5 h-5 text-zinc-400 group-hover:text-white" />
            <span className="text-[10px] font-bold text-zinc-500 group-hover:text-zinc-300" style={{ writingMode: 'vertical-rl' }}>NOTAS</span>
            
            {/* Contadores Resumidos */}
            <div className="flex flex-col gap-1 mt-1">
                {noteStats.critical > 0 && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
                {noteStats.normal > 0 && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                {noteStats.low > 0 && <div className="w-2 h-2 rounded-full bg-zinc-500"></div>}
                {notes.length === 0 && <div className="w-2 h-2 rounded-full bg-zinc-700"></div>}
            </div>
          </button>
      )}

      {/* 3. PANEL DESLIZANTE (SLIDE OVER) */}
      <div className={cn(
          "absolute top-0 right-0 h-full w-full md:w-80 bg-zinc-900 border-l border-zinc-800 shadow-2xl z-40 transition-transform duration-300 ease-in-out flex flex-col",
          isNotesOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Cabecera Notas */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
          <h3 className="font-bold text-white flex items-center gap-2"><StickyNote className="w-4 h-4 text-zinc-400" /> Notas ({notes.length})</h3>
          <div className="flex gap-2">
             <Button size="sm" variant="secondary" className="h-8 text-xs font-semibold" onClick={() => setIsAddingNote(true)}><Plus className="w-3 h-3 mr-1" /> Nota</Button>
             <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => setIsNotesOpen(false)}><X className="w-4 h-4"/></Button>
          </div>
        </div>

        {/* Lista de Notas */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-zinc-900/50 flex flex-col justify-start">
          {isAddingNote && (
            <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-600 shadow-lg animate-in slide-in-from-top-2">
              <Input 
                ref={noteInputRef} // ✅ AQUI ESTA EL FIX
                placeholder="..." 
                className="mb-3 h-9 text-sm bg-zinc-900 text-white border-zinc-600" 
                value={newNoteText} 
                onChange={e => setNewNoteText(e.target.value)} 
              />
              <div className="flex justify-between items-center">
                <div className="flex gap-2">{(['critical','normal','low'] as Priority[]).map(p => <button key={p} onClick={()=>setNewNotePriority(p)} className={cn("w-5 h-5 rounded-full border", p==='critical'?'bg-red-500':p==='low'?'bg-zinc-500':'bg-blue-500', newNotePriority===p ? 'ring-2 ring-white':'opacity-50')}/>)}</div>
                <div className="flex gap-2"><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={()=>setIsAddingNote(false)}>X</Button><Button size="sm" className="h-7 text-xs bg-green-600" onClick={handleAddNote}>OK</Button></div>
              </div>
            </div>
          )}
          
          {notes.length === 0 && !isAddingNote && (
              <div className="flex flex-col items-center justify-center h-40 text-zinc-600 gap-2">
                  <StickyNote className="w-8 h-8 opacity-20"/>
                  <span className="text-xs">No hay notas pegadas.</span>
              </div>
          )}

          {notes.map((note) => {
             const isExpanded = expandedNote === note.id;
             const priority = note.layer || 'normal';
             return (
               <div key={note.id} className={`rounded-lg border ${getPriorityColor(priority)} bg-zinc-900/30`}>
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