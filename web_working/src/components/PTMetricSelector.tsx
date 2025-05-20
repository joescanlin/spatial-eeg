import React from 'react';
import { Check, Info, Maximize2 } from 'lucide-react';
import { CollapsiblePanel } from './CollapsiblePanel';

// Define available metrics
export interface PTMetricDefinition {
  id: string;
  name: string;
  description: string;
  clinicalValue: string;
  computation: string;
  unit: string;
  thresholds: {
    low?: number;
    normal?: number;
    high?: number;
    asymmetry?: number;
  };
  defaultEnabled: boolean;
}

// Available metrics list with their clinical significance
export const availableMetrics: PTMetricDefinition[] = [
  {
    id: 'cadence',
    name: 'Cadence',
    description: 'Rate of steps per minute',
    clinicalValue: 'Walking speed proxy; progress after knee/hip surgery',
    computation: 'Count heel-strikes ÷ time window',
    unit: 'steps · min⁻¹',
    thresholds: {
      low: 90,
      high: 130
    },
    defaultEnabled: true
  },
  {
    id: 'stanceTime',
    name: 'Step/Stance Time',
    description: 'Duration foot remains in contact with ground',
    clinicalValue: 'Detect antalgic gait or instability',
    computation: 'Frames between consecutive heel-strike & toe-off per foot',
    unit: 'ms',
    thresholds: {
      asymmetry: 10 // Asymmetry > 10% triggers flag
    },
    defaultEnabled: true
  },
  {
    id: 'stepLengthSymmetry',
    name: 'Step-Length Symmetry Index',
    description: 'Comparison of left vs right step length',
    clinicalValue: 'Post-stroke or TKA symmetry goal',
    computation: 'Absolute difference between left and right step lengths ÷ average step length × 100%',
    unit: '%',
    thresholds: {
      asymmetry: 15 // Asymmetry > 15% triggers flag (high)
    },
    defaultEnabled: true
  },
  {
    id: 'gaitVariability',
    name: 'Gait Variability (Cadence CV)',
    description: 'Consistency of walking pace',
    clinicalValue: 'Frailty predictor',
    computation: 'Standard deviation of cadence ÷ mean cadence × 100%',
    unit: '%',
    thresholds: {
      high: 4 // CV > 4% is risky in older adults
    },
    defaultEnabled: true
  },
  {
    id: 'copArea',
    name: 'CoP Area (Convex Hull)',
    description: 'Area covered by center of pressure movement',
    clinicalValue: 'Postural stability',
    computation: 'Area of CoP cloud',
    unit: 'cm²',
    thresholds: {
      high: 10 // > 10 cm² indicates high sway
    },
    defaultEnabled: true
  },
  {
    id: 'loadDistribution',
    name: 'Load Distribution L/R',
    description: 'Weight distribution between left and right sides',
    clinicalValue: 'Weight-bearing post-injury',
    computation: 'Active pixels each side ÷ total',
    unit: '%',
    thresholds: {
      asymmetry: 15 // > 65/35 (15% from 50/50) triggers alert
    },
    defaultEnabled: true
  },
  {
    id: 'swayVelocity',
    name: 'Sway Velocity',
    description: 'Rate of center of pressure movement',
    clinicalValue: 'Balance rehab, vestibular',
    computation: 'Sway path ÷ time',
    unit: 'cm · s⁻¹',
    thresholds: {
      high: 2 // > 2 cm/s indicates fall risk
    },
    defaultEnabled: true
  }
  // More metrics will be added later
];

interface PTMetricSelectorProps {
  selectedMetrics: string[];
  onToggleMetric: (metricId: string) => void;
  isSessionActive: boolean;
  isFullscreen?: boolean;
}

