import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Heart } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { CollapsiblePanel } from '../../components/CollapsiblePanel';
import { StatusBanner } from '../../components/StatusBanner';
import { GridStats } from '../../types/grid';
import { usePTStream } from '../../hooks/usePTStream';

// Define the PT metrics interface
interface PTMetric {
  timestamp: number;
  cadence: number;
  symmetry: number;
  stepLengthSymmetry: number;
}

// Maximum number of data points to keep in history
const MAX_DATA_POINTS = 100;

export default function LiveGait() {
  // Use the shared PT metrics stream
  const { ptMetrics, isConnected } = usePTStream('live-gait');
  
  // State for metrics history
  const [metricsHistory, setMetricsHistory] = useState<PTMetric[]>([]);
  // Connection status state
  const [error, setError] = useState<string | null>(null);

  // Format timestamp for tooltip
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Process metrics from the shared PT metrics stream
  useEffect(() => {
    // Map PT metrics to our local format
    // These values may come from different properties in the ptMetrics object
    // or may need to be derived from other values
    const cadence = 110 + Math.random() * 10; // Mock value or map from ptMetrics
    const symmetry = 80 + Math.random() * 10; // Mock value or map from ptMetrics
    const stepLengthSymmetry = 90 + Math.random() * 10; // Mock value or map from ptMetrics
    
    // Only update if we have valid data
    if (ptMetrics) {
      const timestamp = Date.now();
      
      setMetricsHistory(prev => {
        // Add new data point
        const newHistory = [...prev, { 
          timestamp, 
          cadence, 
          symmetry,
          stepLengthSymmetry
        }];
        
        // Keep only MAX_DATA_POINTS most recent points
        if (newHistory.length > MAX_DATA_POINTS) {
          return newHistory.slice(newHistory.length - MAX_DATA_POINTS);
        }
        return newHistory;
      });
    }
  }, [ptMetrics]);

  // Generate mock data if no data is received yet
  useEffect(() => {
    if (metricsHistory.length === 0) {
      // Add some initial mock data points
      const now = Date.now();
      const mockData = Array.from({ length: 20 }, (_, i) => ({
        timestamp: now - (19 - i) * 1000, // 1 second intervals
        cadence: 110 + Math.random() * 10,
        symmetry: 80 + Math.random() * 10,
        stepLengthSymmetry: 90 + Math.random() * 10 // 90-100% range for step length symmetry
      }));
      setMetricsHistory(mockData);
    }
  }, [metricsHistory.length]);

  // Configuration for the status banner
  const statusConfig: GridStats = {
    connectionStatus: isConnected ? 'connected' : 'disconnected',
    frameRate: metricsHistory.length > 1 ? 
      Math.round(1000 / ((metricsHistory[metricsHistory.length - 1].timestamp - metricsHistory[metricsHistory.length - 2].timestamp) || 1000)) : 
      0,
    lastUpdate: metricsHistory.length > 0 ? new Date(metricsHistory[metricsHistory.length - 1].timestamp).toISOString() : new Date().toISOString(),
    activeSensors: 1
  };

  // Calculate current metrics values
  const currentCadence = metricsHistory.length > 0 ? 
    metricsHistory[metricsHistory.length - 1].cadence : 0;
  
  const currentSymmetry = metricsHistory.length > 0 ? 
    metricsHistory[metricsHistory.length - 1].symmetry : 0;
    
  const currentStepLengthSymmetry = metricsHistory.length > 0 ? 
    metricsHistory[metricsHistory.length - 1].stepLengthSymmetry : 0;

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-4">Live Gait Analysis</h1>
      
      {/* Current metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cadence panel */}
        <CollapsiblePanel
          title="Cadence"
          subtitle={`${Math.round(currentCadence)} steps/min`}
          icon={<Activity className="w-6 h-6 text-blue-500" />}
          defaultExpanded={true}
        >
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-3xl font-bold text-blue-500 mb-2">
              {Math.round(currentCadence)}
            </div>
            <div className="text-gray-400 text-sm">steps/minute</div>
            
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Low</span>
                <span>Normal</span>
                <span>High</span>
              </div>
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="absolute h-full bg-blue-500"
                  style={{ 
                    width: `${Math.min(100, (currentCadence / 150) * 100)}%`,
                    transition: 'width 0.5s ease-in-out'
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>75</span>
                <span>150</span>
              </div>
            </div>
          </div>
        </CollapsiblePanel>
        
        {/* Step Length Symmetry panel */}
        <CollapsiblePanel
          title="Step-Length Symmetry"
          subtitle={`${Math.round(currentStepLengthSymmetry)}%`}
          icon={<Activity className="w-6 h-6 text-green-500" />}
          defaultExpanded={true}
        >
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-3xl font-bold text-green-500 mb-2">
              {Math.round(currentStepLengthSymmetry)}%
            </div>
            <div className="text-gray-400 text-sm">symmetry index</div>
            
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Asymmetric</span>
                <span>Symmetric</span>
              </div>
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`absolute h-full ${currentStepLengthSymmetry < 85 ? 'bg-orange-500' : 'bg-green-500'}`}
                  style={{ 
                    width: `${Math.min(100, currentStepLengthSymmetry)}%`,
                    transition: 'width 0.5s ease-in-out'
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span className="text-xs">85% (alert)</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </CollapsiblePanel>
        
        {/* Symmetry panel */}
        <CollapsiblePanel
          title="Gait Symmetry"
          subtitle={`${Math.round(currentSymmetry)}%`}
          icon={<Heart className="w-6 h-6 text-green-500" />}
          defaultExpanded={true}
        >
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-3xl font-bold text-green-500 mb-2">
              {Math.round(currentSymmetry)}%
            </div>
            <div className="text-gray-400 text-sm">symmetry index</div>
            
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Asymmetric</span>
                <span>Symmetric</span>
              </div>
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="absolute h-full bg-green-500"
                  style={{ 
                    width: `${Math.min(100, currentSymmetry)}%`,
                    transition: 'width 0.5s ease-in-out'
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </CollapsiblePanel>
      </div>
      
      {/* Chart panel */}
      <CollapsiblePanel
        title="Real-time Gait Metrics"
        subtitle="Live trends of cadence, symmetry, and step-length symmetry"
        icon={<Activity className="w-6 h-6 text-purple-500" />}
        defaultExpanded={true}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={metricsHistory}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={() => ''} 
                stroke="#6B7280"
              />
              <YAxis 
                yAxisId="left" 
                stroke="#3B82F6" 
                domain={[0, 200]}
                label={{ 
                  value: 'Cadence (steps/min)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: '#3B82F6' }
                }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#10B981" 
                domain={[0, 100]}
                label={{ 
                  value: 'Symmetry (%)', 
                  angle: 90, 
                  position: 'insideRight',
                  style: { fill: '#10B981' }
                }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563' }}
                labelFormatter={formatTimestamp}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cadence"
                name="Cadence"
                stroke="#3B82F6"
                dot={false}
                activeDot={{ r: 6 }}
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="symmetry"
                name="Gait Symmetry"
                stroke="#10B981"
                dot={false}
                activeDot={{ r: 6 }}
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="stepLengthSymmetry"
                name="Step-Length Symmetry"
                stroke="#22C55E"
                dot={false}
                activeDot={{ r: 6 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CollapsiblePanel>
      
      {/* Error display */}
      {error && (
        <div className="bg-red-900 text-white p-4 rounded-lg">
          <h3 className="font-bold">Connection Error</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
} 