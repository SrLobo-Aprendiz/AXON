import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { APP_CONFIG } from '@/lib/config';
import { Users, Shield, Zap } from 'lucide-react';

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl space-y-8">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Users className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">{APP_CONFIG.name}</span>
          </div>

          {/* Headlines */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              The Operating System for Your Household
            </h1>
            <p className="mx-auto max-w-lg text-lg text-muted-foreground">
              Organize, protect, and connect your home with {APP_CONFIG.name}.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link to="/auth?mode=signup">
                <Zap className="h-4 w-4" />
                Get Started
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/auth?mode=login">
                <Shield className="h-4 w-4" />
                Member Login
              </Link>
            </Button>
          </div>

          {/* Trust badge */}
          <p className="text-sm text-muted-foreground">
            {APP_CONFIG.tagline}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {APP_CONFIG.name}. All rights reserved.
      </footer>
    </div>
  );
};

export default Index;
