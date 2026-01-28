import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
// ✅ Importamos el tipo corregido desde nuestra librería central
import type { FridgeItem as FridgeItemType } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Move, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import EditItemDialog from './EditItemDialog';

interface FridgeItemProps {
  item: FridgeItemType;
  onDelete: (id: string) => void;
  onEdit: (item: FridgeItemType) => void;
  isEditing: boolean;
}

const FridgeItemComponent: React.FC<FridgeItemProps> = ({ item, onDelete, onEdit, isEditing }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (!isEditing) return;
    setIsDragging(true);
    e.dataTransfer.setData('itemId', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Lógica visual basada en el ENUM real de la base de datos
  const getBorderColor = () => {
    if (item.status === 'panic') return 'border-red-500 border-2';
    if (item.status === 'low') return 'border-orange-400 border-2';
    return 'border-transparent';
  };

  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-110' : 'opacity-100'
      } ${isEditing ? 'cursor-move' : 'cursor-pointer hover:scale-105'}`}
      style={{
        left: `${item.position_x ?? 50}%`,
        top: `${item.position_y ?? 50}%`,
        zIndex: isDragging ? 50 : 10,
      }}
      draggable={isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => !isEditing && onEdit(item)}
    >
      <div className="relative group">
        <Card className={`bg-gradient-to-br from-card to-secondary/50 p-3 min-w-[90px] max-w-[160px] shadow-lg rounded-xl ${getBorderColor()}`}>
          <div className="text-center">
            {/* Indicador visual de Pánico */}
            {item.status === 'panic' && (
               <div className="absolute -top-3 -left-2 bg-red-100 p-1 rounded-full shadow-sm">
                 <AlertCircle className="w-4 h-4 text-red-600" />
               </div>
            )}
            
            <p className="font-semibold text-sm truncate">{item.name || 'Note'}</p>
            
            {item.quantity && item.quantity > 1 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1 inline-block">
                x{item.quantity}
              </span>
            )}
            
            {/* Si es una nota visual antigua sin nombre */}
            {item.image_url && !item.name && (
               <p className="text-xs text-muted-foreground mt-1 break-words">{item.image_url}</p>
            )}
          </div>
        </Card>
        
        {isEditing && (
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-3 -right-3 w-7 h-7 rounded-full shadow-md z-20"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

const Fridge: React.FC = () => {
  const { currentHousehold, user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<FridgeItemType[]>([]);
  const [isRearranging, setIsRearranging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para la Edición
  const [editingItem, setEditingItem] = useState<FridgeItemType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Estados para notas rápidas
  const [newNote, setNewNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!currentHousehold) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('fridge_items')
      .select('*')
      .eq('household_id', currentHousehold.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching fridge items:', error);
      toast({ title: 'Error', description: 'Failed to load fridge items.', variant: 'destructive' });
    } else {
      // 🛡️ SEGURIDAD: Casting explícito usando nuestro tipo corregido en types.ts
      // Esto asegura que la App trate los datos entrantes con las nuevas columnas (status, category)
      setItems((data as unknown as FridgeItemType[]) || []);
    }
    setIsLoading(false);
  }, [currentHousehold, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!currentHousehold) return;

    const channel = supabase
      .channel(`fridge_items_${currentHousehold.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fridge_items', filter: `household_id=eq.${currentHousehold.id}` },
        () => fetchItems()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentHousehold, fetchItems]);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    if (!itemId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(5, Math.min(95, y));

    const { error } = await supabase
      .from('fridge_items')
      .update({ position_x: clampedX, position_y: clampedY })
      .eq('id', itemId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to move item.', variant: 'destructive' });
    } else {
      // Optimistic update
      setItems(items.map(i => i.id === itemId ? { ...i, position_x: clampedX, position_y: clampedY } : i));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !currentHousehold || !user) return;
    
    // Al insertar, usamos 'stocked' por defecto para cumplir con la DB
    const { data, error } = await supabase
      .from('fridge_items')
      .insert({
        household_id: currentHousehold.id,
        name: 'Note',
        image_url: newNote.trim(), 
        position_x: 20 + Math.random() * 60,
        position_y: 20 + Math.random() * 60,
        created_by: user.id,
        status: 'stocked' 
      })
      .select().single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add note.', variant: 'destructive' });
    } else if (data) {
      // Recargamos para asegurar tipos correctos
      fetchItems();
      setNewNote('');
      setShowNoteInput(false);
      toast({ title: 'Note added!' });
    }
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await supabase.from('fridge_items').delete().eq('id', id);
    if (!error) {
      setItems(items.filter(i => i.id !== id));
      toast({ title: 'Removed', description: 'Item removed from the fridge.' });
    }
  };

  const handleEditItem = (item: FridgeItemType) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

  if (!currentHousehold) {
    return <div className="p-8 text-center text-muted-foreground">Join a household to see the fridge.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-display font-bold flex items-center gap-2">
           Fridge 
           {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant={isRearranging ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsRearranging(!isRearranging)}
            className={isRearranging ? "border-primary text-primary" : ""}
          >
            <Move className="w-4 h-4 mr-2" />
            {isRearranging ? 'Done Moving' : 'Rearrange'}
          </Button>
          <Button size="sm" onClick={() => setShowNoteInput(!showNoteInput)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </div>
      </div>

      {showNoteInput && (
        <Card className="p-4 flex gap-2 animate-in slide-in-from-top-2">
          <Input
            placeholder="Quick note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            className="flex-1"
          />
          <Button onClick={handleAddNote}>Post</Button>
          <Button variant="ghost" size="icon" onClick={() => setShowNoteInput(false)}>
            <X className="w-4 h-4" />
          </Button>
        </Card>
      )}

      <div
        className="relative w-full aspect-[4/3] bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-border/50 shadow-inner overflow-hidden"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {!items.length && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-50">
            <Sparkles className="w-12 h-12 mb-2" />
            <p>Fridge is empty</p>
          </div>
        )}

        {items.map((item) => (
          <FridgeItemComponent
            key={item.id}
            item={item}
            onDelete={handleDeleteItem}
            onEdit={handleEditItem}
            isEditing={isRearranging}
          />
        ))}
      </div>

      <EditItemDialog 
        item={editingItem}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onUpdate={fetchItems}
      />
    </div>
  );
};

export default Fridge;
