import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, AlertTriangle, Clock, Sparkles } from 'lucide-react';

interface RpcResponse {
  low_stock: number;
  expiring_soon: number;
  inventory: {
    total_items: number;
    by_status: {
      stocked: number;
      low: number;
      panic: number;
    };
    expiring_soon_7days: number;
  };
  chat: {
    total_messages: number;
    today: number;
    this_week: number;
  };
}

interface DashboardMetricsData {
  low_stock: number;
  expiring_soon: number;
  messages_today: number;
  total_items: number;
}

export interface DashboardMetricsHandle {
  refresh: () => Promise<void>;
}

const DashboardMetrics = forwardRef<DashboardMetricsHandle>((_, ref) => {
  const { currentHousehold } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!currentHousehold) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_dashboard_metrics', {
        p_household_id: currentHousehold.id,
      });

      console.log('Dashboard RPC Response:', { data, error: rpcError });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        setError('Failed to load metrics');
        setMetrics({
          low_stock: 0,
          expiring_soon: 0,
          messages_today: 0,
          total_items: 0,
        });
      } else if (data) {
        const rpcData = data as unknown as RpcResponse;
        console.log('Parsed RPC data:', rpcData);
        setMetrics({
          low_stock: rpcData?.low_stock ?? 0,
          expiring_soon: rpcData?.expiring_soon ?? 0,
          messages_today: rpcData?.chat?.today ?? 0,
          total_items: rpcData?.inventory?.total_items ?? 0,
        });
      } else {
        setMetrics({
          low_stock: 0,
          expiring_soon: 0,
          messages_today: 0,
          total_items: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load metrics');
      setMetrics({
        low_stock: 0,
        expiring_soon: 0,
        messages_today: 0,
        total_items: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentHousehold]);

  useImperativeHandle(ref, () => ({
    refresh: fetchMetrics,
  }));

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-gradient-to-br from-card to-secondary/30">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const isAllClear = metrics && 
    metrics.low_stock === 0 && 
    metrics.expiring_soon === 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Messages Today Card */}
      <Card className="bg-gradient-to-br from-card to-secondary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Chat Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics && metrics.messages_today > 0 ? (
            <>
              <p className="text-2xl font-bold">{metrics.messages_today}</p>
              <p className="text-xs text-muted-foreground">messages</p>
            </>
          ) : (
            <div className="text-muted-foreground">
              <p className="text-sm font-medium">Start the chat</p>
              <p className="text-xs">No messages yet today</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Card */}
      <Card className="bg-gradient-to-br from-card to-secondary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Low Stock (v3)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics && metrics.low_stock > 0 ? (
            <>
              <p className="text-2xl font-bold text-warning">{metrics.low_stock}</p>
              <p className="text-xs text-muted-foreground">items running low</p>
            </>
          ) : (
            <div className="flex items-center gap-2 text-success">
              <Sparkles className="w-4 h-4" />
              <div>
                <p className="text-sm font-medium">All stocked!</p>
                <p className="text-xs text-muted-foreground">Nothing running low</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expiring Soon Card */}
      <Card className="bg-gradient-to-br from-card to-secondary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            Expiring Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics && metrics.expiring_soon > 0 ? (
            <>
              <p className="text-2xl font-bold text-destructive">{metrics.expiring_soon}</p>
              <p className="text-xs text-muted-foreground">items expiring</p>
            </>
          ) : (
            <div className="flex items-center gap-2 text-success">
              <Sparkles className="w-4 h-4" />
              <div>
                <p className="text-sm font-medium">Good job!</p>
                <p className="text-xs text-muted-foreground">Fridge is fresh</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

DashboardMetrics.displayName = 'DashboardMetrics';

export default DashboardMetrics;
