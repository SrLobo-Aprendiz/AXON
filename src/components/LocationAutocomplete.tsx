import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';

const DEFAULT_LOCATIONS = ['Despensa', 'Nevera', 'Congelador', 'Baño', 'Limpieza', 'Trastero'];

export const LocationAutocomplete = ({ 
  value, 
  onChange, 
  householdId, 
  placeholder = "Ubicación..." 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  householdId: string;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [locations, setLocations] = useState<string[]>(DEFAULT_LOCATIONS);
  const [inputValue, setInputValue] = useState(value);

  // Sincronización
  useEffect(() => { setInputValue(value); }, [value]);

  useEffect(() => {
    const fetchLocations = async () => {
      if (!householdId) return;
      try {
        const { data } = await supabase.from('inventory_items')
          .select('location')
          .eq('household_id', householdId)
          .not('location', 'is', null);
        
        // Unir y limpiar duplicados (insensible a mayúsculas)
        const rawList = [...DEFAULT_LOCATIONS, ...(data?.map(i => i.location?.trim()) || [])];
        const uniqueMap = new Map();
        rawList.forEach(loc => {
            if (loc && !uniqueMap.has(loc.toLowerCase())) {
                uniqueMap.set(loc.toLowerCase(), loc);
            }
        });
        setLocations(Array.from(uniqueMap.values()).sort());
      } catch (e) { console.error(e); } 
    };
    fetchLocations();
  }, [householdId]);

  // Filtro visual
  const filteredLocations = locations.filter(loc => 
    !inputValue || loc.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (val: string) => {
    onChange(val);      
    setInputValue(val); 
    setIsOpen(false);   
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full group">
            <Input
                value={inputValue}
                onChange={(e) => { 
                    setInputValue(e.target.value); 
                    onChange(e.target.value); // Escritura manual directa
                    setIsOpen(true); 
                }}
                onFocus={() => setIsOpen(true)} // Al clicar, despliega lista
                placeholder={placeholder}
                className="h-8 text-xs bg-zinc-950 border-zinc-700 text-white focus:border-blue-500 placeholder:text-zinc-500 pr-7"
            />
            <ChevronDown className="absolute right-2 top-2 h-4 w-4 text-zinc-500 pointer-events-none group-hover:text-zinc-300 transition-colors" />
        </div>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[200px] p-0 bg-zinc-950 border-zinc-700 max-h-[200px] overflow-y-auto z-[9999]" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col p-1">
          {filteredLocations.map((loc) => (
            <button 
                key={loc} 
                type="button"
                className="flex items-center justify-between w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white rounded transition-colors"
                onClick={() => handleSelect(loc)}
            >
                {loc}
                {inputValue.toLowerCase() === loc.toLowerCase() && <Check className="w-3 h-3 text-blue-500"/>}
            </button>
          ))}
          {filteredLocations.length === 0 && (
             <div className="px-3 py-2 text-xs text-zinc-500 italic text-center">Sin coincidencias</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};