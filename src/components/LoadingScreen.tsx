import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export const LoadingScreen: React.FC = () => {
    const { profile, isLoading } = useAuth();

    // Si no está cargando y no hay perfil, el componente padre probablemente redirigirá,
    // pero por si acaso mostramos el estado genérico.
    // PERSISTENCIA: Intentamos recuperar el nivel de localStorage si el profile aún no ha cargado
    const persistentLevel = localStorage.getItem('axon_user_level');
    const level = (profile as any)?.level || (persistentLevel ? parseInt(persistentLevel) : null);

    let logoSrc = '/axon-logo.png'; // Fallback / Genérico
    let animationClass = 'animate-pulse';
    let glowClass = '';

    if (level === 4) {
        // Admin: Vault door
        logoSrc = '/assets/identity/axon-admin.png';
        animationClass = 'animate-[spin_10s_linear_infinite]';
    } else if (level === 2 || level === 3) {
        // Teen/Junior: Glow and pulse
        logoSrc = '/assets/identity/axon-teen.png';
        animationClass = 'animate-pulse';
        glowClass = 'shadow-[0_0_20px_rgba(34,197,94,0.5)] rounded-full';
    } else if (level === 1) {
        // Kid: Friendly bounce
        logoSrc = '/assets/identity/axon-kids-icon.png';
        animationClass = 'animate-bounce';
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
            <div className="flex flex-col items-center gap-6">
                <div className={cn("relative w-32 h-32 flex items-center justify-center", glowClass)}>
                    <img
                        src={logoSrc}
                        alt="Loading..."
                        className={cn("w-full h-full object-contain", animationClass)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-150"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-300"></div>
                </div>
                <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest animate-pulse">
                    Cargando AXON OS
                </p>
            </div>
        </div>
    );
};
