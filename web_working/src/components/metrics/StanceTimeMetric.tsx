import React from 'react';
import { CollapsiblePanel } from '../CollapsiblePanel';
import { FootprintsIcon } from 'lucide-react';

interface StanceTimeData {
  leftFootMs: number;
  rightFootMs: number;
  asymmetryPercent: number;
}

interface StanceTimeMetricProps {
  data: StanceTimeData;
  isSessionActive: boolean;
}

export function StanceTimeMetric({ data, isSessionActive }: StanceTimeMetricProps) {
  // Determine if asymmetry exceeds threshold (10%)
  const isAsymmetrical = data.asymmetryPercent > 10;
  
  // Determine which foot has longer stance time
  const longerStanceFoot = data.leftFootMs > data.rightFootMs ? 'left' : 'right';
  
  // Get color based on asymmetry status
  const getAsymmetryColor = () => {
    if (data.asymmetryPercent > 20) {
      return 'text-red-500'; // Severe asymmetry
    } else if (data.asymmetryPercent > 10) {
      return 'text-orange-400'; // Moderate asymmetry
    } else {
      return 'text-green-400'; // Normal
    }
  };

  // Get description based on asymmetry
  const getDescription = () => {
    if (data.asymmetryPercent > 20) {
      return `Significant stance time asymmetry detected. ${longerStanceFoot.charAt(0).toUpperCase() + longerStanceFoot.slice(1)} foot remains in contact with ground ${Math.round(data.asymmetryPercent)}% longer than the opposite foot, suggesting a possible antalgic gait pattern.`;
    } else if (data.asymmetryPercent > 10) {
      return `Moderate stance time asymmetry detected. ${longerStanceFoot.charAt(0).toUpperCase() + longerStanceFoot.slice(1)} foot remains in contact with ground ${Math.round(data.asymmetryPercent)}% longer than the opposite foot.`;
    } else {
      return "Stance times are relatively symmetric between feet, indicating balanced weight-bearing during gait.";
    }
  };

  return (
    <CollapsiblePanel
      title="Step/Stance Time"
      subtitle={isAsymmetrical ? `${Math.round(data.asymmetryPercent)}% Asymmetry` : "Symmetric"}
      icon={<FootprintsIcon className="w-6 h-6 text-blue-500" />}
      defaultExpanded={true}
    >
      <div className="space-y-4">
        {/* Main metrics display */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center border-r border-gray-700 pr-4">
              <div className="text-sm text-gray-400">Left Foot</div>
              <div className="text-2xl font-bold">{Math.round(data.leftFootMs)}</div>
              <div className="text-xs text-gray-500">milliseconds</div>
            </div>
            <div className="flex-1 text-center pl-4">
              <div className="text-sm text-gray-400">Right Foot</div>
              <div className="text-2xl font-bold">{Math.round(data.rightFootMs)}</div>
              <div className="text-xs text-gray-500">milliseconds</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Asymmetry</div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-bold ${getAsymmetryColor()}`}>
                {Math.round(data.asymmetryPercent)}%
              </span>
              <span className={`text-sm ${getAsymmetryColor()}`}>
                {isAsymmetrical ? 'Above threshold' : 'Within normal range'}
              </span>
            </div>
            
            {/* Asymmetry threshold indicator */}
            <div className="mt-2 relative h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-green-500" style={{ width: '10%' }}></div>
              <div className="absolute inset-y-0 left-[10%] bg-gradient-to-r from-green-500 to-orange-500" style={{ width: '10%' }}></div>
              <div className="absolute inset-y-0 left-[20%] bg-orange-500" style={{ width: '10%' }}></div>
              <div className="absolute inset-y-0 left-[30%] bg-gradient-to-r from-orange-500 to-red-500" style={{ width: '10%' }}></div>
              <div className="absolute inset-y-0 left-[40%] right-0 bg-red-500"></div>
              
              {/* Current asymmetry marker */}
              <div 
                className="absolute top-0 w-2 h-2 bg-white rounded-full transform -translate-x-1/2"
                style={{ left: `${Math.min(50, data.asymmetryPercent)}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>10%</span>
              <span>20%</span>
              <span>30%</span>
              <span>40%+</span>
            </div>
          </div>
        </div>
        
        {/* Clinical context */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Clinical Interpretation</div>
          <p className="text-sm">{getDescription()}</p>
          
          <div className="mt-3 text-xs text-gray-400 space-y-1">
            <p><span className="text-green-400">&lt;10% asymmetry:</span> Typical gait pattern</p>
            <p><span className="text-orange-400">10-20% asymmetry:</span> Possible antalgic (pain-avoiding) gait</p>
            <p><span className="text-red-400">&gt;20% asymmetry:</span> Significant compensation, likely due to pain/instability</p>
          </div>
        </div>
        
        {/* Implications */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Clinical Value</div>
          <ul className="text-sm space-y-1 list-disc pl-4">
            <li>Identifies compensatory gait patterns</li>
            <li>Helps track weight-bearing symmetry during rehabilitation</li>
            <li>Assists in pain assessment and intervention planning</li>
            <li>Monitors progress after lower extremity surgery or injury</li>
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

export default StanceTimeMetric; 