import React from 'react';
import { Sword, Skull, Flame } from 'lucide-react';

export const ToxicCard = () => {
  return (
    // CONTENEDOR DE LA CARTA (Estilo "Persiana" / Cyberpunk)
    <div className="relative w-64 h-96 bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl overflow-hidden flex flex-col items-center p-4 hover:scale-105 transition-transform duration-300 cursor-pointer group">
      
      {/* FONDO DECORATIVO (Patrón sutil) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/20 to-transparent opacity-50" />

      {/* --- LA ALQUIMIA VISUAL (Icon Composition) --- */}
      <div className="relative w-40 h-40 mt-8 flex items-center justify-center">
        
        {/* Capa 1: El Aura (Fuego Tóxico) - Desenfocado y detrás */}
        <Flame 
          size={140} 
          className="absolute text-green-500 blur-sm opacity-60 animate-pulse group-hover:opacity-100 transition-opacity" 
        />
        
        {/* Capa 2: El Objeto Base (Espada) - Nítido */}
        <Sword 
          size={120} 
          className="relative z-10 text-zinc-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] group-hover:rotate-12 transition-transform duration-500" 
          strokeWidth={1.5}
        />

        {/* Capa 3: El Detalle (Calavera) - Pequeño en la empuñadura */}
        <Skull 
          size={32} 
          className="absolute z-20 text-white drop-shadow-md translate-y-8" 
        />
      </div>

      {/* --- TEXTO DE LA CARTA --- */}
      <div className="mt-8 text-center z-10">
        <h3 className="text-xl font-bold text-green-400 tracking-wider uppercase drop-shadow-sm font-mono">
          Hoja Venenosa
        </h3>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-green-500 to-transparent my-2" />
        <p className="text-zinc-400 text-sm italic px-2 font-sans">
          "Si te corta, no te mueres... pero te pasas el finde en el baño."
        </p>
      </div>

      {/* STATS (Estilo RPG) */}
      <div className="absolute bottom-4 flex gap-4 w-full justify-center">
        <div className="bg-zinc-800 px-3 py-1 rounded-full border border-green-500/30 text-xs text-green-300 font-mono">
          ATK +5
        </div>
        <div className="bg-zinc-800 px-3 py-1 rounded-full border border-purple-500/30 text-xs text-purple-300 font-mono">
          TOXIC
        </div>
      </div>

    </div>
  );
};

export default ToxicCard;