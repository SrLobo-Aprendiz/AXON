import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NEXT_PUBLIC_APP_NAME } from '@/lib/config';

// Componentes
import { FridgeCanvas } from '@/components/FridgeCanvas';
import CreateFamilyDialog from '@/components/CreateFamilyDialog';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Heart, LogOut, Settings, Users, ChevronDown, UserPlus, 
  Key, MessageCircle 
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile, currentHousehold, logout, isLoading, isAuthenticated } = useAuth();

  // Redirect to auth if not authenticated
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando AXON OS...</div>
      </div>
    );
  }

  if (!profile) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      
      {/* --- HEADER: ZONA DE LLAVEROS Y PERFIL --- */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* IZQUIERDA: LOGO Y HOGAR */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div className="hidden md:block">
              <h1 className="font-display font-bold text-lg">{NEXT_PUBLIC_APP_NAME}</h1>
              {currentHousehold && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  {currentHousehold.name}
                </p>
              )}
            </div>
          </div>

          {/* DERECHA: COLGADORES DE LLAVEROS (Placeholder) + PERFIL */}
          <div className="flex items-center gap-4">
            
            {/* ZONA DE LLAVEROS (Aquí irán los usuarios del hogar) */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full px-3 py-1 gap-2 border border-zinc-200 dark:border-zinc-700">
               {/* Placeholder visual para el futuro desarrollo de llaveros */}
               <Key className="w-4 h-4 text-zinc-400" />
               <span className="text-xs text-zinc-500 font-medium">Llaveros</span>
            </div>

            {/* MENÚ DE USUARIO */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-1 rounded-full border border-border/40 hover:bg-accent">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(profile.full_name || profile.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4 text-muted-foreground mr-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" /> Configuración
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users className="w-4 h-4 mr-2" /> Gestión del Hogar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT: SOLO LA NEVERA --- */}
      <main className="container mx-auto px-4 py-8">
        {currentHousehold ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* LA NEVERA ES LA PROTAGONISTA */}
            {/* Sin títulos encima, sin botones flotantes externos. Todo limpio. */}
            <section className="relative group shadow-2xl rounded-2xl">
              <FridgeCanvas householdId={currentHousehold.id} />
            </section>

          </div>
        ) : (
          /* PANTALLA DE BIENVENIDA (Sin Hogar) */
          <Card className="max-w-md mx-auto mt-12 border-dashed">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Bienvenido a {NEXT_PUBLIC_APP_NAME}</CardTitle>
              <CardDescription>
                Crea un hogar para acceder a la Nevera Digital.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CreateFamilyDialog>
                <Button className="w-full h-11">Crear nuevo Hogar</Button>
              </CreateFamilyDialog>
            </CardContent>
          </Card>
        )}
      </main>

      {/* --- CHAT FLOTANTE (ABAJO DERECHA) --- */}
      {currentHousehold && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button size="icon" className="h-14 w-14 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-500 text-white">
            <MessageCircle className="w-6 h-6" />
          </Button>
        </div>
      )}

    </div>
  );
};

export default Dashboard;