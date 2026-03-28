import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, Check, Trash2, ShoppingCart, 
  Beef, Milk, SprayCan, 
  Snowflake, Coffee,
  AlertCircle, AlertTriangle, Ghost,
  ArrowRight, Clock, LayoutGrid, Search, X, Loader2,
  Fish, Sparkles, Apple, Leaf, ShoppingBag, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';

// Interfaces locales para evitar dependencias rotas
interface ShoppingListItem {
  id: string;
  household_id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  status: string; // 'active', 'checked', 'bought', 'postponed'
  priority: string;
  is_ghost: boolean;
  is_manual: boolean;
  created_at: string;
}

interface ProductDefinition {
  id: string;
  name: string;
  category: string;
  unit: string;
}

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
}

// Configuración de Categorías (Español) - Sincronizado con types.ts
const CATEGORY_ICONS: Record<string, { icon: React.ReactNode, color: string, label: string }> = {
  Dairy: { icon: <Milk className="w-4 h-4"/>, color: 'bg-blue-500/10 text-blue-400', label: 'Lácteos' },
  Meat: { icon: <Beef className="w-4 h-4"/>, color: 'bg-red-500/10 text-red-400', label: 'Carnes' },
  Fish: { icon: <Fish className="w-4 h-4"/>, color: 'bg-teal-500/10 text-teal-400', label: 'Pescado' },
  Produce: { icon: <Leaf className="w-4 h-4"/>, color: 'bg-green-500/10 text-green-400', label: 'Frescos y Verdura' },
  Fruit: { icon: <Apple className="w-4 h-4"/>, color: 'bg-orange-500/10 text-orange-400', label: 'Frutas' },
  Bakery: { icon: <ShoppingBag className="w-4 h-4"/>, color: 'bg-amber-500/10 text-amber-400', label: 'Pan y Bollería' },
  Pantry: { icon: <Home className="w-4 h-4"/>, color: 'bg-yellow-500/10 text-yellow-400', label: 'Despensa' },
  Frozen: { icon: <Snowflake className="w-4 h-4"/>, color: 'bg-cyan-500/10 text-cyan-400', label: 'Congelados' },
  Beverages: { icon: <Coffee className="w-4 h-4"/>, color: 'bg-purple-500/10 text-purple-400', label: 'Bebidas' },
  PersonalCare: { icon: <SprayCan className="w-4 h-4"/>, color: 'bg-pink-500/10 text-pink-400', label: 'Higiene Personal' },
  Household: { icon: <Home className="w-4 h-4"/>, color: 'bg-gray-500/10 text-gray-400', label: 'Limpieza y Hogar' },
};
const DB_CATEGORIES = Object.keys(CATEGORY_ICONS);

