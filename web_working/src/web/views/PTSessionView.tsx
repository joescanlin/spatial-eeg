import React, { useState, useEffect } from 'react';
import PTSessionControl from '../../components/PTSessionControl';
import PatientSelectionModal from '../../components/PatientSelectionModal';
import PTSessionNotes from '../../components/PTSessionNotes';
import PTSessionSummary from '../../components/PTSessionSummary';
import PTMetricSelector from '../../components/PTMetricSelector';
import CadenceMetric from '../../components/metrics/CadenceMetric';
import StanceTimeMetric from '../../components/metrics/StanceTimeMetric';
import StepLengthSymmetryMetric from '../../components/metrics/StepLengthSymmetryMetric';
import GaitVariabilityMetric from '../../components/metrics/GaitVariabilityMetric';
import { GridDisplay } from '../../components/GridDisplay';
import { usePTSession } from '../../hooks/usePTSession';
import { useDataStream } from '../../hooks/useDataStream';
import { PTExercisePanel, CustomExercise } from '../../components/PTExercisePanel';
import { usePTStream } from '../../hooks/usePTStream';
import { ChevronRight, ChevronLeft, LayoutGrid, Maximize2, Clock } from 'lucide-react';
import { useBalanceTraining } from '../../hooks/useBalanceTraining';
import { BalanceTrainingGuide } from '../../components/BalanceTrainingGuide';

// Exercise Step Guide component
interface ExerciseStepGuideProps {
  exercise: CustomExercise;
  currentStep: number;
  timeRemaining: number;
  onStepComplete: () => void;
  onStop: () => void;
}

