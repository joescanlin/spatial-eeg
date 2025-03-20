import { useState, useEffect } from 'react';
import { AlertConfig } from '../types/alert';

interface UseAlertConfigReturn {
  config: AlertConfig;
  isLoading: boolean;
  error: string | null;
  updateConfig: (newConfig: AlertConfig) => Promise<void>;
}

export function useAlertConfig(): UseAlertConfigReturn {
  const [config, setConfig] = useState<AlertConfig>({
    phoneNumbers: [''],
    enabled: true,
    confidenceThreshold: 75,
    cooldownPeriod: 300,
    messageTemplate: 'Fall detected with {confidence}% confidence!',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/alert-config');
        if (!response.ok) throw new Error('Failed to load configuration');
        
        const data = await response.json();
        setConfig(prev => ({
          ...prev,
          confidenceThreshold: data.confidenceThreshold,
          cooldownPeriod: data.cooldownPeriod,
          enabled: data.enabled
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Update configuration
  const updateConfig = async (newConfig: AlertConfig) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/alert-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confidenceThreshold: newConfig.confidenceThreshold,
          cooldownPeriod: newConfig.cooldownPeriod,
          enabled: newConfig.enabled
        }),
      });

      if (!response.ok) throw new Error('Failed to update configuration');
      
      setConfig(newConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { config, isLoading, error, updateConfig };
} 