import { useState, useEffect } from 'react';

export type PerformanceMode = 'auto' | 'high' | 'low';

export const usePerformanceSettings = () => {
    // Intentar cargar la preferencia guardada
    const [mode, setMode] = useState<PerformanceMode>(() => {
        const saved = localStorage.getItem('axon_perf_mode');
        return (saved as PerformanceMode) || 'auto';
    });

    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 768;
        }
        return false;
    });

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Guardar cuando cambie
    useEffect(() => {
        localStorage.setItem('axon_perf_mode', mode);
    }, [mode]);

    // La lógica final: ¿Debemos usar la versión ligera?
    // Si es 'low', siempre. 
    // Si es 'high', nunca. 
    // Si es 'auto', solo si es móvil.
    const useLowPerfUI = mode === 'low' || (mode === 'auto' && isMobile);

    return {
        mode,
        setMode,
        useLowPerfUI,
        isMobile
    };
};
