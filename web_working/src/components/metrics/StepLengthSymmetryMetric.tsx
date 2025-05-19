import React from 'react';
import { CollapsiblePanel } from '../CollapsiblePanel';
import { ArrowLeftRight } from 'lucide-react';

interface StepLengthSymmetryData {
  leftStepLength: number;
  rightStepLength: number;
  symmetryPercent: number;
  asymmetryPercent: number;
}

interface StepLengthSymmetryMetricProps {
  data: StepLengthSymmetryData;
  isSessionActive: boolean;
}

export function StepLengthSymmetryMetric({ data, isSessionActive }: StepLengthSymmetryMetricProps) {
  // Determine if asymmetry exceeds threshold (15%)
  const isAsymmetrical = data.asymmetryPercent > 15;
  
  // Determine which foot has longer step length
  const longerStepFoot = data.leftStepLength > data.rightStepLength ? 'left' : 'right';
  
  // Get color based on symmetry status
  const getSymmetryColor = () => {
    if (data.symmetryPercent < 85) {
      return 'text-orange-400'; // Asymmetry > 15%
    } else {
      return 'text-green-400'; // Normal
    }
  };

  // Get description based on asymmetry
  const getDescription = () => {
    if (data.symmetryPercent < 85) {
      return `Step length asymmetry detected (${Math.round(data.asymmetryPercent)}%). ${longerStepFoot.charAt(0).toUpperCase() + longerStepFoot.slice(1)} step is longer than the ${longerStepFoot === 'left' ? 'right' : 'left'} step, which may indicate compensatory gait pattern.`;
    } else {
      return "Step lengths are relatively symmetric between feet, indicating balanced gait pattern.";
    }
  };

  return (
    <CollapsiblePanel
      title="Step-Length Symmetry"
      subtitle={`${Math.round(data.symmetryPercent)}%`}
      icon={<ArrowLeftRight className="w-6 h-6 text-green-500" />}
      defaultExpanded={true}
    >
      <div className="space-y-4">
        {/* Main metrics display */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center border-r border-gray-700 pr-4">
              <div className="text-sm text-gray-400">Left Step</div>
              <div className="text-2xl font-bold">{Math.round(data.leftStepLength)}</div>
              <div className="text-xs text-gray-500">centimeters</div>
            </div>
            <div className="flex-1 text-center pl-4">
              <div className="text-sm text-gray-400">Right Step</div>
              <div className="text-2xl font-bold">{Math.round(data.rightStepLength)}</div>
              <div className="text-xs text-gray-500">centimeters</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Symmetry Index</div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-bold ${getSymmetryColor()}`}>
                {Math.round(data.symmetryPercent)}%
              </span>
              <span className={`text-sm ${getSymmetryColor()}`}>
                {isAsymmetrical ? 'High asymmetry' : 'Within normal range'}
              </span>
            </div>
            
            {/* Symmetry visualization */}
            <div className="mt-2 relative h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`absolute inset-y-0 left-0 ${data.symmetryPercent < 85 ? 'bg-orange-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, data.symmetryPercent)}%` }}
              ></div>
              
              {/* Threshold marker */}
              <div 
                className="absolute inset-y-0 w-0.5 bg-white opacity-70"
                style={{ left: '85%' }}
              ></div>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>85% (threshold)</span>
              <span>100%</span>
            </div>
          </div>
        </div>
        
        {/* Clinical context */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Clinical Interpretation</div>
          <p className="text-sm">{getDescription()}</p>
          
          <div className="mt-3 text-xs text-gray-400 space-y-1">
            <p><span className="text-green-400">&gt;85% symmetry:</span> Normal step length pattern</p>
            <p><span className="text-orange-400">&lt;85% symmetry:</span> Asymmetrical gait pattern - consider further assessment</p>
          </div>
        </div>
        
        {/* Implications */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Clinical Value</div>
          <ul className="text-sm space-y-1 list-disc pl-4">
            <li>Key goal for post-stroke rehabilitation</li>
            <li>Important metric after total knee arthroplasty (TKA)</li>
            <li>Indicates balance in propulsion force between limbs</li>
            <li>Helps identify compensation strategies in gait</li>
          </ul>
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

export default StepLengthSymmetryMetric; 