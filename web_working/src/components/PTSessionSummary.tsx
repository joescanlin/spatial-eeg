import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart, Bar } from 'recharts';
import { CollapsiblePanel } from './CollapsiblePanel';
import { BarChart2 } from 'lucide-react';
import { availableMetrics } from './PTMetricSelector';

// Session metrics interface (matching the one in usePTSession.ts)
interface SessionMetrics {
  timestamp: string;
  duration: number;
  balanceScore: number;
  stabilityIndex: number;
  weightShiftQuality: number;
  rangeOfMotion: number;
  cadence: number;
  leftStanceTimeMs?: number;
  rightStanceTimeMs?: number;
  stanceTimeAsymmetry?: number;
  leftStepLength?: number;
  rightStepLength?: number;
  stepLengthSymmetry?: number;
  cadenceVariability?: number;
  symmetry: number;
  metricStatus?: {
    [key: string]: 'normal' | 'low' | 'high' | 'none';
  };
}

interface PTSessionSummaryProps {
  metrics: SessionMetrics[];
  isSessionActive: boolean;
  selectedMetrics: string[];
}

export function PTSessionSummary({ metrics, isSessionActive, selectedMetrics }: PTSessionSummaryProps) {
  // Ensure metrics is a valid array
  const validMetrics = Array.isArray(metrics) ? metrics : [];
  
  // Add debugging to check the input metrics
  console.log("MetricsDebug - PTSessionSummary input metrics:", {
    receivedMetricsType: typeof metrics,
    isInputArray: Array.isArray(metrics),
    inputLength: Array.isArray(metrics) ? metrics.length : 'not an array',
    firstItemIfExists: Array.isArray(metrics) && metrics.length > 0 ? typeof metrics[0] : 'none',
    validMetricsLength: validMetrics.length
  });
  
  // If metrics is empty, log a more detailed warning
  if (!Array.isArray(metrics) || metrics.length === 0) {
    console.warn("MetricsDebug - PTSessionSummary received empty metrics:", {
      metrics: metrics,
      selectedMetrics: selectedMetrics,
      isSessionActive: isSessionActive
    });
  }
  
  // Calculate average metrics
  const averages = useMemo(() => {
    if (validMetrics.length === 0) {
      console.log("MetricsDebug - No valid metrics to calculate averages");
      return {
        balanceScore: 0,
        stabilityIndex: 0,
        weightShiftQuality: 0,
        rangeOfMotion: 0,
        cadence: 0,
        symmetry: 0,
        leftStanceTimeMs: 0,
        rightStanceTimeMs: 0,
        stanceTimeAsymmetry: 0,
        leftStepLength: 0,
        rightStepLength: 0,
        stepLengthSymmetry: 0,
        cadenceVariability: 0
      };
    }
    
    const sums = validMetrics.reduce((acc, metric) => {
      return {
        balanceScore: acc.balanceScore + (metric.balanceScore || 0),
        stabilityIndex: acc.stabilityIndex + (metric.stabilityIndex || 0),
        weightShiftQuality: acc.weightShiftQuality + (metric.weightShiftQuality || 0),
        rangeOfMotion: acc.rangeOfMotion + (metric.rangeOfMotion || 0),
        cadence: acc.cadence + (metric.cadence || 0),
        symmetry: acc.symmetry + (metric.symmetry || 0),
        leftStanceTimeMs: acc.leftStanceTimeMs + (metric.leftStanceTimeMs || 0),
        rightStanceTimeMs: acc.rightStanceTimeMs + (metric.rightStanceTimeMs || 0),
        stanceTimeAsymmetry: acc.stanceTimeAsymmetry + (metric.stanceTimeAsymmetry || 0),
        leftStepLength: acc.leftStepLength + (metric.leftStepLength || 0),
        rightStepLength: acc.rightStepLength + (metric.rightStepLength || 0),
        stepLengthSymmetry: acc.stepLengthSymmetry + (metric.stepLengthSymmetry || 0),
        cadenceVariability: acc.cadenceVariability + (metric.cadenceVariability || 0)
      };
    }, {
      balanceScore: 0,
      stabilityIndex: 0,
      weightShiftQuality: 0,
      rangeOfMotion: 0,
      cadence: 0,
      symmetry: 0,
      leftStanceTimeMs: 0,
      rightStanceTimeMs: 0,
      stanceTimeAsymmetry: 0,
      leftStepLength: 0,
      rightStepLength: 0,
      stepLengthSymmetry: 0,
      cadenceVariability: 0
    });
    
    return {
      balanceScore: Math.round(sums.balanceScore / validMetrics.length),
      stabilityIndex: Number((sums.stabilityIndex / validMetrics.length).toFixed(2)),
      weightShiftQuality: Math.round(sums.weightShiftQuality / validMetrics.length),
      rangeOfMotion: Math.round(sums.rangeOfMotion / validMetrics.length),
      cadence: Math.round(sums.cadence / validMetrics.length),
      symmetry: Math.round(sums.symmetry / validMetrics.length),
      leftStanceTimeMs: Math.round(sums.leftStanceTimeMs / validMetrics.length),
      rightStanceTimeMs: Math.round(sums.rightStanceTimeMs / validMetrics.length),
      stanceTimeAsymmetry: Number((sums.stanceTimeAsymmetry / validMetrics.length).toFixed(1)),
      leftStepLength: Math.round(sums.leftStepLength / validMetrics.length),
      rightStepLength: Math.round(sums.rightStepLength / validMetrics.length),
      stepLengthSymmetry: Number((sums.stepLengthSymmetry / validMetrics.length).toFixed(1)),
      cadenceVariability: Number((sums.cadenceVariability / validMetrics.length).toFixed(1))
    };
  }, [validMetrics]);
  
  // Prepare data for charts
  const chartData = useMemo(() => {
    console.log("MetricsDebug - Preparing chart data with metrics count:", validMetrics.length);
    
    // Ensure validMetrics is actually an array again (paranoid check)
    const metricsArray = Array.isArray(validMetrics) ? validMetrics : [];
    
    // If we still have no metrics, log and return empty array
    if (metricsArray.length === 0) {
      console.warn("MetricsDebug - No metrics available for chart data");
      return [];
    }
    
    try {
      // Format data for time-series chart
      return metricsArray.map((metric, index) => ({
        name: index,
        cadence: metric.cadence || 0,
        symmetry: metric.symmetry || 0,
        stepLengthSymmetry: metric.stepLengthSymmetry || 0,
        balanceScore: metric.balanceScore || 0,
        time: new Date(metric.timestamp).toISOString().substr(11, 8) // HH:MM:SS
      }));
    } catch (error) {
      console.error("MetricsDebug - Error preparing chart data:", error);
      return [];
    }
  }, [validMetrics]);
  
  // Bar chart data for summary - only include selected metrics
  const barChartData = useMemo(() => {
    const data = [];
    
    if (selectedMetrics.includes('balanceScore')) {
      data.push({ name: 'Balance', value: averages.balanceScore, fill: '#3B82F6' });
    }
    
    if (selectedMetrics.includes('stabilityIndex')) {
      data.push({ name: 'Stability', value: averages.stabilityIndex * 100, fill: '#14B8A6' });
    }
    
    if (selectedMetrics.includes('weightShiftQuality')) {
      data.push({ name: 'Weight Shift', value: averages.weightShiftQuality, fill: '#FBBF24' });
    }
    
    if (selectedMetrics.includes('rangeOfMotion')) {
      data.push({ name: 'ROM', value: averages.rangeOfMotion, fill: '#A855F7' });
    }
    
    if (selectedMetrics.includes('cadence')) {
      data.push({ name: 'Cadence', value: averages.cadence, fill: '#EC4899', unit: 'steps/min' });
    }
    
    if (selectedMetrics.includes('stanceTime')) {
      data.push({ name: 'Stance Asymm', value: averages.stanceTimeAsymmetry, fill: '#F97316', unit: '%' });
    }
    
    if (selectedMetrics.includes('stepLengthSymmetry')) {
      data.push({ name: 'Step Symm', value: averages.stepLengthSymmetry, fill: '#22C55E', unit: '%' });
    }
    
    if (selectedMetrics.includes('gaitVariability')) {
      data.push({ name: 'Gait Var', value: averages.cadenceVariability, fill: '#8B5CF6', unit: '%' });
    }
    
    if (selectedMetrics.includes('symmetry')) {
      data.push({ name: 'Symmetry', value: averages.symmetry, fill: '#6EE7B7' });
    }
    
    return data;
  }, [averages, selectedMetrics]);

  // Get status class for a metric value
  const getStatusClass = (metricId: string, value: number) => {
    const lastMetric = validMetrics[validMetrics.length - 1];
    
    if (!lastMetric || !lastMetric.metricStatus) {
      return '';
    }
    
    const status = lastMetric.metricStatus[metricId];
    
    switch(status) {
      case 'low':
        return 'text-blue-400';
      case 'high':
        return 'text-orange-400';
      default:
        return 'text-green-400';
    }
  };

  return (
    <CollapsiblePanel
      title="Session Metrics"
      subtitle={isSessionActive ? "Recording data..." : validMetrics.length > 0 ? "Session complete" : "No data"}
      icon={<BarChart2 className="w-6 h-6 text-purple-400" />}
      defaultExpanded={true}
    >
      <div className="space-y-4">
        {/* Data points summary */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Session Summary</h3>
            <div className="text-sm bg-blue-900/50 px-2 py-1 rounded-lg">
              {validMetrics.length} data points
            </div>
          </div>
          
          {validMetrics.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No metric data available for this session.</p>
              <p className="text-sm mt-2">This could happen if the session didn't record any metrics or if there was an issue with data saving.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {selectedMetrics.includes('cadence') && (
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Avg. Cadence</p>
                    <p className="text-xl font-bold">{Math.round(averages.cadence)} <span className="text-sm text-gray-400">steps/min</span></p>
                  </div>
                )}
                
                {selectedMetrics.includes('stepLengthSymmetry') && (
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Step-Length Symmetry</p>
                    <p className="text-xl font-bold">{Math.round(averages.stepLengthSymmetry)}%</p>
                  </div>
                )}
                
                {selectedMetrics.includes('stanceTime') && (
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Stance Time Asymmetry</p>
                    <p className="text-xl font-bold">{Math.round(averages.stanceTimeAsymmetry)}%</p>
                  </div>
                )}
                
                {selectedMetrics.includes('gaitVariability') && (
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">CV of Cadence</p>
                    <p className="text-xl font-bold">{averages.cadenceVariability.toFixed(1)}%</p>
                  </div>
                )}
              </div>
              
              {/* Chart */}
              {chartData.length > 0 && (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#6B7280"
                        tickFormatter={(val) => chartData[val]?.time || ''}
                      />
                      <YAxis stroke="#6B7280" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563' }}
                      />
                      <Legend />
                      {selectedMetrics.includes('cadence') && (
                        <Line 
                          type="monotone" 
                          dataKey="cadence" 
                          name="Cadence" 
                          stroke="#3B82F6" 
                          activeDot={{ r: 8 }} 
                        />
                      )}
                      {selectedMetrics.includes('stepLengthSymmetry') && (
                        <Line 
                          type="monotone" 
                          dataKey="stepLengthSymmetry" 
                          name="Step-Length Symmetry" 
                          stroke="#10B981" 
                        />
                      )}
                      {selectedMetrics.includes('balanceScore') && (
                        <Line 
                          type="monotone" 
                          dataKey="balanceScore" 
                          name="Balance Score" 
                          stroke="#F59E0B" 
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </CollapsiblePanel>
  );
}

export default PTSessionSummary; 