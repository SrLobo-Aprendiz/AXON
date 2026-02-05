import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NEXT_PUBLIC_APP_NAME } from '@/lib/config';

// Componentes Existentes
import DashboardMetrics, { DashboardMetricsHandle } from '@/components/DashboardMetrics';
import CreateFamilyDialog from '@/components/CreateFamilyDialog';
import AddItemDialog from '@/components/AddItemDialog';

// Componentes Nuevos (V3.2)
import { FridgeCanvas } from '@/components/FridgeCanvas';

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
import { Badge } from '@/components/ui/badge';
import { Heart, LogOut, Settings, Users, ChevronDown, UserPlus, Plus, Snowflake } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile, currentHousehold, currentRole, logout, isLoading, isAuthenticated } = useAuth();
  const metricsRef = useRef<DashboardMetricsHandle>(null);

  const handleItemAdded = () => {
    metricsRef.current?.refresh();
  };

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
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'parent':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">{NEXT_PUBLIC_APP_NAME}</h1>
              {currentHousehold && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  {currentHousehold.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {currentRole && (
              <Badge variant={getRoleBadgeVariant(currentRole)} className="capitalize hidden sm:inline-flex">
                {currentRole}
              </Badge>
            )}

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
                  <Settings className="w-4 h-4 mr-2" />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users className="w-4 h-4 mr-2" />
                  Gestión del Hogar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentHousehold ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* 1. SECTION: ACTION BAR & TITLE */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Centro de Mando</h2>
                <p className="text-muted-foreground text-sm">Gestiona el caos diario desde aquí.</p>
              </div>
              
              <AddItemDialog onItemAdded={handleItemAdded}>
                <Button className="shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Stock
                </Button>
              </AddItemDialog>
            </div>

            {/* 2. SECTION: THE FRIDGE (V3.2 CORE FEATURE) */}
            <section className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative">
                 <div className="flex items-center gap-2 mb-3">
                    <Snowflake className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold">Nevera Digital</h3>
                 </div>
                 {/* Aquí vive la nueva lógica */}
                 <FridgeCanvas householdId={currentHousehold.id} />
              </div>
            </section>

            {/* 3. SECTION: METRICS & INVENTORY */}
            <div className="pt-4 border-t border-border/50">
              <h3 className="text-lg font-semibold mb-4">Estado del Inventario</h3>
              <DashboardMetrics ref={metricsRef} />
            </div>

          </div>
        ) : (
          /* NO HOUSEHOLD STATE (Mantenido intacto) */
          <Card className="max-w-md mx-auto mt-12 border-dashed">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Bienvenido a {NEXT_PUBLIC_APP_NAME}</CardTitle>
              <CardDescription>
                Todavía no formas parte de ningún hogar. Crea uno para empezar o pide que te inviten.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CreateFamilyDialog>
                <Button className="w-full h-11">Crear nuevo Hogar</Button>
              </CreateFamilyDialog>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">o</span>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Pide el enlace de invitación a un administrador.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;