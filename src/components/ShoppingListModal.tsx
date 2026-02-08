import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingListItem, ProductDefinition } from '../lib/types'; // Importamos ProductDefinition
import { 
  Plus, Check, Trash2, ShoppingCart, 
  Beef, Milk, Carrot, SprayCan, Package, 
  Croissant, Snowflake, Coffee,
  AlertCircle, AlertTriangle, Ghost,
  ArrowRight, Clock, LayoutGrid, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
}

// Configuración de Categorías (Español)
const CATEGORY_ICONS: Record<string, { icon: React.ReactNode, color: string, label: string }> = {
  Meat: { icon: <Beef className="w-4 h-4"/>, color: 'bg-red-500/20 text-red-300', label: 'Carne' },
  Dairy: { icon: <Milk className="w-4 h-4"/>, color: 'bg-blue-500/20 text-blue-300', label: 'Lácteos' },
  Produce: { icon: <Carrot className="w-4 h-4"/>, color: 'bg-green-500/20 text-green-300', label: 'Fresco' },
  Bakery: { icon: <Croissant className="w-4 h-4"/>, color: 'bg-yellow-500/20 text-yellow-300', label: 'Panadería' },
  Frozen: { icon: <Snowflake className="w-4 h-4"/>, color: 'bg-cyan-500/20 text-cyan-300', label: 'Congelados' },
  Beverages: { icon: <Coffee className="w-4 h-4"/>, color: 'bg-amber-500/20 text-amber-300', label: 'Bebidas' },
  Household: { icon: <SprayCan className="w-4 h-4"/>, color: 'bg-purple-500/20 text-purple-300', label: 'Hogar/Limp.' },
  Pantry: { icon: <Package className="w-4 h-4"/>, color: 'bg-zinc-500/20 text-zinc-300', label: 'Despensa' },
};
const DB_CATEGORIES = Object.keys(CATEGORY_ICONS);

