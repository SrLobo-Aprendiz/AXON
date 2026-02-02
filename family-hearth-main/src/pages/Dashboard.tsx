import { ToxicCard } from '../components/ToxicCard';
import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NEXT_PUBLIC_APP_NAME } from '@/lib/config';
import DashboardMetrics, { DashboardMetricsHandle } from '@/components/DashboardMetrics';
import CreateFamilyDialog from '@/components/CreateFamilyDialog';
import AddItemDialog from '@/components/AddItemDialog';
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
import { Heart, LogOut, Settings, Users, ChevronDown, UserPlus, Plus } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
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
                <p className="text-xs text-muted-foreground">{currentHousehold.name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {currentRole && (
              <Badge variant={getRoleBadgeVariant(currentRole)} className="capitalize">
                {currentRole}
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(profile.full_name || profile.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm">{profile.full_name || profile.email}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users className="w-4 h-4 mr-2" />
                  Manage Household
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentHousehold ? (
          <div className="space-y-8">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Dashboard</h2>
              <AddItemDialog onItemAdded={handleItemAdded}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </AddItemDialog>
            </div>

            {/* Dashboard Metrics from RPC */}
            <DashboardMetrics ref={metricsRef} />
          </div>
        ) : (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Welcome to {NEXT_PUBLIC_APP_NAME}!</CardTitle>
              <CardDescription>
                You're not part of any household yet. Create one to get started or join with an invitation link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CreateFamilyDialog>
                <Button className="w-full">Create a Household</Button>
              </CreateFamilyDialog>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Ask a household member to send you an invite link.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
