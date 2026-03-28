import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

export const StoreAutocomplete = ({
  value,
  onChange,
  householdId,
  placeholder = "Tienda...",
  suggestions
}: {
  value: string;
  onChange: (value: string) => void;
  householdId: string;
  placeholder?: string;
  suggestions?: string[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stores, setStores] = useState<string[]>(suggestions || []);
  const [inputValue, setInputValue] = useState(value);

  // Sincronizar sugerencias externas
  useEffect(() => {
    if (suggestions) setStores(suggestions);
  }, [suggestions]);

  // Sincronizar valor externo
  useEffect(() => { setInputValue(value); }, [value]);

  // Cargar tiendas previas (solo las que ya existen en TU historial)
  useEffect(() => {
    const fetchStores = async () => {
      if (!householdId || (suggestions && suggestions.length > 0)) return;
      try {
        const { data } = await supabase.from('inventory_items')
          .select('store')
          .eq('household_id', householdId)
          .not('store', 'is', null);

        if (data) {
          // Limpiamos duplicados y vacíos (insensible a mayúsculas)
          const uniqueMap = new Map();
          data.forEach(i => {
            const s = i.store?.trim();
            if (s && !uniqueMap.has(s.toLowerCase())) {
              uniqueMap.set(s.toLowerCase(), s);
            }
          });
          setStores(Array.from(uniqueMap.values()).sort() as string[]);
        }
      } catch (error) {
        console.error("Error cargando tiendas:", error);
      }
    };
    fetchStores();
  }, [householdId, suggestions]);

  const handleSelect = (store: string) => {
    setInputValue(store);
    onChange(store);
    setIsOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    if (val.length > 0) setIsOpen(true);
    else setIsOpen(false);
  };

  const filteredStores = stores.filter(s =>
    s.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full group">
          <Store className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500 z-10" />
          <Input
            value={inputValue}
            onChange={handleChange}
            placeholder={placeholder}
            className="h-9 pl-9 pr-8 text-xs bg-zinc-950 border-zinc-700 text-white focus:border-blue-500 placeholder:text-zinc-500"
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2 top-2.5 h-4 w-4 text-zinc-500 hover:text-zinc-300 transition-colors z-20"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </button>
        </div>
      </PopoverTrigger>

      {filteredStores.length > 0 && (
        <PopoverContent
          className="w-[200px] p-0 bg-zinc-950 border-zinc-800 max-h-[200px] overflow-y-auto z-[9999]"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col p-1">
            {filteredStores.map((store) => (
              <button
                key={store}
                type="button"
                className="flex items-center justify-between w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white rounded transition-colors"
                onClick={() => handleSelect(store)}
              >
                {store}
                {inputValue.toLowerCase() === store.toLowerCase() && <Check className="w-3 h-3 text-blue-500" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
};