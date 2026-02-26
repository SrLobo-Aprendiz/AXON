import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, Search, Package, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ProductAutocomplete = ({
    value,
    onChange,
    onSelect,
    householdId,
    placeholder = "Nombre del producto..."
}: {
    value: string;
    onChange: (value: string) => void;
    onSelect: (product: any) => void;
    householdId: string;
    placeholder?: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState(value);

    // Sincronizar valor externo
    useEffect(() => { setInputValue(value); }, [value]);

    // Cargar productos existentes
    useEffect(() => {
        const fetchProducts = async () => {
            if (!householdId) return;
            try {
                const { data } = await supabase.from('product_definitions')
                    .select('*')
                    .eq('household_id', householdId)
                    .order('name', { ascending: true });

                if (data) {
                    setProducts(data);
                }
            } catch (error) {
                console.error("Error cargando productos:", error);
            }
        };
        fetchProducts();
    }, [householdId]);

    const handleSelect = (product: any) => {
        setInputValue(product.name);
        onChange(product.name);
        onSelect(product);
        setIsOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        onChange(val);
        if (val.length > 0) setIsOpen(true);
        else setIsOpen(false);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <div className="relative w-full group">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500 z-10" />
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

            {filteredProducts.length > 0 && (
                <PopoverContent
                    className="w-[300px] p-0 bg-zinc-950 border-zinc-800 max-h-[200px] overflow-y-auto z-[9999]"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="flex flex-col p-1">
                        <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-500 uppercase border-b border-zinc-900 mb-1">
                            Productos existentes
                        </div>
                        {filteredProducts.map((product) => (
                            <button
                                key={product.id}
                                type="button"
                                className="flex items-center justify-between w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white rounded transition-colors"
                                onClick={() => handleSelect(product)}
                            >
                                <div className="flex items-center gap-2">
                                    <Package className="w-3 h-3 text-zinc-500" />
                                    <span>{product.name}</span>
                                    <span className="text-[10px] text-zinc-600">({product.category})</span>
                                </div>
                                {inputValue.toLowerCase() === product.name.toLowerCase() && <Check className="w-3 h-3 text-blue-500" />}
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            )}
        </Popover>
    );
};
