import React from 'react';
import { CollapsiblePanel } from '../CollapsiblePanel';
import { Activity } from 'lucide-react';

interface CadenceMetricProps {
  value: number;
  status: 'normal' | 'low' | 'high' | 'none';
  isSessionActive: boolean;
}

export function CadenceMetric({ value, status, isSessionActive }: CadenceMetricProps) {
  // Get color based on status
  const getStatusColor = () => {
    switch(status) {
      case 'low':
        return 'text-blue-400';
      case 'high':
        return 'text-orange-400';
      case 'normal':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  // Get description based on value
  const getDescription = () => {
    if (value < 90) {
      return "Slow cadence - may indicate reduced mobility, pain during gait, or balance concerns.";
    } else if (value > 130) {
      return "Fast cadence - may indicate shorter stride length or compensatory gait pattern.";
    } else {
      return "Normal cadence - indicates typical walking rhythm within reference range.";
    }
  };

  // Calculate position on the meter
  const getMeterPosition = () => {
    // 160 steps/min would be max on our scale
    const percentage = Math.min(100, (value / 160) * 100);
    return `${percentage}%`;
  };

  return (
    <CollapsiblePanel
      title="Cadence"
      subtitle={`${Math.round(value)} steps/min`}
      icon={<Activity className="w-6 h-6 text-blue-500" />}
      defaultExpanded={true}
    >
      <div className="space-y-4">
        {/* Current value display */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-400">Current Cadence</span>
            <span className={`text-3xl font-bold ${getStatusColor()}`}>
              {Math.round(value)}
            </span>
          </div>
          <div className="text-xs text-gray-500 text-right">steps/min</div>
          
          {/* Status description */}
          <div className={`mt-2 text-sm ${getStatusColor()}`}>
            {status === 'low' && 'Below normal range'}
            {status === 'high' && 'Above normal range'}
            {status === 'normal' && 'Within normal range'}
            {status === 'none' && 'No data available'}
          </div>
        </div>
        
        {/* Visual meter */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Reference Range</div>
          
          <div className="relative h-8 bg-gray-700 rounded-lg overflow-hidden">
            {/* Color zones */}
            <div className="absolute inset-y-0 left-0 w-[56.25%] bg-blue-900/30"></div>
            <div className="absolute inset-y-0 left-[56.25%] right-[18.75%] bg-green-900/30"></div>
            <div className="absolute inset-y-0 right-0 w-[18.75%] bg-orange-900/30"></div>
            
            {/* Labels */}
            <div className="absolute inset-0 flex justify-between items-center px-2 text-xs text-gray-400">
              <span>0</span>
              <span className="ml-[56.25%] -translate-x-1/2">90</span>
              <span className="mr-[18.75%] translate-x-1/2">130</span>
              <span>160</span>
            </div>
            
            {/* Current value indicator */}
            <div 
              className="absolute top-0 w-2 h-8 bg-white"
              style={{ left: getMeterPosition(), transform: 'translateX(-50%)' }}
            ></div>
          </div>
        </div>
        
        {/* Clinical context */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Clinical Context</div>
          <p className="text-sm">{getDescription()}</p>
          
          <div className="mt-3 text-xs text-gray-400">
            <p className="mb-1"><span className="text-blue-400">Low cadence (&lt;90):</span> Common after joint replacement or with chronic pain.</p>
            <p className="mb-1"><span className="text-green-400">Normal cadence (90-130):</span> Healthy walking rhythm for most adults.</p>
            <p><span className="text-orange-400">High cadence (&gt;130):</span> May indicate compensatory gait pattern or reduced stride length.</p>
          </div>
        </div>
        
        {isSessionActive && (
          <div className="text-xs text-gray-500 italic">
            Real-time measurement from pressure sensor array
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
}

export default CadenceMetric; 