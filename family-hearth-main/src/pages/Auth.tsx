import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NEXT_PUBLIC_APP_NAME } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Heart, Sparkles, Users, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, signup, joinHouseholdByToken, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const inviteToken = searchParams.get('token');
  const pioneerCodeFromUrl = searchParams.get('code');
  const modeFromUrl = searchParams.get('mode');
  
  // Determine initial tab from URL path or query param
  const getInitialTab = (): 'login' | 'signup' => {
    if (location.pathname === '/auth/signup' || modeFromUrl === 'signup') return 'signup';
    if (inviteToken || pioneerCodeFromUrl) return 'signup';
    return 'login';
  };

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(getInitialTab());

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pioneerCode, setPioneerCode] = useState(pioneerCodeFromUrl || '');

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      // Handle invite token
      if (inviteToken) {
        joinHouseholdByToken(inviteToken).then(({ error }) => {
          if (error) {
            toast({ title: 'Error', description: error, variant: 'destructive' });
          } else {
            toast({ title: 'Welcome!', description: 'You have joined the household.' });
          }
          navigate('/dashboard');
        });
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, inviteToken, joinHouseholdByToken, navigate, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Error', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { error } = await login(email, password);
    setIsLoading(false);

    if (error) {
      toast({ title: 'Login failed', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Welcome back!', description: 'You have logged in successfully.' });
      navigate('/dashboard');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      toast({ title: 'Error', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: 'Error', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    
    // Signup handles the RPC claim_pioneer_code internally
    const { error } = await signup(email, password, displayName, pioneerCode?.trim() || undefined);
    
    if (error) {
      setIsLoading(false);
      toast({ title: 'Signup failed', description: error, variant: 'destructive' });
      return;
    }

    // Handle invite token after successful signup
    if (inviteToken) {
      const { error: joinError } = await joinHouseholdByToken(inviteToken);
      if (joinError) {
        toast({ title: 'Warning', description: joinError, variant: 'destructive' });
      }
    }
    
    setIsLoading(false);
    toast({ title: 'Welcome!', description: 'Your account has been created.' });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {NEXT_PUBLIC_APP_NAME}
          </h1>
          <p className="text-muted-foreground mt-2">Household connections, simplified</p>
        </div>

        {/* Auth Card */}
        <Card className="border-border/50 shadow-xl">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  {inviteToken && (
                    <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg text-sm">
                      <Users className="w-4 h-4 text-accent" />
                      <span>You've been invited to join a household!</span>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Display Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  
                  {!inviteToken && (
                    <div className="space-y-2">
                      <Label htmlFor="pioneer-code" className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-warning" />
                        Pioneer Code (optional)
                      </Label>
                      <Input
                        id="pioneer-code"
                        type="text"
                        placeholder="Enter your pioneer code"
                        value={pioneerCode}
                        onChange={(e) => setPioneerCode(e.target.value)}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Have a pioneer code? Enter it to create your household instantly!
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Auth;
