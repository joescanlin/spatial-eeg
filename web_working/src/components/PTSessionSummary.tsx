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
  
  // Add logging to debug metrics data
  console.log("PTSessionSummary render:", { 
    metricsCount: validMetrics.length, 
    isSessionActive, 
    selectedMetricsCount: selectedMetrics.length,
    hasMetrics: Boolean(validMetrics.length > 0)
  });

  // Calculate average metrics
  const averages = useMemo(() => {
    if (validMetrics.length === 0) {
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
  
  // Transform metrics for chart display
  const chartData = useMemo(() => {
    return validMetrics.map(m => ({
      ...m,
      timeElapsed: `${Math.floor(m.duration / 60)}:${(m.duration % 60).toString().padStart(2, '0')}`
    }));
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
        {validMetrics.length > 0 ? (
          <>
            {/* Display message if no metrics are selected */}
            {selectedMetrics.length === 0 && (
              <div className="bg-yellow-900/30 border border-yellow-800 text-yellow-200 p-3 rounded-md mb-2">
                No metrics selected for tracking. Select metrics to see data.
              </div>
            )}
            
            {/* Summary stats - only show selected metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              {selectedMetrics.includes('cadence') && (
                <div className="bg-gray-800 p-3 rounded-md text-center">
                  <div className="text-xs text-gray-400">Cadence</div>
                  <div className={`text-xl font-bold ${getStatusClass('cadence', averages.cadence)}`}>
                    {averages.cadence}
                  </div>
                  <div className="text-xs text-gray-500">steps/min</div>
                  {/* Thresholds */}
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="text-blue-400">&lt; 90</span>
                    <span className="mx-1">|</span>
                    <span className="text-orange-400">&gt; 130</span>
                  </div>
                </div>
              )}
              
              {selectedMetrics.includes('stanceTime') && (
                <div className="bg-gray-800 p-3 rounded-md text-center">
                  <div className="text-xs text-gray-400">Stance Asymmetry</div>
                  <div className={`text-xl font-bold ${averages.stanceTimeAsymmetry > 10 ? 'text-orange-400' : 'text-green-400'}`}>
                    {averages.stanceTimeAsymmetry}%
                  </div>
                  <div className="text-xs text-gray-500">difference</div>
                  {/* Thresholds */}
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="text-orange-400">&gt; 10%</span> triggers alert
                  </div>
                </div>
              )}
              
              {selectedMetrics.includes('stepLengthSymmetry') && (
                <div className="bg-gray-800 p-3 rounded-md text-center">
                  <div className="text-xs text-gray-400">Step Length Symmetry</div>
                  <div className={`text-xl font-bold ${averages.stepLengthSymmetry < 85 ? 'text-orange-400' : 'text-green-400'}`}>
                    {averages.stepLengthSymmetry}%
                  </div>
                  <div className="text-xs text-gray-500">symmetry index</div>
                  {/* Thresholds */}
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="text-orange-400">&lt; 85%</span> triggers alert
                  </div>
                </div>
              )}
              
              {selectedMetrics.includes('gaitVariability') && (
                <div className="bg-gray-800 p-3 rounded-md text-center">
                  <div className="text-xs text-gray-400">Gait Variability</div>
                  <div className={`text-xl font-bold ${averages.cadenceVariability > 4 ? 'text-orange-400' : 'text-green-400'}`}>
                    {averages.cadenceVariability.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">cadence CV</div>
                  {/* Thresholds */}
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="text-orange-400">&gt; 4%</span> triggers alert
                  </div>
                </div>
              )}
              
              {selectedMetrics.includes('balanceScore') && (
                <div className="bg-gray-800 p-3 rounded-md text-center">
                  <div className="text-xs text-gray-400">Balance Score</div>
                  <div className="text-xl font-bold text-blue-400">{averages.balanceScore}</div>
                </div>
              )}
              
              {selectedMetrics.includes('stabilityIndex') && (
                <div className="bg-gray-800 p-3 rounded-md text-center">
                  <div className="text-xs text-gray-400">Stability</div>
                  <div className="text-xl font-bold text-teal-400">{averages.stabilityIndex}</div>
                </div>
              )}
              
              {selectedMetrics.includes('symmetry') && (
                <div className="bg-gray-800 p-3 rounded-md text-center">
                  <div className="text-xs text-gray-400">Symmetry</div>
                  <div className="text-xl font-bold text-green-400">{Math.round(averages.symmetry)}%</div>
                </div>
              )}
            </div>
            
            {/* Bar chart summary */}
            {barChartData.length > 0 && (
              <div className="h-40 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                    <XAxis dataKey="name" stroke="#6B7280" />
                    <YAxis domain={[0, 140]} stroke="#6B7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563' }}
                      formatter={(value, name, props) => {
                        const unit = props.payload.unit || '';
                        return [`${value} ${unit}`, name];
                      }}
                    />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {/* Line chart of metrics over time */}
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="timeElapsed" 
                    stroke="#6B7280"
                    label={{ value: 'Time Elapsed (mm:ss)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis stroke="#6B7280" domain={[0, 140]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563' }}
                  />
                  <Legend />
                  {selectedMetrics.includes('balanceScore') && (
                    <Line type="monotone" dataKey="balanceScore" name="Balance" stroke="#3B82F6" />
                  )}
                  {selectedMetrics.includes('weightShiftQuality') && (
                    <Line type="monotone" dataKey="weightShiftQuality" name="Weight Shift" stroke="#FBBF24" />
                  )}
                  {selectedMetrics.includes('cadence') && (
                    <Line type="monotone" dataKey="cadence" name="Cadence" stroke="#EC4899" />
                  )}
                  {selectedMetrics.includes('stanceTime') && (
                    <Line type="monotone" dataKey="stanceTimeAsymmetry" name="Stance Asymm" stroke="#F97316" />
                  )}
                  {selectedMetrics.includes('stepLengthSymmetry') && (
                    <Line type="monotone" dataKey="stepLengthSymmetry" name="Step Symm" stroke="#22C55E" />
                  )}
                  {selectedMetrics.includes('gaitVariability') && (
                    <Line type="monotone" dataKey="cadenceVariability" name="Gait Var" stroke="#8B5CF6" />
                  )}
                  {selectedMetrics.includes('symmetry') && (
                    <Line type="monotone" dataKey="symmetry" name="Symmetry" stroke="#6EE7B7" />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Selected metrics explanation */}
            <div className="bg-gray-800 p-3 rounded-md">
              <h3 className="text-sm font-medium mb-2">Selected Metrics</h3>
              <div className="space-y-2">
                {selectedMetrics.map(metricId => {
                  const metric = availableMetrics.find(m => m.id === metricId);
                  if (!metric) return null;
                  
                  return (
                    <div key={metricId} className="text-sm">
                      <div className="font-medium">{metric.name}</div>
                      <div className="text-gray-400 text-xs">{metric.clinicalValue}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            {isSessionActive ? 
              <div>
                <p>Recording session metrics. Data will appear here shortly...</p>
                <div className="mt-4 flex justify-center">
                  <div className="animate-pulse bg-purple-500 h-2 w-2 rounded-full mx-1"></div>
                  <div className="animate-pulse bg-purple-500 h-2 w-2 rounded-full mx-1" style={{animationDelay: '0.2s'}}></div>
                  <div className="animate-pulse bg-purple-500 h-2 w-2 rounded-full mx-1" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div> : 
              "No session data available. Start a session to begin recording metrics."
            }
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
}

export default PTSessionSummary; 