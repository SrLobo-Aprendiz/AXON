import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error in auth callback:', error);
          toast({
            title: 'Error de autenticación',
            description: 'No se pudo verificar tu sesión. Por favor, intenta de nuevo.',
            variant: 'destructive',
          });
          navigate('/auth', { replace: true });
          return;
        }

        if (data.session) {
          toast({
            title: '¡Sesión confirmada!',
            description: 'Bienvenido de nuevo a AXON.',
          });
          // Redirigir al setup (él decidirá si ir a setup o dashboard)
          navigate('/setup', { replace: true });
        } else {
          // Si no hay sesión, quizá estamos en una fase intermedia
          navigate('/auth', { replace: true });
        }
      } catch (err) {
        console.error('Unexpected error in auth callback:', err);
        navigate('/auth', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  return <LoadingScreen />;
};

export default AuthCallback;