const ExerciseStepGuide: React.FC<ExerciseStepGuideProps> = ({ 
  exercise, 
  currentStep, 
  timeRemaining, 
  onStepComplete,
  onStop
}) => {
  const step = exercise.steps[currentStep];
  const progress = (step.duration - timeRemaining) / step.duration * 100;
  
  return (
    <div className="bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-700 w-full max-w-md">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg">{exercise.name}</h3>
        <button 
          onClick={onStop}
          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
        >
          Stop
        </button>
      </div>
      
      <div className="text-sm text-gray-300 mb-4">
        {exercise.description}
      </div>
      
      <div className="bg-gray-700 p-3 rounded mb-3">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">
              {currentStep + 1}
            </span>
            <span className="font-medium">
              Step {currentStep + 1} of {exercise.steps.length}
            </span>
          </div>
          <div className="flex items-center text-gray-300">
            <Clock className="w-4 h-4 mr-1" />
            <span>{timeRemaining}s</span>
          </div>
        </div>
        
        <p className="mb-3 text-white">{step.instruction}</p>
        
        <div className="w-full bg-gray-600 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-blue-500 h-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-400">
        <div>
          {currentStep > 0 && (
            <span>Previous: {exercise.steps[currentStep - 1].instruction}</span>
          )}
        </div>
        <div>
          {currentStep < exercise.steps.length - 1 && (
            <span>Next: {exercise.steps[currentStep + 1].instruction}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function PTSessionView() {
  const { gridData, stats } = useDataStream('pt-session');
  const {
    ptMetrics,
    isExerciseActive,
    exerciseType,
    isConnected,
    startExercise,
    stopExercise
  } = usePTStream('pt-session');

  const {
    selectedPatient,
    isSessionActive,
    sessionDuration,
    sessionNotes,
    sessionMetrics,
    selectedMetrics,
    isModalOpen,
    isLoading,
    error,
    selectPatient,
    openPatientSelection,
    closePatientSelection,
    startSession,
    endSession,
    updateSessionNotes,
    toggleMetric,
    stanceTimeData,
    stepLengthSymmetryData,
    cadenceVariabilityData
  } = usePTSession();
  
  const balanceTraining = useBalanceTraining(selectedPatient?.id ?? null);

  // State for custom exercise
  const [activeCustomExercise, setActiveCustomExercise] = useState<CustomExercise | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Handle starting a custom exercise
  const handleStartExercise = (type: string, customExercise?: CustomExercise) => {
    startExercise(type);
    
    if (customExercise) {
      setActiveCustomExercise(customExercise);
      setCurrentStep(0);
      setTimeRemaining(customExercise.steps[0].duration);
    } else if (type === 'balance') {
      balanceTraining.start();
    }
  };

  // Handle stopping an exercise
  const handleStopExercise = () => {
    stopExercise();
    balanceTraining.stop();
    setActiveCustomExercise(null);
    setCurrentStep(0);
    setTimeRemaining(0);
  };
  
  // Timer effect for custom exercise steps
  useEffect(() => {
    if (!activeCustomExercise || !isExerciseActive) return;
    
    const timerId = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Move to next step or complete exercise
          if (currentStep < activeCustomExercise.steps.length - 1) {
            setCurrentStep(prev => {
              const nextStep = prev + 1;
              setTimeRemaining(activeCustomExercise.steps[nextStep].duration);
              return nextStep;
            });
          } else {
            // Exercise complete
            stopExercise();
            setActiveCustomExercise(null);
            setCurrentStep(0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timerId);
  }, [activeCustomExercise, isExerciseActive, currentStep, stopExercise]);
  
  // Helper to advance to next step manually
  const handleStepComplete = () => {
    if (!activeCustomExercise) return;
    
    if (currentStep < activeCustomExercise.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setTimeRemaining(activeCustomExercise.steps[currentStep + 1].duration);
    } else {
      // Exercise complete
      stopExercise();
      setActiveCustomExercise(null);
      setCurrentStep(0);
    }
  };
  
  // Add logging to track session state
  useEffect(() => {
    console.log("PTSessionView: isSessionActive changed:", isSessionActive);
    console.log("PTSessionView: sessionMetrics count:", sessionMetrics.length);
  }, [isSessionActive, sessionMetrics.length]);
  
  // Handle "Select Patient" button click
  const handlePatientButtonClick = () => {
    console.log("PTSessionView: Select patient button clicked");
    openPatientSelection();
  };
  
  // Get latest cadence value and status
  const getLatestCadenceData = () => {
    if (sessionMetrics.length === 0) {
      return { value: 0, status: 'none' as const };
    }
    
    const lastMetric = sessionMetrics[sessionMetrics.length - 1];
    return {
      value: lastMetric.cadence,
      status: lastMetric.metricStatus?.cadence || 'none' as const
    };
  };
  
  const cadenceData = getLatestCadenceData();
  
  // Handle session start with additional logging
  const handleStartSession = () => {
    console.log("PTSessionView: Start session initiated");
    startSession();
  };
  
  // Handle session end with additional logging
  const handleEndSession = () => {
    console.log("PTSessionView: End session initiated");
    endSession();
  };
  
  // Add debugging for grid data
  useEffect(() => {
    console.log("PTSessionView - Grid data updated:", {
      hasFrame: Boolean(gridData?.frame),
      frameSize: gridData?.frame?.length,
      activeSensors: stats?.activeSensors,
      connectionStatus: stats?.connectionStatus
    });
  }, [gridData, stats]);
  
  // State for collapsing sidebar and metrics panel
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  
  // State for expanded metric (for mobile view)
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  
  // Toggle expanded metric
  const toggleExpandMetric = (metricId: string) => {
    if (expandedMetric === metricId) {
      setExpandedMetric(null);
    } else {
      setExpandedMetric(metricId);
    }
  };
  
  // State for full-screen metric selector
  const [metricSelectorFullscreen, setMetricSelectorFullscreen] = useState(false);
  
  // State for full-screen exercise panel
  const [exercisePanelFullscreen, setExercisePanelFullscreen] = useState(false);

  // Debug output
  console.log("PTSessionView rendering:", { 
    isSessionActive, 
    sessionDuration, 
    metricsCount: sessionMetrics.length,
    patient: selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : "none"
  });

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">PT Session Management</h1>
      </div>
      
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-lg">
          <div className="font-bold">Error</div>
          <div>{error}</div>
        </div>
      )}
      
      {/* Session status banner */}
      {isSessionActive && selectedPatient && (
        <div className="bg-blue-900/30 border border-blue-800 text-blue-200 px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold">Active Session with {selectedPatient.first_name} {selectedPatient.last_name}</span>
              <span className="ml-4 text-sm">
                Duration: {Math.floor(sessionDuration / 60)}:{(sessionDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="animate-pulse bg-blue-500 h-2 w-2 rounded-full"></div>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-300">Processing...</span>
          </div>
        </div>
      )}
      
      {/* Three-column layout */}
      <div className="flex">
        {/* Left Sidebar - can be collapsed */}
        <div className={`${leftSidebarCollapsed ? 'w-12' : 'w-80'} transition-all duration-300 flex-shrink-0 relative`}>
          {/* Toggle button */}
          <button 
            className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-gray-700 rounded-full p-1 z-10"
            onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
          >
            {leftSidebarCollapsed ? 
              <ChevronRight className="w-4 h-4 text-gray-300" /> : 
              <ChevronLeft className="w-4 h-4 text-gray-300" />
            }
          </button>
          
          {/* Sidebar content */}
          <div className={`space-y-4 pr-4 ${leftSidebarCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'} transition-opacity duration-300`}>
            <PTSessionControl
              selectedPatient={selectedPatient}
              isSessionActive={isSessionActive}
              sessionDuration={sessionDuration}
              onSelectPatient={handlePatientButtonClick}
              onStartSession={handleStartSession}
              onEndSession={handleEndSession}
            />
            
            {/* Metric Selector with fullscreen capability */}
            <div className="relative">
              <div 
                className="cursor-pointer" 
                onClick={() => setMetricSelectorFullscreen(true)}
              >
                <PTMetricSelector
                  selectedMetrics={selectedMetrics}
                  onToggleMetric={toggleMetric}
                  isSessionActive={isSessionActive}
                />
              </div>
              
              {/* Button to expand to fullscreen */}
              <button 
                className="absolute top-3 right-3 bg-gray-700 hover:bg-gray-600 rounded p-1"
                onClick={() => setMetricSelectorFullscreen(true)}
              >
                <LayoutGrid className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            
            {/* PT Exercise Panel with fullscreen capability */}
            <div className="relative">
              <div className="cursor-pointer">
                <PTExercisePanel
                  metrics={ptMetrics}
                  isActive={isExerciseActive}
                  exerciseType={exerciseType}
                  onStart={handleStartExercise}
                  onStop={handleStopExercise}
                  isConnected={isConnected}
                  isFullscreen={false}
                />
              </div>
              
              {/* Button to expand exercise panel to fullscreen */}
              <button 
                className="absolute top-3 right-3 bg-gray-700 hover:bg-gray-600 rounded p-1"
                onClick={() => setExercisePanelFullscreen(true)}
              >
                <Maximize2 className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            
            <PTSessionNotes
              value={sessionNotes}
              onChange={updateSessionNotes}
              isSessionActive={isSessionActive}
              disabled={isLoading}
            />
          </div>
        </div>
        
        {/* Main content - grid display */}
        <div className={`flex-grow transition-all duration-300 ${rightPanelCollapsed ? 'mr-0' : 'mr-0 lg:mr-80'}`}>
          <div className="h-[700px] relative">
            <GridDisplay data={gridData} />
            <div className="absolute top-4 right-4">
              {/* Show Balance Training Guide or Custom Exercise Guide based on what's active */}
              {balanceTraining.active && (
                <BalanceTrainingGuide
                  active={balanceTraining.active}
                  stepText={balanceTraining.stepText}
                  progress={balanceTraining.progress}
                  onStop={balanceTraining.stop}
                />
              )}
              
              {activeCustomExercise && isExerciseActive && (
                <ExerciseStepGuide
                  exercise={activeCustomExercise}
                  currentStep={currentStep}
                  timeRemaining={timeRemaining}
                  onStepComplete={handleStepComplete}
                  onStop={handleStopExercise}
                />
              )}
            </div>
          </div>
          
          {/* Session metrics summary - below grid */}
          <div className="mt-6">
            <PTSessionSummary
              metrics={sessionMetrics}
              isSessionActive={isSessionActive}
              selectedMetrics={selectedMetrics}
            />
          </div>
        </div>
        
        {/* Right Panel - Metrics display (hidden on mobile) */}
        <div className={`hidden lg:block fixed right-0 top-0 bottom-0 ${rightPanelCollapsed ? 'translate-x-full' : 'translate-x-0'} w-80 bg-gray-900 p-6 pt-24 overflow-y-auto transition-transform duration-300 shadow-lg border-l border-gray-800 z-20`}>
          {/* Toggle button */}
          <button 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-gray-700 rounded-full p-1"
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          >
            {rightPanelCollapsed ? 
              <ChevronLeft className="w-4 h-4 text-gray-300" /> : 
              <ChevronRight className="w-4 h-4 text-gray-300" />
            }
          </button>
          
          {/* Metrics components */}
          <div className="space-y-6">
            {selectedMetrics.includes('cadence') && (
              <CadenceMetric 
                value={cadenceData.value}
                status={cadenceData.status}
                isSessionActive={isSessionActive}
              />
            )}
            
            {selectedMetrics.includes('stanceTime') && (
              <StanceTimeMetric 
                data={stanceTimeData}
                isSessionActive={isSessionActive}
              />
            )}
            
            {selectedMetrics.includes('stepLengthSymmetry') && (
              <StepLengthSymmetryMetric 
                data={stepLengthSymmetryData}
                isSessionActive={isSessionActive}
              />
            )}
            
            {selectedMetrics.includes('gaitVariability') && (
              <GaitVariabilityMetric 
                data={cadenceVariabilityData}
                isSessionActive={isSessionActive}
              />
            )}
          </div>
        </div>
        
        {/* Mobile metrics panel - Show as expandable cards below grid */}
        <div className="lg:hidden mt-6 space-y-4">
          {selectedMetrics.includes('cadence') && (
            <div className={expandedMetric === 'cadence' ? 'block' : 'overflow-hidden max-h-20'}>
              <div 
                className="cursor-pointer bg-gray-800 rounded-lg p-4"
                onClick={() => toggleExpandMetric('cadence')}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Cadence</h3>
                  <span className="text-lg font-bold">{Math.round(cadenceData.value)} steps/min</span>
                </div>
                
                {expandedMetric === 'cadence' && (
                  <div className="mt-4">
                    <CadenceMetric 
                      value={cadenceData.value}
                      status={cadenceData.status}
                      isSessionActive={isSessionActive}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {selectedMetrics.includes('stanceTime') && (
            <div className={expandedMetric === 'stanceTime' ? 'block' : 'overflow-hidden max-h-20'}>
              <div 
                className="cursor-pointer bg-gray-800 rounded-lg p-4"
                onClick={() => toggleExpandMetric('stanceTime')}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Step/Stance Time</h3>
                  <span className="text-lg font-bold">{Math.round(stanceTimeData.asymmetryPercent)}% Asymmetry</span>
                </div>
                
                {expandedMetric === 'stanceTime' && (
                  <div className="mt-4">
                    <StanceTimeMetric 
                      data={stanceTimeData}
                      isSessionActive={isSessionActive}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {selectedMetrics.includes('stepLengthSymmetry') && (
            <div className={expandedMetric === 'stepLengthSymmetry' ? 'block' : 'overflow-hidden max-h-20'}>
              <div 
                className="cursor-pointer bg-gray-800 rounded-lg p-4"
                onClick={() => toggleExpandMetric('stepLengthSymmetry')}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Step-Length Symmetry</h3>
                  <span className="text-lg font-bold">{Math.round(stepLengthSymmetryData.symmetryPercent)}%</span>
                </div>
                
                {expandedMetric === 'stepLengthSymmetry' && (
                  <div className="mt-4">
                    <StepLengthSymmetryMetric 
                      data={stepLengthSymmetryData}
                      isSessionActive={isSessionActive}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {selectedMetrics.includes('gaitVariability') && (
            <div className={expandedMetric === 'gaitVariability' ? 'block' : 'overflow-hidden max-h-20'}>
              <div 
                className="cursor-pointer bg-gray-800 rounded-lg p-4"
                onClick={() => toggleExpandMetric('gaitVariability')}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Gait Variability</h3>
                  <span className="text-lg font-bold">
                    {cadenceVariabilityData.isReliable ? 
                      `${cadenceVariabilityData.coefficientOfVariation.toFixed(1)}% CV` : 
                      "Collecting data..."}
                  </span>
                </div>
                
                {expandedMetric === 'gaitVariability' && (
                  <div className="mt-4">
                    <GaitVariabilityMetric 
                      data={cadenceVariabilityData}
                      isSessionActive={isSessionActive}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Patient selection modal */}
      <PatientSelectionModal
        isOpen={isModalOpen}
        onClose={closePatientSelection}
        onSelectPatient={selectPatient}
      />
      
      {/* Fullscreen metric selector modal */}
      {metricSelectorFullscreen && (
        <div className="fixed inset-0 bg-gray-900/95 z-50 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Metric Selection</h2>
              <button 
                className="bg-gray-800 hover:bg-gray-700 rounded-full p-2"
                onClick={() => setMetricSelectorFullscreen(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <PTMetricSelector
              selectedMetrics={selectedMetrics}
              onToggleMetric={toggleMetric}
              isSessionActive={isSessionActive}
            />
            
            <div className="mt-6 flex justify-end">
              <button 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
                onClick={() => setMetricSelectorFullscreen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Fullscreen exercise panel modal */}
      {exercisePanelFullscreen && (
        <div className="fixed inset-0 bg-gray-900/95 z-50 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">PT Exercise Control</h2>
              <button 
                className="bg-gray-800 hover:bg-gray-700 rounded-full p-2"
                onClick={() => setExercisePanelFullscreen(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg">
              <PTExercisePanel
                metrics={ptMetrics}
                isActive={isExerciseActive}
                exerciseType={exerciseType}
                onStart={handleStartExercise}
                onStop={handleStopExercise}
                isConnected={isConnected}
                isFullscreen={true}
              />
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
                onClick={() => setExercisePanelFullscreen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 