// MAPA DE TRADUCCIÓN INVERSO (Para mostrar en sugerencias)
const CATEGORY_MAP: Record<string, string> = {
  Pantry: 'Despensa', Dairy: 'Lácteos', Meat: 'Carne', Produce: 'Fresco', 
  Bakery: 'Panadería', Frozen: 'Congelados', Beverages: 'Bebidas', Household: 'Limpieza'
};

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({ isOpen, onClose, householdId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  
  // FILTRO VISUAL vs CATEGORÍA DE AÑADIDO
  const [viewFilter, setViewFilter] = useState<string | null>(null); // Null = Ver Todo
  const [addItemCategory, setAddItemCategory] = useState<string>('Pantry'); // Categoría para el nuevo item
  
  const [isGhost, setIsGhost] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'postponed'>('active');

  // --- ESTADOS DE AUTOCOMPLETADO ---
  const [searchResults, setSearchResults] = useState<ProductDefinition[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sincronizar filtro con categoría de añadido
  useEffect(() => {
    if (viewFilter) {
      setAddItemCategory(viewFilter); // Si filtro por Carne, añado Carne
    }
  }, [viewFilter]);

  // Búsqueda en tiempo real (Autocompletado)
  useEffect(() => {
    const search = async () => {
      if (!newItemName.trim() || !householdId) { setSearchResults([]); return; }
      
      // Buscar en product_definitions
      const { data } = await supabase
        .from('product_definitions')
        .select('*')
        .eq('household_id', householdId)
        .ilike('name', `%${newItemName}%`)
        .limit(5);
      
      if (data) setSearchResults(data as ProductDefinition[]);
    };
    
    // Debounce de 300ms
    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [newItemName, householdId]);

  const handleSelectSuggestion = (product: ProductDefinition) => {
      setNewItemName(product.name);
      // Auto-seleccionar la categoría del producto si no hay filtro activo
      if (!viewFilter) {
          setAddItemCategory(product.category);
      }
      setShowSuggestions(false);
  };

  const fetchItems = useCallback(async () => {
    if (!householdId) return;
    const { data, error } = await supabase
      .from('shopping_list')
      .select('*')
      .eq('household_id', householdId)
      .not('status', 'in', '("bought","archived")') 
      .order('created_at', { ascending: false });
    if (!error && data) setItems(data as any);
  }, [householdId]);

  useEffect(() => {
    if (isOpen) {
      fetchItems();
      const channel = supabase.channel('shopping_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list', filter: `household_id=eq.${householdId}` }, fetchItems)
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [isOpen, householdId, fetchItems]);

  const handleAddItem = async () => {
    if (!newItemName.trim() || !user) return;
    setIsLoading(true);

    const tempId = crypto.randomUUID(); // ID temporal para UI
    const categoryToUse = viewFilter || addItemCategory;

    // UI Optimista (Lo ves ya)
    const optimisticItem: any = {
      id: tempId,
      household_id: householdId,
      item_name: newItemName.trim(),
      category: categoryToUse,
      quantity: 1,
      status: 'active',
      added_by: user.id,
      is_manual: true,
      is_ghost: isGhost,
      priority: 'stocked', // Valor por defecto neutro
      created_at: new Date().toISOString()
    };
    setItems(prev => [optimisticItem, ...prev]);

    // Reset Formulario INMEDIATO
    setNewItemName(''); 
    setIsGhost(false); 
    setShowSuggestions(false); // Ocultar sugerencias
    // No reseteamos categoría para permitir añadir varios seguidos del mismo tipo

    // Llamada DB
    const { error } = await supabase.from('shopping_list').insert({
      household_id: householdId,
      item_name: optimisticItem.item_name, 
      category: categoryToUse,
      quantity: 1,
      status: 'active',
      added_by: user.id,
      is_manual: true,
      is_ghost: isGhost,
      priority: 'stocked' // Valor por defecto neutro
    });

    if (error) {
      toast({ title: "Error", description: "No se pudo guardar (¿Duplicado?).", variant: "destructive" });
      fetchItems(); // Revertir si falló
    } else {
      fetchItems(); // Confirmar ID real
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    // Optimistic Delete (Borrado visual instantáneo)
    setItems(prev => prev.filter(i => i.id !== id));
    
    const { error } = await supabase.from('shopping_list').delete().eq('id', id);
    if (error) {
       toast({ title: "Error", description: "No se pudo borrar.", variant: "destructive" });
       fetchItems(); // Recuperar si falló
    }
  };

  const handlePostpone = async (id: string) => {
    // Optimistic Update
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'postponed' } : i));
    await supabase.from('shopping_list').update({ status: 'postponed' } as any).eq('id', id);
    toast({ title: "Pospuesto", description: "Oculto temporalmente." });
  };

  const toggleItemStatus = async (item: ShoppingListItem) => {
    let newStatus = item.status === 'active' ? 'checked' : 'active';
    if (item.status === 'postponed') newStatus = 'active';

    // Optimistic Update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));

    await supabase.from('shopping_list').update({ status: newStatus } as any).eq('id', item.id);
  };

  const handleFinalizePurchase = async () => {
    const checked = items.filter(i => i.status === 'checked');
    if (checked.length === 0) return;
    setIsLoading(true);
    
    // Optimistic Clear
    setItems(prev => prev.filter(i => i.status !== 'checked'));

    const idsToUpdate = checked.map(i => i.id);
    await supabase.from('shopping_list').update({ status: 'bought' } as any).in('id', idsToUpdate);
    
    toast({ title: "¡Compra finalizada!", description: `${checked.length} productos movidos a stock.` });
    setIsLoading(false);
    fetchItems();
  };

  // Lógica de visualización
  const visibleItems = items.filter(i => {
      let matchesView = false;
      if (viewMode === 'active') matchesView = i.status === 'active' || i.status === 'checked';
      if (viewMode === 'postponed') matchesView = i.status === 'postponed';

      let matchesCategory = true;
      if (viewFilter) matchesCategory = i.category === viewFilter;

      return matchesView && matchesCategory;
  });
  
  const checkedItems = items.filter(i => i.status === 'checked');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-full max-w-md h-[85vh] flex flex-col p-0 gap-0">
        
        {/* HEADER */}
        <DialogHeader className="p-4 border-b border-zinc-800 bg-zinc-900 flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg"><ShoppingCart className="w-5 h-5 text-green-500" /> Lista Compra</DialogTitle>
          <div className="flex bg-zinc-800 rounded-lg p-0.5 mr-8">
             <button onClick={()=>setViewMode('active')} className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode==='active'?'bg-zinc-600 text-white font-bold':'text-zinc-400 hover:text-white'}`}>Activos</button>
             <button onClick={()=>setViewMode('postponed')} className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode==='postponed'?'bg-zinc-600 text-white font-bold':'text-zinc-400 hover:text-white'}`}>Pospuestos</button>
          </div>
        </DialogHeader>

        {/* INPUT ZONA (Solo Activos) */}
        {viewMode === 'active' && (
            <div className="p-4 bg-zinc-900 border-b border-zinc-800 shrink-0 z-10 shadow-md flex flex-col gap-3 relative">
                
                {/* 1. FILTROS VISUALES (Píldoras) */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button onClick={() => setViewFilter(null)} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold border transition-all whitespace-nowrap ${!viewFilter ? 'bg-white text-black border-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800'}`}>
                        <LayoutGrid className="w-3 h-3" /> Todo
                    </button>
                    {DB_CATEGORIES.map(catId => { 
                        const config = CATEGORY_ICONS[catId]; 
                        return (
                            <button key={catId} onClick={() => setViewFilter(viewFilter === catId ? null : catId)} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold border transition-all whitespace-nowrap ${viewFilter === catId ? `${config.color} border-current ring-1 ring-white/20` : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800'}`}>
                                {config.icon} {config.label}
                            </button>
                        )
                    })}
                </div>

                {/* 2. BARRA DE ENTRADA */}
                <div className="flex gap-2 relative">
                    {/* Input Nombre con Sugerencias */}
                    <div className="flex-1 relative">
                        <Input 
                            placeholder={viewFilter ? `Añadir en ${CATEGORY_ICONS[viewFilter].label}...` : "Añadir..."} 
                            value={newItemName} 
                            onChange={(e) => {
                                setNewItemName(e.target.value);
                                setShowSuggestions(true);
                            }} 
                            onFocus={() => setShowSuggestions(true)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()} 
                            className="bg-zinc-950 border-zinc-700 text-white w-full pr-8"
                            autoComplete="off"
                        />
                        {/* Icono de búsqueda pequeño */}
                        <Search className="absolute right-3 top-3 w-4 h-4 text-zinc-600 pointer-events-none"/>

                        {/* DESPLEGABLE DE SUGERENCIAS */}
                        {showSuggestions && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                                {searchResults.map(p => (
                                    <div key={p.id} onClick={() => handleSelectSuggestion(p)} className="px-3 py-2 hover:bg-zinc-800 cursor-pointer flex justify-between items-center group border-b border-zinc-800/50 last:border-0">
                                        <span className="text-sm font-medium text-zinc-200 group-hover:text-white">{p.name}</span>
                                        <span className="text-[10px] text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                                            {CATEGORY_MAP[p.category] || p.category}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selector Categoría (Solo si NO hay filtro activo, para poder elegir) */}
                    {!viewFilter && (
                         <Select value={addItemCategory} onValueChange={setAddItemCategory}>
                            <SelectTrigger className="w-[40px] px-0 justify-center bg-zinc-900 border-zinc-700 text-zinc-400" title="Categoría">
                                {CATEGORY_ICONS[addItemCategory]?.icon || <Package className="w-4 h-4"/>}
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                {DB_CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>
                                        <div className="flex items-center gap-2">{CATEGORY_ICONS[cat].icon} {CATEGORY_ICONS[cat].label}</div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Botón Añadir */}
                    <Button onClick={handleAddItem} disabled={isLoading} className="bg-green-600 hover:bg-green-500 px-3"><Plus className="w-4 h-4" /></Button>
                </div>
            </div>
        )}

        {/* LISTA */}
        <ScrollArea className="flex-1 p-4 bg-zinc-950" onClick={() => setShowSuggestions(false)}>
          <div className="space-y-2 mb-6">
            {visibleItems.length === 0 && <div className="text-center text-zinc-700 py-10 text-sm">Lista vacía.</div>}
            
            {visibleItems.map(item => {
              const config = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.Pantry;
              const prio = (item as any).priority || 'stocked';
              
              return (
                <div key={item.id} className={`flex items-center gap-3 p-3 bg-zinc-900/40 rounded-lg border transition-all ${item.status==='checked'?'opacity-50 border-green-900/30':'border-zinc-800/50 hover:border-zinc-700'}`}>
                  {/* Checkbox */}
                  {viewMode === 'active' ? (
                      <button onClick={() => toggleItemStatus(item)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${item.status==='checked'?'bg-green-600 border-green-600':'border-zinc-600 hover:border-green-500'}`}>{item.status==='checked' && <Check className="w-3 h-3 text-black"/>}</button>
                  ) : (
                      <button onClick={() => toggleItemStatus(item)} className="w-6 h-6 rounded-full border-2 border-orange-500 flex items-center justify-center hover:bg-orange-500" title="Recuperar"><Plus className="w-3 h-3 text-white"/></button>
                  )}
                  
                  <div className="flex-1">
                    <p className={`font-medium text-sm text-zinc-200 flex items-center gap-1 ${item.status==='checked'?'line-through':''}`}>
                      {item.item_name}
                      {/* Mostrar indicadores de prioridad si vienen de automático */}
                      {prio === 'panic' && <AlertCircle className="w-3 h-3 text-red-500 ml-1" />}
                      {prio === 'low' && <AlertTriangle className="w-3 h-3 text-orange-500 ml-1" />}
                      {(item as any).is_ghost && <Ghost className="w-3 h-3 text-purple-400 opacity-70" />}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${config.color} opacity-70`}>{config.label}</span>
                  </div>
                  
                  {/* Acciones */}
                  {viewMode === 'active' && <Button variant="ghost" size="sm" onClick={() => handlePostpone(item.id)} className="text-zinc-600 hover:text-orange-400 h-8 w-8 p-0" title="Posponer"><Clock className="w-4 h-4" /></Button>}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-zinc-600 hover:text-red-500 h-8 w-8 p-0"><Trash2 className="w-4 h-4" /></Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {viewMode === 'active' && (
            <div className="p-4 bg-zinc-900 border-t border-zinc-800 shrink-0">
                <Button className="w-full bg-blue-600 hover:bg-blue-500 font-bold flex items-center gap-2" disabled={checkedItems.length === 0 || isLoading} onClick={handleFinalizePurchase}>
                    <span>Finalizar Compra ({checkedItems.length})</span><ArrowRight className="w-4 h-4" />
                </Button>
            </div>
        )}

      </DialogContent>
    </Dialog>
  );
};