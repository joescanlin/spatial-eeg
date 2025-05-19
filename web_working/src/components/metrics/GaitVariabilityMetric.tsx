import React from 'react';
import { CollapsiblePanel } from '../CollapsiblePanel';
import { BarChart2 } from 'lucide-react';

interface GaitVariabilityData {
  coefficientOfVariation: number;
  dataPoints: number;
  isReliable: boolean;
  mean: number;
}

interface GaitVariabilityMetricProps {
  data: GaitVariabilityData;
  isSessionActive: boolean;
}

export function GaitVariabilityMetric({ data, isSessionActive }: GaitVariabilityMetricProps) {
  // Determine if CV exceeds threshold (4%)
  const isHighVariability = data.coefficientOfVariation > 4;
  
  // Get color based on CV value
  const getVariabilityColor = () => {
    if (!data.isReliable) {
      return 'text-gray-400'; // Not enough data
    } else if (data.coefficientOfVariation > 4) {
      return 'text-orange-400'; // High variability (risky)
    } else {
      return 'text-green-400'; // Normal
    }
  };

  // Get description based on CV value
  const getDescription = () => {
    if (!data.isReliable) {
      return "Collecting data... More steps needed to calculate reliable variability.";
    } else if (data.coefficientOfVariation > 8) {
      return "High gait variability detected. Significant step-to-step inconsistency that may indicate increased fall risk or neurological impairment.";
    } else if (data.coefficientOfVariation > 4) {
      return "Elevated gait variability. Above threshold for older adults, indicating potential instability and increased fall risk.";
    } else {
      return "Normal gait variability. Step-to-step timing is consistent, suggesting stable gait pattern.";
    }
  };

  return (
    <CollapsiblePanel
      title="Gait Variability"
      subtitle={data.isReliable ? `${data.coefficientOfVariation.toFixed(1)}% CV` : "Collecting data..."}
      icon={<BarChart2 className="w-6 h-6 text-blue-500" />}
      defaultExpanded={true}
    >
      <div className="space-y-4">
        {/* Main metrics display */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex flex-col items-center justify-center">
            {data.isReliable ? (
              <>
                <div className="text-sm text-gray-400">Coefficient of Variation (CV)</div>
                <div className={`text-3xl font-bold ${getVariabilityColor()}`}>
                  {data.coefficientOfVariation.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">SD/mean × 100%</div>
                
                <div className="text-sm mt-2 text-gray-300">
                  Based on {data.dataPoints} data points
                </div>
                <div className="text-xs text-gray-500">
                  Mean cadence: {Math.round(data.mean)} steps/min
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-sm text-gray-400">Collecting step data...</div>
                <div className="text-xs text-gray-500 mt-2">
                  {data.dataPoints}/5 data points needed
                </div>
                <div className="mt-2 w-full bg-gray-700 rounded-full h-2.5">
                  <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (data.dataPoints / 5) * 100)}%` }}></div>
                </div>
              </div>
            )}
          </div>
          
          {data.isReliable && (
            <div className="mt-4">
              {/* Variability visualization */}
              <div className="text-sm text-gray-400 mb-1">CV Level</div>
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`absolute inset-y-0 left-0 ${isHighVariability ? 'bg-orange-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, (data.coefficientOfVariation / 10) * 100)}%` }}
                ></div>
                
                {/* Threshold marker */}
                <div 
                  className="absolute inset-y-0 w-0.5 bg-white opacity-70"
                  style={{ left: '40%' }}
                ></div>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>4% (threshold)</span>
                <span>10%+</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Clinical context */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Clinical Interpretation</div>
          <p className="text-sm">{getDescription()}</p>
          
          <div className="mt-3 text-xs text-gray-400 space-y-1">
            <p><span className="text-green-400">&lt;4% CV:</span> Normal step timing consistency</p>
            <p><span className="text-orange-400">&gt;4% CV:</span> Elevated variability - increased fall risk in older adults</p>
            <p><span className="text-red-400">&gt;8% CV:</span> High variability - may indicate neurological involvement</p>
          </div>
        </div>
        
        {/* Implications */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Clinical Value</div>
          <ul className="text-sm space-y-1 list-disc pl-4">
            <li>Predictor of frailty in older adults</li>
            <li>Associated with fall risk</li>
            <li>Indicator of gait stability and motor control</li>
            <li>May reflect cognitive-motor interference</li>
          </ul>
        </div>
        
        {isSessionActive && (
          <div className="text-xs text-gray-500 italic">
            {data.isReliable ? 
              "Calculated from step timing analysis" : 
              "Collecting step timing data - continue walking"}
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
}

export default GaitVariabilityMetric; 