// MAPA DE TRADUCCIÓN INVERSO
const CATEGORY_MAP: Record<string, string> = {
  Dairy: 'Lácteos', Meat: 'Carnes', Fish: 'Pescado', Produce: 'Frescos y Verdura', 
  Fruit: 'Frutas', Bakery: 'Pan y Bollería', Pantry: 'Despensa', Frozen: 'Congelados', 
  Beverages: 'Bebidas', PersonalCare: 'Higiene Personal', Household: 'Limpieza y Hogar'
};

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({ isOpen, onClose, householdId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  
  // FILTRO VISUAL vs CATEGORÍA DE AÑADIDO
  const [viewFilter, setViewFilter] = useState<string | null>(null);
  const [addItemCategory, setAddItemCategory] = useState<string>('Pantry');
  
  const [isGhost, setIsGhost] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'postponed'>('active');

  // --- ESTADOS DE AUTOCOMPLETADO ---
  const [searchResults, setSearchResults] = useState<ProductDefinition[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sincronizar filtro con categoría de añadido
  useEffect(() => {
    if (viewFilter) {
      setAddItemCategory(viewFilter);
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
      
      if (data) setSearchResults(data as unknown as ProductDefinition[]);
    };
    
    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [newItemName, householdId]);

  const handleSelectSuggestion = (product: ProductDefinition) => {
      setNewItemName(product.name);
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
    if (!error && data) setItems(data as unknown as ShoppingListItem[]);
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

    const tempId = crypto.randomUUID();
    const categoryToUse = viewFilter || addItemCategory;

    // UI Optimista
    const optimisticItem: ShoppingListItem = {
      id: tempId,
      household_id: householdId,
      item_name: newItemName.trim(),
      category: categoryToUse,
      quantity: 1,
      unit: 'uds',
      status: 'active',
      added_by: user.id,
      is_manual: true,
      is_ghost: isGhost,
      priority: 'stocked',
      created_at: new Date().toISOString()
    };
    setItems(prev => [optimisticItem, ...prev]);

    setNewItemName(''); 
    setIsGhost(false); 
    setShowSuggestions(false);

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
      priority: 'stocked'
    });

    if (error) {
      toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
      fetchItems();
    } else {
      fetchItems();
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    
    const { error } = await supabase.from('shopping_list').delete().eq('id', id);
    if (error) {
       toast({ title: "Error", description: "No se pudo borrar.", variant: "destructive" });
       fetchItems();
    }
  };

  const handlePostpone = async (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'postponed' } : i));
    await supabase.from('shopping_list').update({ status: 'postponed' } as any).eq('id', id);
    toast({ title: "Pospuesto", description: "Oculto temporalmente." });
  };

  const toggleItemStatus = async (item: ShoppingListItem) => {
    // LÓGICA DE TU CÓDIGO ORIGINAL: 'active' <-> 'checked'
    let newStatus = item.status === 'active' ? 'checked' : 'active';
    if (item.status === 'postponed') newStatus = 'active';

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));

    await supabase.from('shopping_list').update({ status: newStatus } as any).eq('id', item.id);
  };

  const handleFinalizePurchase = async () => {
    const checked = items.filter(i => i.status === 'checked');
    if (checked.length === 0) return;
    setIsLoading(true);
    
    setItems(prev => prev.filter(i => i.status !== 'checked'));

    const idsToUpdate = checked.map(i => i.id);
    await supabase.from('shopping_list').update({ status: 'bought' } as any).in('id', idsToUpdate);
    
    toast({ title: "¡Compra finalizada!", description: `${checked.length} productos movidos a stock.` });
    setIsLoading(false);
    fetchItems();
  };

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
      {/* CSS FIX: [&>button]:hidden elimina la X duplicada */}
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-full max-w-lg h-[85vh] flex flex-col p-0 gap-0 overflow-hidden [&>button]:hidden">
        
        {/* Accesibilidad Fix */}
        <DialogHeader className="sr-only">
            <DialogTitle>Lista de Compra</DialogTitle>
            <DialogDescription>Gestión de compras</DialogDescription>
        </DialogHeader>

        {/* HEADER */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-lg font-bold"><ShoppingCart className="w-5 h-5 text-green-500" /> Lista Compra</div>
          <div className="flex bg-zinc-800 rounded-lg p-0.5 mr-2">
             <button onClick={()=>setViewMode('active')} className={cn("px-3 py-1 text-xs rounded-md transition-all", viewMode==='active'?'bg-zinc-600 text-white font-bold':'text-zinc-400 hover:text-white')}>Activos</button>
             <button onClick={()=>setViewMode('postponed')} className={cn("px-3 py-1 text-xs rounded-md transition-all", viewMode==='postponed'?'bg-zinc-600 text-white font-bold':'text-zinc-400 hover:text-white')}>Pospuestos</button>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-zinc-800 rounded-full"><X className="w-5 h-5" /></Button>
        </div>

        {/* INPUT ZONA */}
        {viewMode === 'active' && (
            <div className="p-4 bg-zinc-900 border-b border-zinc-800 shrink-0 z-10 shadow-md flex flex-col gap-3 relative">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button onClick={() => setViewFilter(null)} className={cn("flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold border transition-all whitespace-nowrap", !viewFilter ? 'bg-white text-black border-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800')}>
                        <LayoutGrid className="w-3 h-3" /> Todo
                    </button>
                    {DB_CATEGORIES.map(catId => { 
                        const config = CATEGORY_ICONS[catId]; 
                        return (
                            <button key={catId} onClick={() => setViewFilter(viewFilter === catId ? null : catId)} className={cn("flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold border transition-all whitespace-nowrap", viewFilter === catId ? `${config.color} border-current ring-1 ring-white/20` : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800')}>
                                {config.icon} {config.label}
                            </button>
                        )
                    })}
                </div>

                <div className="flex gap-2 relative">
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
                            className="bg-zinc-950 border-zinc-700 text-white w-full pr-8 h-10"
                            autoComplete="off"
                        />
                        <Search className="absolute right-3 top-3 w-4 h-4 text-zinc-600 pointer-events-none"/>

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

                    {!viewFilter && (
                         <Select value={addItemCategory} onValueChange={setAddItemCategory}>
                            <SelectTrigger className="w-[40px] px-0 justify-center bg-zinc-900 border-zinc-700 text-zinc-400 h-10" title="Categoría">
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
                    <Button onClick={handleAddItem} disabled={isLoading || !newItemName.trim()} className="bg-green-600 hover:bg-green-500 px-3 h-10"><Plus className="w-4 h-4" /></Button>
                </div>
            </div>
        )}

        {/* LISTA */}
        <ScrollArea className="flex-1 p-4 bg-zinc-950" onClick={() => setShowSuggestions(false)}>
          <div className="space-y-2 mb-6">
            {visibleItems.length === 0 && <div className="text-center text-zinc-700 py-10 text-sm">Lista vacía.</div>}
            
            {visibleItems.map(item => {
              const config = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.Pantry;
              const prio = item.priority || 'stocked';
              
              return (
                <div key={item.id} className={cn("flex items-center gap-3 p-3 bg-zinc-900/40 rounded-lg border transition-all", item.status==='checked'?'opacity-50 border-green-900/30':'border-zinc-800/50 hover:border-zinc-700')}>
                  {viewMode === 'active' ? (
                      <button onClick={() => toggleItemStatus(item)} className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", item.status==='checked'?'bg-green-600 border-green-600':'border-zinc-600 hover:border-green-500')}>{item.status==='checked' && <Check className="w-3 h-3 text-black"/>}</button>
                  ) : (
                      <button onClick={() => toggleItemStatus(item)} className="w-6 h-6 rounded-full border-2 border-orange-500 flex items-center justify-center hover:bg-orange-500" title="Recuperar"><Plus className="w-3 h-3 text-white"/></button>
                  )}
                  
                  <div className="flex-1">
                    <p className={cn("font-medium text-sm text-zinc-200 flex items-center gap-1", item.status==='checked' && 'line-through')}>
                      {item.item_name}
                      {prio === 'panic' && <AlertCircle className="w-3 h-3 text-red-500 ml-1" />}
                      {prio === 'low' && <AlertTriangle className="w-3 h-3 text-orange-500 ml-1" />}
                      {item.is_ghost && <Ghost className="w-3 h-3 text-purple-400 opacity-70" />}
                    </p>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded opacity-70", config.color)}>{config.label}</span>
                  </div>
                  
                  {viewMode === 'active' && <Button variant="ghost" size="sm" onClick={() => handlePostpone(item.id)} className="text-zinc-600 hover:text-orange-400 h-8 w-8 p-0" title="Posponer"><Clock className="w-4 h-4" /></Button>}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-zinc-600 hover:text-red-500 h-8 w-8 p-0"><Trash2 className="w-4 h-4" /></Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* FOOTER */}
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