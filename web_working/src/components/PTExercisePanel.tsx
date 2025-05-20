import React, { useState } from 'react';
import { Activity, Play, Square, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { PTMetrics } from '../hooks/usePTStream';
import { CollapsiblePanel } from './CollapsiblePanel';

interface PTExercisePanelProps {
  metrics: PTMetrics;
  isActive: boolean;
  exerciseType: string | null;
  onStart: (type: string) => void;
  onStop: () => void;
  isConnected?: boolean;
}

export function PTExercisePanel({ 
  metrics, 
  isActive, 
  exerciseType, 
  onStart, 
  onStop,
  isConnected = false
}: PTExercisePanelProps) {
  // Define exercise types
  const exerciseTypes = [
    { id: 'balance', name: 'Balance Training' },
    { id: 'weight-shift', name: 'Weight Shift' },
    { id: 'sit-to-stand', name: 'Sit to Stand' },
    { id: 'gait', name: 'Gait Training' }
  ];
  
  // State to toggle expanded exercise selection
  const [showExerciseOptions, setShowExerciseOptions] = useState(false);

  return (
    <CollapsiblePanel
      title="PT Exercise Control"
      subtitle={isActive ? `Active: ${exerciseType}` : 'Inactive'}
      icon={<Activity className="w-6 h-6 text-blue-400" />}
      defaultExpanded={true}
    >
      <div className="space-y-4">
        {/* Status message for demo mode */}
        {!isConnected && (
          <div className="text-xs flex items-center gap-1 bg-gray-800 p-2 rounded-md">
            <AlertCircle className="w-3 h-3 text-yellow-500" />
            <span className="text-yellow-100">
              Demo Mode: Using simulated data
            </span>
          </div>
        )}
        
        {/* Status message for waiting on real sensor data */}
        {isConnected && !isActive && (
          <div className="text-xs text-gray-400 italic mb-2">
            Using default values. Live sensor data will update metrics when available.
          </div>
        )}
        
        {/* Exercise controls */}
        <div className="bg-gray-800 p-3 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {isActive 
                ? `${exerciseType} (${Math.round(metrics.exerciseCompletion)}% complete)`
                : 'Select an exercise to begin'}
            </span>
            
            {isActive ? (
              <button
                onClick={onStop}
                className="flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-white text-sm"
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={() => setShowExerciseOptions(!showExerciseOptions)}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm"
              >
                <span>Select Exercise</span>
                {showExerciseOptions ? 
                  <ChevronUp className="w-4 h-4" /> : 
                  <ChevronDown className="w-4 h-4" />
                }
              </button>
            )}
          </div>
          
          {/* Expanded exercise options */}
          {!isActive && showExerciseOptions && (
            <div className="mt-3 grid grid-cols-1 gap-2 pt-3 border-t border-gray-700">
              {exerciseTypes.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => {
                    onStart(ex.id);
                    setShowExerciseOptions(false);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-sm w-full text-left"
                >
                  <Play className="w-4 h-4 text-blue-400" />
                  <span>{ex.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Metrics display */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="bg-gray-800 p-3 rounded-md">
            <span className="text-xs text-gray-400">Balance Score</span>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">{Math.round(metrics.balanceScore)}</span>
              <span className="text-sm text-gray-400">/100</span>
            </div>
            <div className="w-full bg-gray-700 h-2 mt-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full"
                style={{ width: `${metrics.balanceScore}%` }}
              />
            </div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded-md">
            <span className="text-xs text-gray-400">Stability Index</span>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">{metrics.stabilityIndex.toFixed(1)}</span>
              <span className="text-sm text-gray-400">/1.0</span>
            </div>
            <div className="w-full bg-gray-700 h-2 mt-2 rounded-full overflow-hidden">
              <div
                className="bg-green-500 h-full"
                style={{ width: `${metrics.stabilityIndex * 100}%` }}
              />
            </div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded-md">
            <span className="text-xs text-gray-400">Weight Shift Quality</span>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">{Math.round(metrics.weightShiftQuality)}</span>
              <span className="text-sm text-gray-400">/100</span>
            </div>
            <div className="w-full bg-gray-700 h-2 mt-2 rounded-full overflow-hidden">
              <div
                className="bg-yellow-500 h-full"
                style={{ width: `${metrics.weightShiftQuality}%` }}
              />
            </div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded-md">
            <span className="text-xs text-gray-400">Range of Motion</span>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">{Math.round(metrics.rangeOfMotion)}</span>
              <span className="text-sm text-gray-400">/100</span>
            </div>
            <div className="w-full bg-gray-700 h-2 mt-2 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full"
                style={{ width: `${metrics.rangeOfMotion}%` }}
              />
            </div>
          </div>
        </div>
        
        {isActive && (
          <div className="bg-gray-800 p-3 rounded-md flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400">Repetitions</span>
              <div className="text-xl font-bold">{metrics.repCount}</div>
            </div>
            <div className="flex-1 mx-6">
              <span className="text-xs text-gray-400">Exercise Completion</span>
              <div className="w-full bg-gray-700 h-4 mt-1 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full flex items-center justify-center text-xs text-white"
                  style={{ width: `${metrics.exerciseCompletion}%` }}
                >
                  {Math.round(metrics.exerciseCompletion)}%
                </div>
              </div>
            </div>
          </div>
        )}
        
        {!isConnected && isActive && (
          <div className="text-xs text-yellow-200 mt-2">
            <p>Note: In demo mode, exercise data is simulated. Connect MQTT sensors for real-time data.</p>
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
} 