export function PTMetricSelector({
  selectedMetrics,
  onToggleMetric,
  isSessionActive,
  isFullscreen = false
}: PTMetricSelectorProps) {
  // Render fullscreen version
  if (isFullscreen) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Available Metrics</h2>
        <p className="text-gray-400 mb-6">
          Select the metrics you want to track during this PT session. Each metric provides different insights into patient gait and mobility patterns.
        </p>
        
        {isSessionActive && (
          <div className="bg-yellow-900/30 border border-yellow-800 text-yellow-200 p-4 rounded-md text-sm mb-6">
            <strong>Note:</strong> Metrics cannot be changed during an active session. End the current session to modify metrics.
          </div>
        )}

        <div className="space-y-6">
          {availableMetrics.map((metric) => (
            <div key={metric.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-start">
                <div className="flex-grow">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium">{metric.name}</h3>
                    <span className="ml-2 px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                      {metric.unit}
                    </span>
                  </div>
                  
                  <p className="text-gray-400 mt-1">{metric.description}</p>
                  
                  <div className="mt-4 space-y-2">
                    <div>
                      <span className="text-gray-500 text-sm">Clinical Value:</span>
                      <p className="text-white">{metric.clinicalValue}</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-500 text-sm">Computation:</span>
                      <p className="text-white">{metric.computation}</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-500 text-sm">Thresholds:</span>
                      <div className="flex space-x-4 mt-1">
                        {metric.thresholds.low && (
                          <div className="bg-blue-900/20 text-blue-400 px-2 py-1 rounded text-sm">
                            Low: &lt; {metric.thresholds.low} {metric.unit}
                          </div>
                        )}
                        {metric.thresholds.high && (
                          <div className="bg-orange-900/20 text-orange-400 px-2 py-1 rounded text-sm">
                            High: &gt; {metric.thresholds.high} {metric.unit}
                          </div>
                        )}
                        {metric.thresholds.asymmetry && (
                          <div className="bg-red-900/20 text-red-400 px-2 py-1 rounded text-sm">
                            Asymmetry: &gt; {metric.thresholds.asymmetry}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="ml-4">
                  <button 
                    className={`w-10 h-10 rounded-md ${
                      selectedMetrics.includes(metric.id) 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-700 text-gray-400'
                    }`}
                    onClick={() => !isSessionActive && onToggleMetric(metric.id)}
                    disabled={isSessionActive}
                  >
                    {selectedMetrics.includes(metric.id) && (
                      <Check className="w-6 h-6 mx-auto" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Standard compact version
  return (
    <CollapsiblePanel
      title="Metrics Selection"
      subtitle={`${selectedMetrics.length} of ${availableMetrics.length} selected`}
      icon={<Info className="w-6 h-6 text-purple-400" />}
      defaultExpanded={true}
    >
      <div className="space-y-2">
        {isSessionActive && (
          <div className="bg-yellow-900/30 border border-yellow-800 text-yellow-200 p-2 rounded-md text-sm mb-3">
            Metrics cannot be changed during an active session
          </div>
        )}
        
        <div className="overflow-hidden rounded-md border border-gray-700">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Metric
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Clinical Value
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Reference Values
                </th>
                <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Track
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-800">
              {availableMetrics.map((metric) => (
                <tr key={metric.id} className="hover:bg-gray-800/50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="font-medium">{metric.name}</div>
                    <div className="text-xs text-gray-400">{metric.unit}</div>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {metric.clinicalValue}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {metric.thresholds.low && <span className="text-blue-400">&lt; {metric.thresholds.low}</span>}
                    {metric.thresholds.low && metric.thresholds.high && <span className="mx-1">|</span>}
                    {metric.thresholds.high && <span className="text-orange-400">&gt; {metric.thresholds.high}</span>}
                    {metric.thresholds.asymmetry && <span className="text-red-400">Asymmetry &gt; {metric.thresholds.asymmetry}%</span>}
                    {(!metric.thresholds.low && !metric.thresholds.high && !metric.thresholds.asymmetry) && (
                      <span className="text-gray-400">Not specified</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div>
                      <button 
                        className={`w-6 h-6 rounded-md ${
                          selectedMetrics.includes(metric.id) 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-700 text-gray-400'
                        }`}
                        onClick={() => !isSessionActive && onToggleMetric(metric.id)}
                        disabled={isSessionActive}
                      >
                        {selectedMetrics.includes(metric.id) && (
                          <Check className="w-4 h-4 mx-auto" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="text-xs text-gray-400 mt-2">
          {isSessionActive 
            ? "Metric selection is locked during an active session"
            : "Select metrics to track during the session"}
        </div>
      </div>
    </CollapsiblePanel>
  );
}

export default PTMetricSelector; 