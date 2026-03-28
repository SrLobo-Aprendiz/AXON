import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NEXT_PUBLIC_APP_NAME } from '@/lib/config';

import CreateFamilyDialog from '@/components/CreateFamilyDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { LoadingScreen } from '@/components/LoadingScreen';

const Setup: React.FC = () => {
    const { currentHousehold, isLoading, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                navigate('/auth', { replace: true });
            } else if (currentHousehold) {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [isLoading, isAuthenticated, currentHousehold, navigate]);

    if (isLoading || (isAuthenticated && currentHousehold === undefined)) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated || currentHousehold !== null) {
        return null;
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md border-dashed">
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
        </div>
    );
};

export default Setup;
