import React from 'react';
import { ShoppingCart, AlertTriangle, Layers } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { CATEGORY_CONFIG } from '@/lib/types';

/**
 * COMPONENTE: ProductSwipeRow
 * 
 * QUÉ HACE: Renderiza una fila de producto interactiva con soporte para gestos (Swipe) 
 * y estados visuales dinámicos.
 * 
 * POR QUÉ: Para separar la complejidad de la interacción táctil (Swipe) de la lista general, 
 * mejorando el rendimiento y la mantenibilidad.
 * 
 * PROTOCOLO GVR (UI Premium): Bordes finos, sombras sutiles y tipografía Mono para datos.
 */
interface ProductSwipeRowProps {
    item: any;
    onSelect: (item: any) => void;
    onAddToShoppingList: (item: any) => void;
    swipingId: string | null;
    setSwipingId: (id: string | null) => void;
    swipeOffset: number;
    setSwipeOffset: (id: string, offset: number) => void;
    SWIPE_THRESHOLD: number;
}

export const ProductSwipeRow: React.FC<ProductSwipeRowProps> = ({
    item,
    onSelect,
    onAddToShoppingList,
    swipingId,
    setSwipingId,
    swipeOffset,
    setSwipeOffset,
    SWIPE_THRESHOLD
}) => {
    // Configuración visual basada en la categoría (SSoT de types.ts)
    const catConf = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.Pantry;
    
    // Lógica de colores por prioridad (Mantiene look Cyberpunk/Tóxico)
    const priorityColor = item.is_ghost ? "border-zinc-800/40" :
        item.importance_level === 'critical' ? "border-red-500/50" :
        item.importance_level === 'high' ? "border-orange-500/50" :
        "border-blue-500/50";
        
    const priorityText = item.is_ghost ? 'GHOST' :
        item.importance_level === 'critical' ? 'VITAL' :
        item.importance_level === 'high' ? 'ALTA' : 'NORM.';
        
    const priorityTextColor = item.is_ghost ? "text-zinc-500" :
        item.importance_level === 'critical' ? "text-red-400" :
        item.importance_level === 'high' ? "text-orange-400" : "text-blue-400";

    const sid = item.product_id;
    const touchStartX = React.useRef(0);

    return (
        <div className={cn("rounded-xl border relative overflow-hidden transition-all duration-300", priorityColor)}>
            {/* CAPA TRASERA: Acción de añadir a la lista (Visualizado durante el swipe) */}
            <div className={cn(
                "absolute inset-0 flex items-center pl-4 transition-colors duration-200",
                swipeOffset === 0 ? "invisible" : "visible",
                swipeOffset >= SWIPE_THRESHOLD ? "bg-green-600/25" : "bg-blue-600/15"
            )}>
                <ShoppingCart className={cn(
                    "w-5 h-5 transition-all duration-150", 
                    swipeOffset >= SWIPE_THRESHOLD ? "text-green-400 scale-125" : "text-blue-400 opacity-60"
                )} />
            </div>

            {/* CAPA FRONTAL: Contenido del producto e interacción táctil */}
            <div
                className="bg-zinc-950/80 p-2.5 flex items-center gap-2 cursor-grab active:cursor-grabbing relative select-none w-full"
                style={{ 
                    transform: `translateX(${swipeOffset}px)`, 
                    transition: swipingId === sid ? 'none' : 'transform 0.25s ease' 
                }}
                onClick={() => { if (swipeOffset === 0) onSelect(item); }}
                // --- LÓGICA DE SWIPE (Touch & Mouse) ---
                onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; setSwipingId(sid); }}
                onTouchMove={(e) => {
                    const d = e.touches[0].clientX - touchStartX.current;
                    if (d > 0) setSwipeOffset(sid, Math.min(d, 120)); // Limitar el movimiento visual
                }}
                onTouchEnd={() => {
                    setSwipingId(null);
                    if (swipeOffset >= SWIPE_THRESHOLD) onAddToShoppingList(item);
                    setSwipeOffset(sid, 0);
                }}
                onMouseDown={(e) => { touchStartX.current = e.clientX; setSwipingId(sid); }}
                onMouseMove={(e) => {
                    if (swipingId !== sid) return;
                    const d = e.clientX - touchStartX.current;
                    if (d > 5) setSwipeOffset(sid, Math.min(d, 120));
                }}
                onMouseUp={() => {
                    if (swipingId !== sid) return;
                    setSwipingId(null);
                    if (swipeOffset >= SWIPE_THRESHOLD) onAddToShoppingList(item);
                    setSwipeOffset(sid, 0);
                }}
                onMouseLeave={() => {
                    if (swipingId !== sid) return;
                    setSwipingId(null);
                    setSwipeOffset(sid, 0);
                }}
            >
                {/* Badge de Prioridad Discreto (SDLC Estético) */}
                <div className={cn(
                    "absolute top-0 left-0 px-2 py-0.5 text-[8px] font-black tracking-tighter bg-zinc-900/90 rounded-br-lg shadow-sm z-10", 
                    priorityTextColor
                )}>
                    {priorityText}
                </div>

                {/* INFO DEL PRODUCTO */}
                <div className="flex-1 min-w-0 pr-1 pt-1">
                    <div className="font-bold text-[14px] text-zinc-100 leading-tight mb-0.5 truncate">
                        {item.name}
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                        <div className="flex items-center gap-1 text-zinc-400 font-medium whitespace-nowrap">
                            <Layers className="w-3 h-3 text-zinc-500 opacity-60" />
                            <span className="font-mono">{item.batches?.length || 0} lotes</span>
                        </div>
                        <div className="flex items-center gap-1 text-zinc-500 italic truncate opacity-70">
                            • {Object.keys(item.locations || {}).join(', ') || 'Sin ubicación'}
                        </div>
                    </div>
                </div>

                {/* DATOS DE STOCK Y CADUCIDAD (Look Premium Mono) */}
                <div className="shrink-0 flex flex-col items-end min-w-[70px]">
                    <div className={cn(
                        "font-mono font-black text-[14px] px-2 py-0.5 rounded-md whitespace-nowrap shadow-inner", 
                        item.total_quantity === 0 ? "text-red-500 bg-red-500/10 border border-red-500/20" : "text-zinc-100 bg-zinc-900 border border-zinc-800"
                    )}>
                        {item.total_quantity} <span className="text-[10px] opacity-60 ml-0.5">{item.unit}</span>
                    </div>
                    {item.earliest_expiry && (
                        <div className={cn(
                            "flex items-center gap-1 text-[10px] font-bold mt-1.5 px-1.5 py-0.5 rounded uppercase", 
                            differenceInDays(new Date(item.earliest_expiry), new Date()) < 7 
                                ? "text-purple-400 bg-purple-400/10" 
                                : "text-emerald-500 bg-emerald-500/10"
                        )}>
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {format(new Date(item.earliest_expiry), 'dd/MM/yy')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
