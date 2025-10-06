import React from 'react';
import { Play, Square, CheckCircle, Clock, Target, Info } from 'lucide-react';
import { BalancePhase } from '../hooks/useBalanceTraining';

interface BalanceStep {
  id: string;
  title: string;
  instruction: string;
  detail: string;
  duration: number;
  phase: string;
  metrics_focus: string[];
}

interface Props {
  phase: BalancePhase;
  currentStep: BalanceStep | null;
  stepIndex: number;
  totalSteps: number;
  progress: number;
  elapsed: number;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  onProceed: () => void;
  sessionId: number | null;
}

export function BalanceTrainingGuide({ 
  phase, 
  currentStep, 
  stepIndex, 
  totalSteps, 
  progress, 
  elapsed,
  onStart, 
  onStop, 
  onCancel,
  onProceed,
  sessionId 
}: Props) {
  
  // Don't render anything when idle
  if (phase === 'idle') {
    return null;
  }
  
  // Introduction screen
  if (phase === 'introduction') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-8 h-8 text-blue-500" />
            <h2 className="text-2xl font-bold text-white">Balance Training Assessment</h2>
          </div>
          
          <div className="space-y-4 text-gray-300">
            <p className="text-lg">
              Welcome to the guided balance assessment. This comprehensive evaluation will test your balance and stability through various challenges.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold text-white mb-2">What to Expect:</h3>
                <ul className="text-sm space-y-1">
                  <li>• {totalSteps} different balance challenges</li>
                  <li>• Approximately 2 minutes total</li>
                  <li>• Clear audio and visual instructions</li>
                  <li>• Real-time safety monitoring</li>
                </ul>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold text-white mb-2">Safety Notes:</h3>
                <ul className="text-sm space-y-1">
                  <li>• Stand near a wall or chair for support</li>
                  <li>• Stop immediately if you feel unsafe</li>
                  <li>• Follow instructions at your own pace</li>
                  <li>• Ask for assistance if needed</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-900 bg-opacity-50 p-4 rounded-lg border border-blue-600">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-blue-400">Assessment Protocol</span>
              </div>
              <p className="text-sm text-blue-200">
                This assessment follows evidence-based balance evaluation protocols. 
                Your performance will be measured using center of pressure, sway velocity, 
                and stability metrics to provide comprehensive balance analysis.
              </p>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onProceed}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Begin Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active assessment screen
  if (phase === 'active' && currentStep) {
    const remainingTime = currentStep.duration - elapsed;
    const isLastStep = stepIndex === totalSteps - 1;
    
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-6 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">
              Step {stepIndex + 1} of {totalSteps}
            </span>
          </div>
          <div className="text-lg font-bold text-white">
            {remainingTime}s
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-700 h-3 rounded-full mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-full rounded-full transition-all duration-1000" 
            style={{ width: `${progress * 100}%` }} 
          />
        </div>

        {/* Step content */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">
              {currentStep.title}
            </h3>
            <p className="text-lg text-blue-300 font-medium">
              {currentStep.instruction}
            </p>
          </div>
          
          <div className="bg-gray-700 p-3 rounded-lg">
            <p className="text-sm text-gray-300">
              {currentStep.detail}
            </p>
          </div>

          {/* Metrics focus */}
          <div className="bg-blue-900 bg-opacity-30 p-3 rounded-lg border border-blue-600">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-blue-400 uppercase">
                Measuring: {currentStep.phase}
              </span>
            </div>
            <p className="text-xs text-blue-200">
              Focus metrics: {currentStep.metrics_focus.join(', ')}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={onStop}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>
          
          <div className="text-center">
            <div className="text-xs text-gray-400">Session ID</div>
            <div className="text-xs font-mono text-gray-500">{sessionId}</div>
          </div>
        </div>
      </div>
    );
  }

  // Completion screen
  if (phase === 'completed') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg shadow-lg max-w-lg w-full p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Assessment Complete!</h2>
          <p className="text-gray-300 mb-4">
            Excellent work! Your balance assessment has been completed and all data has been saved to your patient record.
          </p>
          
          <div className="bg-gray-700 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-white mb-2">Assessment Summary</h3>
            <div className="text-sm text-gray-300 space-y-1">
              <div>Steps Completed: {totalSteps}</div>
              <div>Session ID: {sessionId}</div>
              <div>Data Collection: Balance metrics, stability scores, sway analysis</div>
            </div>
          </div>
          
          <button
            onClick={onStop}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Return to Session
          </button>
        </div>
      </div>
    );
  }

  return null;
}
