import React, { useRef } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ShoppingCart, AlertTriangle, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_CONFIG } from '@/lib/types';

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

export const ProductSwipeRow = React.memo(({
    item,
    onSelect,
    onAddToShoppingList,
    swipingId,
    setSwipingId,
    swipeOffset,
    setSwipeOffset,
    SWIPE_THRESHOLD
}: ProductSwipeRowProps) => {
    const priorityColor = item.is_ghost ? "border-zinc-600/40" :
        item.importance_level === 'critical' ? "border-red-500/50" :
            item.importance_level === 'high' ? "border-orange-500/50" :
                "border-blue-500/50";
    const priorityText = item.is_ghost ? 'PUNTUAL' :
        item.importance_level === 'critical' ? 'VITAL' :
            item.importance_level === 'high' ? 'ALTA' : 'NORM.';
    const priorityTextColor = item.is_ghost ? "text-zinc-500" :
        item.importance_level === 'critical' ? "text-red-400" :
            item.importance_level === 'high' ? "text-orange-400" : "text-blue-400";

    const sid = item.product_id;
    const isDragging = useRef(false);
    const touchStartX = useRef(0);

    return (
        <div className={cn("rounded-xl border relative overflow-hidden", priorityColor)}>
            <div className={cn(
                "absolute inset-0 flex items-center pl-4",
                swipeOffset === 0 ? "invisible" : "visible",
                swipeOffset >= SWIPE_THRESHOLD ? "bg-green-600/25" : "bg-blue-600/15"
            )}>
                <ShoppingCart className={cn("w-5 h-5 transition-all duration-150", swipeOffset >= SWIPE_THRESHOLD ? "text-green-400 scale-125" : "text-blue-400 opacity-60")} />
            </div>
            <div
                className="bg-zinc-900/40 p-2.5 flex items-center gap-2 cursor-grab active:cursor-grabbing relative select-none w-full"
                style={{ transform: `translateX(${swipeOffset}px)`, transition: swipingId === sid ? 'none' : 'transform 0.25s ease' }}
                onClick={() => { if (!isDragging.current) onSelect(item); }}
                onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; setSwipingId(sid); isDragging.current = false; }}
                onTouchMove={(e) => {
                    const d = e.touches[0].clientX - touchStartX.current;
                    if (d > 0) { isDragging.current = true; setSwipeOffset(sid, Math.min(d, 120)); }
                }}
                onTouchEnd={() => {
                    setSwipingId(null);
                    if (swipeOffset >= SWIPE_THRESHOLD) onAddToShoppingList(item);
                    setSwipeOffset(sid, 0);
                    setTimeout(() => { isDragging.current = false; }, 100);
                }}
                onMouseDown={(e) => { touchStartX.current = e.clientX; setSwipingId(sid); isDragging.current = false; }}
                onMouseMove={(e) => {
                    if (swipingId !== sid) return;
                    const d = e.clientX - touchStartX.current;
                    if (d > 5) { isDragging.current = true; setSwipeOffset(sid, Math.min(d, 120)); }
                }}
                onMouseUp={() => {
                    if (swipingId !== sid) return;
                    setSwipingId(null);
                    if (swipeOffset >= SWIPE_THRESHOLD) onAddToShoppingList(item);
                    setSwipeOffset(sid, 0);
                    setTimeout(() => { isDragging.current = false; }, 100);
                }}
                onMouseLeave={() => {
                    if (swipingId !== sid) return;
                    setSwipingId(null);
                    setSwipeOffset(sid, 0);
                    setTimeout(() => { isDragging.current = false; }, 100);
                }}
            >
                <div className={cn("absolute top-0 left-0 px-2 py-0.5 text-[8px] font-black tracking-tighter bg-zinc-800/80 rounded-br-lg shadow-sm z-10", priorityTextColor)}>
                    {priorityText}
                </div>
                <div className="flex-1 min-w-0 pr-1 pt-1">
                    <div className="font-bold text-[13.5px] text-zinc-100 leading-tight mb-0.5 truncate">{item.name}</div>
                    <div className="flex items-center gap-2 text-[11.5px]">
                        <div className="flex items-center gap-1 text-zinc-400 font-medium whitespace-nowrap">
                            <Layers className="w-3 h-3 text-zinc-500" />
                            <span>{item.batches.length || 0} {item.batches.length === 1 ? 'lote' : 'lotes'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-zinc-500 italic truncate opacity-70">
                            • {Object.keys(item.locations).join(', ')}
                        </div>
                    </div>
                </div>
                <div className="shrink-0 flex flex-col items-end min-w-[65px]">
                    <div className={cn("font-mono font-bold text-[13px] px-1.5 py-0.5 rounded-md whitespace-nowrap", item.total_quantity === 0 ? "text-red-400 bg-red-400/10" : "text-zinc-100 bg-zinc-800/50")}>
                        {item.total_quantity} <span className="text-[10px] opacity-70 ml-0.5">{item.unit}</span>
                    </div>
                    {item.earliest_expiry && (
                        <div className={cn("flex items-center gap-1 text-[10px] font-medium mt-1", differenceInDays(new Date(item.earliest_expiry), new Date()) < 7 ? "text-purple-400" : "text-emerald-500")}>
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {format(new Date(item.earliest_expiry), 'dd/MM/yy')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
ProductSwipeRow.displayName = 'ProductSwipeRow';
