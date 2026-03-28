import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import EditItemDialog from '@/components/EditItemDialog';
import type { FridgeItem } from '@/lib/types';
import { CATEGORY_CONFIG } from '@/lib/types';

interface FridgeProps {
  householdId: string;
}

export const Fridge: React.FC<FridgeProps> = ({ householdId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<FridgeItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ✅ Delayed focus (Android safe) - REMOVED autoFocus
  useEffect(() => {
    const timer = setTimeout(() => {
      searchRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Load fridge items
  const loadFridgeItems = async () => {
    if (!householdId) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('fridge_items')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      console.error('Error loading fridge items:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFridgeItems();
  }, [householdId]);

  // Filter items
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-4">Nevera Digital</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en nevera..."
            className="pl-10 bg-zinc-900 border-zinc-700 text-white"
          />
        </div>
      </div>

      {/* Items List */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p>No hay artículos en la nevera</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const categoryConfig = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG];
              const Icon = categoryConfig?.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item);
                    setShowEditDialog(true);
                  }}
                  className="w-full p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {Icon && (
                      <div className={`p-2 rounded ${categoryConfig?.color || 'bg-zinc-800'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{item.name}</h3>
                      <p className="text-xs text-zinc-500">
                        Cantidad: {item.quantity} • {categoryConfig?.label || item.category}
                      </p>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        item.status === 'panic'
                          ? 'bg-red-500/20 text-red-400'
                          : item.status === 'low'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {item.status === 'panic' ? 'Urgente' : item.status === 'low' ? 'Bajo' : 'OK'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Edit Dialog */}
      <EditItemDialog
        item={selectedItem}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onUpdate={loadFridgeItems}
      />
    </div>
  );
};
