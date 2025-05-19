import { useEffect, useState } from 'react';

export const useMQTT = (onMessage: (data: any) => void) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use Server-Sent Events instead of direct MQTT
    const eventSource = new EventSource('/api/metrics-stream');
    
    eventSource.onopen = () => {
      console.log('SSE connection established');
      setConnected(true);
      setError(null);
    };
    
    eventSource.addEventListener('metrics', (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    });
    
    eventSource.addEventListener('error', (event) => {
      console.error('SSE connection error:', event);
      setError('Connection to metrics stream failed');
      setConnected(false);
    });
    
    return () => {
      eventSource.close();
    };
  }, [onMessage]);
  
  return { connected, error };
}; 