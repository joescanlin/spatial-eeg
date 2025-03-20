import { useState, useEffect } from 'react';
import { GridData, GridStats } from '../types/grid';

export function useGridData() {
  const [gridData, setGridData] = useState<GridData>({
    cells: Array(15).fill(Array(12).fill(false)),
    fallDetected: false,
    confidence: 0,
    timestamp: new Date().toISOString(),
  });
  
  const [stats, setStats] = useState<GridStats>({
    frameRate: 0,
    connectionStatus: 'disconnected',
    lastUpdate: new Date().toISOString(),
  });

  useEffect(() => {
    const eventSource = new EventSource('/api/grid-stream');
    let frameCount = 0;
    let lastSecond = Date.now();

    const calculateFrameRate = () => {
      const now = Date.now();
      if (now - lastSecond >= 1000) {
        setStats(prev => ({
          ...prev,
          frameRate: frameCount,
        }));
        frameCount = 0;
        lastSecond = now;
      }
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!data.keepalive) {
        // Process different message types based on topic
        switch (data.topic) {
          case 'controller/networkx/frame/rft':
            setGridData(prev => ({
              ...prev,
              cells: data.data.grid,
              timestamp: data.timestamp,
            }));
            break;
          case 'analysis/path/rft/active':
            setGridData(prev => ({
              ...prev,
              fallDetected: data.data.fallDetected,
              confidence: data.data.confidence,
            }));
            break;
        }
        
        frameCount++;
        calculateFrameRate();
        setStats(prev => ({
          ...prev,
          connectionStatus: 'connected',
          lastUpdate: data.timestamp,
        }));
      }
    };

    eventSource.onerror = () => {
      setStats(prev => ({
        ...prev,
        connectionStatus: 'disconnected',
      }));
    };

    return () => eventSource.close();
  }, []);

  return { gridData, stats };
}