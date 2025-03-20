import { useState, useEffect } from 'react';
import { AlertHistory } from '../types/alert';

interface UseAlertHistoryReturn {
  alerts: AlertHistory[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAlertHistory(): UseAlertHistoryReturn {
  const [alerts, setAlerts] = useState<AlertHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/alert-history');
      if (!response.ok) throw new Error('Failed to fetch alert history');
      
      const data = await response.json();
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alert history');
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial alert history
  useEffect(() => {
    fetchAlerts();
  }, []);

  // Poll for updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  return { alerts, isLoading, error, refresh: fetchAlerts };
} 