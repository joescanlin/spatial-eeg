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
import { useDataStream } from '../../hooks/useDataStream';
import { BalanceAssessment } from '../../components/BalanceAssessment';
import { GaitVisualization } from '../../components/GaitVisualization';

// Define the PT metrics interface
interface PTMetric {
  timestamp: number;
  cadence: number;
  symmetry: number;
  stepLengthSymmetry: number;
  copArea: number;
  leftLoadPct: number;
  rightLoadPct: number;
  swayVelocity: number;
}

// Maximum number of data points to keep in history
const MAX_DATA_POINTS = 100;

export default function LiveGait() {
  // Use the shared PT metrics stream
  const { ptMetrics, isConnected } = usePTStream('live-gait');
  // Get grid data for balance assessment and gait visualization
  const { gridData, stats } = useDataStream('live-gait');
  
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
          stepLengthSymmetry,
          copArea: ptMetrics.copArea || 0, // Real CoP area from PT analytics
          leftLoadPct: Math.random() * 100,
          rightLoadPct: Math.random() * 100,
          swayVelocity: Math.random() * 4 // Mock value between 0-4 cm/s
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
        stepLengthSymmetry: 90 + Math.random() * 10, // 90-100% range for step length symmetry
        copArea: ptMetrics.copArea || Math.random() * 10, // Real CoP area or fallback to mock
        leftLoadPct: Math.random() * 100,
        rightLoadPct: Math.random() * 100,
        swayVelocity: Math.random() * 4 // Mock value between 0-4 cm/s
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

        {/* CoP Area panel */}
        <CollapsiblePanel
          title="CoP Area"
          subtitle={`${Math.round(ptMetrics.copArea || 0)} cm²`}
          icon={<Activity className="w-6 h-6 text-orange-500" />}
          defaultExpanded={true}
        >
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-3xl font-bold text-orange-500 mb-2">
              {Math.round(ptMetrics.copArea || 0)} cm²
            </div>
            <div className="text-gray-400 text-sm">center of pressure area</div>
            
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Stable</span>
                <span>High Sway</span>
              </div>
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`absolute h-full ${(ptMetrics.copArea || 0) > 10 ? 'bg-red-500' : 'bg-orange-500'}`}
                  style={{ 
                    width: `${Math.min(100, ((ptMetrics.copArea || 0) / 10) * 100)}%`,
                    transition: 'width 0.5s ease-in-out'
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span className="text-xs">10 cm² (alert)</span>
                <span>20 cm²</span>
              </div>
            </div>
          </div>
        </CollapsiblePanel>

        {/* Load Distribution panel */}
        <CollapsiblePanel
          title="Load Distribution"
          subtitle={`${Math.round(ptMetrics.leftLoadPct)}/${Math.round(ptMetrics.rightLoadPct)}`}
          icon={<Activity className="w-6 h-6 text-blue-500" />}
          defaultExpanded={true}
        >
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold text-blue-500">
                {Math.round(ptMetrics.leftLoadPct)}%
                <span className="text-gray-400 text-sm ml-1">Left</span>
              </div>
              <div className="text-2xl font-bold text-blue-500">
                {Math.round(ptMetrics.rightLoadPct)}%
                <span className="text-gray-400 text-sm ml-1">Right</span>
              </div>
            </div>
            <div className="text-gray-400 text-sm text-center">weight distribution</div>
            
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Left Dominant</span>
                <span>Balanced</span>
                <span>Right Dominant</span>
              </div>
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`absolute h-full ${
                    Math.abs(ptMetrics.leftLoadPct - 50) > 15 ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ 
                    width: '100%',
                    clipPath: `inset(0 ${100 - ptMetrics.leftLoadPct}% 0 0)`,
                    transition: 'clip-path 0.5s ease-in-out'
                  }}
                />
                <div 
                  className={`absolute h-full ${
                    Math.abs(ptMetrics.rightLoadPct - 50) > 15 ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ 
                    width: '100%',
                    clipPath: `inset(0 0 0 ${100 - ptMetrics.rightLoadPct}%)`,
                    transition: 'clip-path 0.5s ease-in-out'
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>35%</span>
                <span className="text-xs">50/50 (ideal)</span>
                <span>65%</span>
              </div>
            </div>
          </div>
        </CollapsiblePanel>

        {/* Sway Velocity panel */}
        <CollapsiblePanel
          title="Sway Velocity"
          subtitle={`${ptMetrics.swayVelocity.toFixed(1)} cm/s`}
          icon={<Activity className="w-6 h-6 text-purple-500" />}
          defaultExpanded={true}
        >
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-3xl font-bold text-purple-500 mb-2">
              {ptMetrics.swayVelocity.toFixed(1)}
              <span className="text-lg ml-1">cm/s</span>
            </div>
            <div className="text-gray-400 text-sm">center of pressure velocity</div>
            
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Stable</span>
                <span>Fall Risk</span>
              </div>
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`absolute h-full ${ptMetrics.swayVelocity > 2 ? 'bg-red-500' : 'bg-purple-500'}`}
                  style={{ 
                    width: `${Math.min(100, (ptMetrics.swayVelocity / 4) * 100)}%`,
                    transition: 'width 0.5s ease-in-out'
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span className="text-xs">2 cm/s (risk)</span>
                <span>4 cm/s</span>
              </div>
            </div>
          </div>
        </CollapsiblePanel>
      </div>
      
      {/* Balance Assessment and Gait Pattern */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BalanceAssessment metrics={gridData.balanceMetrics} />
        <GaitVisualization data={gridData} />
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