import React, { useState, useEffect } from 'react';
import { Activity, Play, Square, AlertCircle, ChevronDown, ChevronUp, PlusCircle } from 'lucide-react';
import { PTMetrics } from '../hooks/usePTStream';
import { CollapsiblePanel } from './CollapsiblePanel';

// Define interfaces for custom exercises
export interface ExerciseStep {
  instruction: string;
  duration: number; // in seconds
}

export interface CustomExercise {
  id: string;
  name: string;
  description: string;
  steps: ExerciseStep[];
}

interface PTExercisePanelProps {
  metrics: PTMetrics;
  isActive: boolean;
  exerciseType: string | null;
  onStart: (type: string, customExercise?: CustomExercise) => void;
  onStop: () => void;
  isConnected?: boolean;
  isFullscreen?: boolean;
}

// Load custom exercises from localStorage
const loadCustomExercises = (): CustomExercise[] => {
  try {
    const saved = localStorage.getItem('pt-custom-exercises');
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Error loading custom exercises:', err);
    return [];
  }
};

// Save custom exercises to localStorage
const saveCustomExercises = (exercises: CustomExercise[]) => {
  try {
    localStorage.setItem('pt-custom-exercises', JSON.stringify(exercises));
  } catch (err) {
    console.error('Error saving custom exercises:', err);
  }
};

export function PTExercisePanel({ 
  metrics, 
  isActive, 
  exerciseType, 
  onStart, 
  onStop,
  isConnected = false,
  isFullscreen = false
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
  
  // State for custom exercises
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [showCustomExerciseForm, setShowCustomExerciseForm] = useState(false);
  const [showCustomExercises, setShowCustomExercises] = useState(false);
  
  // State for new custom exercise form
  const [newExercise, setNewExercise] = useState<CustomExercise>({
    id: '',
    name: '',
    description: '',
    steps: [{ instruction: '', duration: 30 }]
  });

  // Load custom exercises on component mount
  useEffect(() => {
    setCustomExercises(loadCustomExercises());
  }, []);

  // Handle adding a new step to custom exercise
  const addStep = () => {
    setNewExercise({
      ...newExercise,
      steps: [...newExercise.steps, { instruction: '', duration: 30 }]
    });
  };

  // Handle removing a step from custom exercise
  const removeStep = (index: number) => {
    setNewExercise({
      ...newExercise,
      steps: newExercise.steps.filter((_, i) => i !== index)
    });
  };

  // Handle updating a step
  const updateStep = (index: number, field: 'instruction' | 'duration', value: string | number) => {
    const updatedSteps = [...newExercise.steps];
    updatedSteps[index] = {
      ...updatedSteps[index],
      [field]: value
    };
    setNewExercise({
      ...newExercise,
      steps: updatedSteps
    });
  };

  // Save new custom exercise
  const saveCustomExercise = () => {
    // Generate unique ID if not present
    const exerciseToSave = {
      ...newExercise,
      id: newExercise.id || `custom-${Date.now()}`
    };
    
    const updatedExercises = [...customExercises, exerciseToSave];
    setCustomExercises(updatedExercises);
    saveCustomExercises(updatedExercises);
    
    // Reset form
    setNewExercise({
      id: '',
      name: '',
      description: '',
      steps: [{ instruction: '', duration: 30 }]
    });
    setShowCustomExerciseForm(false);
  };

  // Start a custom exercise
  const startCustomExercise = (exercise: CustomExercise) => {
    onStart(`custom-${exercise.id}`, exercise);
    setShowCustomExercises(false);
  };

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
              <div className="flex space-x-2">
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
                
                {isFullscreen && (
                  <button
                    onClick={() => setShowCustomExercises(!showCustomExercises)}
                    className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-white text-sm"
                  >
                    <span>Custom Exercises</span>
                    {showCustomExercises ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    }
                  </button>
                )}
              </div>
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
          
          {/* Custom exercises list */}
          {!isActive && showCustomExercises && isFullscreen && (
            <div className="mt-3 grid grid-cols-1 gap-2 pt-3 border-t border-gray-700">
              {customExercises.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No custom exercises created yet.</p>
              ) : (
                customExercises.map(exercise => (
                  <button
                    key={exercise.id}
                    onClick={() => startCustomExercise(exercise)}
                    className="flex items-center justify-between px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-sm w-full text-left"
                  >
                    <div>
                      <span className="font-medium">{exercise.name}</span>
                      <p className="text-xs text-gray-300 mt-1">{exercise.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{exercise.steps.length} steps</p>
                    </div>
                    <Play className="w-4 h-4 text-green-400" />
                  </button>
                ))
              )}
              
              <button
                onClick={() => setShowCustomExerciseForm(true)}
                className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-sm w-full mt-2"
              >
                <PlusCircle className="w-4 h-4 text-green-400" />
                <span>Create New Exercise</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Custom exercise form */}
        {showCustomExerciseForm && isFullscreen && (
          <div className="bg-gray-800 p-4 rounded-md mt-4">
            <h3 className="font-semibold mb-4">Create Custom Exercise</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Exercise Name</label>
                <input
                  type="text"
                  value={newExercise.name}
                  onChange={e => setNewExercise({...newExercise, name: e.target.value})}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white"
                  placeholder="Enter exercise name"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={newExercise.description}
                  onChange={e => setNewExercise({...newExercise, description: e.target.value})}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white"
                  rows={2}
                  placeholder="Brief description of the exercise"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-400">Exercise Steps</label>
                  <button
                    onClick={addStep}
                    className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                  >
                    Add Step
                  </button>
                </div>
                
                {newExercise.steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-2 mb-2 p-3 bg-gray-700 rounded">
                    <div className="flex-grow">
                      <div className="flex items-center mb-2">
                        <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={step.instruction}
                          onChange={e => updateStep(index, 'instruction', e.target.value)}
                          className="flex-grow bg-gray-600 rounded px-2 py-1 text-white text-sm"
                          placeholder="Step instruction"
                        />
                      </div>
                      <div className="flex items-center">
                        <label className="text-xs text-gray-400 mr-2">Duration (seconds):</label>
                        <input
                          type="number"
                          min="1"
                          value={step.duration}
                          onChange={e => updateStep(index, 'duration', parseInt(e.target.value))}
                          className="w-16 bg-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeStep(index)}
                      className="text-red-400 hover:text-red-300 p-1"
                      disabled={newExercise.steps.length <= 1}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setShowCustomExerciseForm(false)}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCustomExercise}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white"
                  disabled={!newExercise.name || newExercise.steps.some(step => !step.instruction)}
                >
                  Save Exercise
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Exercise progress information (only when an exercise is active) */}
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