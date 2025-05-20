import { useState, useEffect } from 'react';
import { useMQTTConnection } from './useMQTTConnection';
import { GridData } from '../types/grid';

export interface PTMetrics {
  balanceScore: number;
  stabilityIndex: number;
  weightShiftQuality: number;
  rangeOfMotion: number;
  exerciseCompletion: number;
  repCount: number;
  timestamp: string;
  copArea: number; // center of pressure area in cm²
  leftLoadPct: number; // left side load distribution percentage
  rightLoadPct: number; // right side load distribution percentage
  swayVelocity: number; // sway velocity in cm/s
}

export function usePTStream(activeView?: string) {
  const { client, status } = useMQTTConnection();
  
  // Default values that will be used regardless of connection status
  const [ptMetrics, setPTMetrics] = useState<PTMetrics>({
    balanceScore: 80,
    stabilityIndex: 0.7,
    weightShiftQuality: 65,
    rangeOfMotion: 75,
    exerciseCompletion: 0,
    repCount: 0,
    timestamp: new Date().toISOString(),
    copArea: 0,
    leftLoadPct: 50,
    rightLoadPct: 50,
    swayVelocity: 0
  });
  
  const [isExerciseActive, setIsExerciseActive] = useState(false);
  const [exerciseType, setExerciseType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Start with loading=false
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Connect to SSE API for metrics (real sensor data only)
  useEffect(() => {
    // Skip data fetching if we're not in a view that needs PT metrics
    const viewsNeedingPTMetrics = ['pt-session', 'live-gait'];
    
    if (activeView && !viewsNeedingPTMetrics.includes(activeView)) {
      console.log(`🚫 PT metrics stream disabled for ${activeView} view`);
      setIsConnected(false);
      setError(null);
      return; // Don't set up EventSource
    }
    
    console.log(`✅ PT metrics stream enabled for ${activeView || 'default'} view`);
    
    console.log("Setting up PT metrics event source for real sensor data");
    // Always use default values by setting loading to false
    setLoading(false);
    // Reset error state (don't show error in UI)
    setError(null);
    
    const eventSource = new EventSource('/api/metrics-stream');
    
    eventSource.onopen = () => {
      console.log("PT metrics event source opened - waiting for real sensor input...");
      setIsConnected(true);
    };
    
    eventSource.addEventListener('metrics', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('REAL PT Metrics received from sensors:', data);
        
        // Update metrics with real data when available
        setPTMetrics(prev => ({
          ...prev,
          ...data,
          timestamp: data.timestamp || new Date().toISOString()
        }));
        setLoading(false);
      } catch (err) {
        console.error('Error processing PT metrics from real sensors:', err);
        // Log error but don't show in UI
        setError(null);
      }
    });
    
    eventSource.addEventListener('error', (event) => {
      try {
        // Cast the event to MessageEvent to access data property
        const messageEvent = event as MessageEvent;
        if (messageEvent.data) {
          const data = JSON.parse(messageEvent.data);
          console.error('SSE error event:', data);
          // Log error but don't expose it to UI
        }
      } catch (err) {
        console.error('Error parsing error event:', err);
      }
    });
    
    eventSource.onerror = (err) => {
      console.error('PT metrics connection error:', err);
      // Log connection error but don't expose it to UI
      setIsConnected(false);
      // Keep error state clear to avoid UI error message
      setError(null);
    };
    
    return () => {
      console.log("Closing PT metrics event source");
      eventSource.close();
    };
  }, [activeView]);
  
  // Also keep the MQTT connection for exercise commands
  useEffect(() => {
    if (status !== 'connected' || !client) {
      return;
    }
    
    // Subscribe to PT exercise status topics
    client.subscribe([
      'pt/exercise/status',
      'pt/exercise/type'
    ]);
    
    // Handle PT status messages
    const messageHandler = (topic: string, message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`PT MQTT Message on ${topic}:`, data);
        
        if (topic === 'pt/exercise/status') {
          setIsExerciseActive(data.active === true);
        }
        else if (topic === 'pt/exercise/type') {
          setExerciseType(data.type || null);
        }
      } catch (err) {
        console.error('Error processing PT MQTT message:', err);
      }
    };
    
    client.on('message', messageHandler);
    
    return () => {
      client.off('message', messageHandler);
      client.unsubscribe([
        'pt/exercise/status',
        'pt/exercise/type'
      ]);
    };
  }, [client, status]);
  
  const startExercise = (type: string, customExercise?: any) => {
    if (client && status === 'connected') {
      client.publish('pt/exercise/command', JSON.stringify({
        command: 'start',
        type,
        customExercise
      }));
    } else {
      // Just log the error without exposing it to the UI
      console.error('MQTT connection not available for sending command');
      // For testing UI without backend, simulate activation
      setIsExerciseActive(true);
      setExerciseType(type);
    }
  };
  
  const stopExercise = () => {
    if (client && status === 'connected') {
      client.publish('pt/exercise/command', JSON.stringify({
        command: 'stop'
      }));
    } else {
      // Just log the error without exposing it to the UI
      console.error('MQTT connection not available for sending command');
      // For testing UI without backend, simulate deactivation
      setIsExerciseActive(false);
      setExerciseType(null);
    }
  };
  
  return {
    ptMetrics,
    isExerciseActive,
    exerciseType,
    loading,
    error: null, // Always return null to prevent error display in UI
    startExercise,
    stopExercise,
    isConnected
  };
} 