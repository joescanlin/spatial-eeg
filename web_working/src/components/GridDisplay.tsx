import React, { useState, useEffect } from 'react';
import { GridData } from '../types/grid';
import { Activity, Box } from 'lucide-react';
import clsx from 'clsx';
import Grid3DContainer from './3d/Grid3DContainer';
import { fallEventCapture } from '../services/FallEventCapture';
import FallAnalysisModal from './fall-analysis/FallAnalysisModal';
import ErrorBoundary from './ErrorBoundary';

interface GridDisplayProps {
  data: GridData;
}

export function GridDisplay({ data }: GridDisplayProps) {
  // State for 3D visualization toggle
  const [show3D, setShow3D] = useState(false);
  // State for fall analysis modal
  const [showFallAnalysis, setShowFallAnalysis] = useState(false);
  // Track if a fall has been processed
  const [fallProcessed, setFallProcessed] = useState(false);
  // Track current fall event - initialize as undefined, not auto-creating a fall event
  const [currentFallEvent, setCurrentFallEvent] = useState<undefined | any>(undefined);
  
  // Add data to fall event capture service
  useEffect(() => {
    try {
      // Add frame to the fall event capture service
      fallEventCapture.addFrame(data);
      
      // Show fall analysis when a fall is detected and not yet processed
      if (data.fallDetected && !fallProcessed) {
        console.log('Fall detected! Opening analysis modal...');
        // Wait a bit for the fall data to be processed
        setTimeout(() => {
          const fallEvent = fallEventCapture.getFallEvents().length > 0 
            ? fallEventCapture.getFallEvents()[fallEventCapture.getFallEvents().length - 1] 
            : undefined;
          
          if (fallEvent) {
            setCurrentFallEvent(fallEvent);
            setShowFallAnalysis(true);
            setFallProcessed(true);
          }
        }, 2000); // 2 second delay for dramatic effect
      } else if (!data.fallDetected) {
        // Reset processed state when no fall is detected
        setFallProcessed(false);
      }
    } catch (error) {
      console.error("Error processing frame data:", error);
    }
  }, [data, fallProcessed]);

  // This useEffect checks if there's a fall event available
  useEffect(() => {
    try {
      const checkForFallEvent = () => {
        // Only check if fall events actually exist
        if (fallEventCapture.getFallEvents().length > 0) {
          const recentFall = fallEventCapture.getFallEvents()[fallEventCapture.getFallEvents().length - 1];
          if (recentFall && !showFallAnalysis && !fallProcessed) {
            console.log('Recent fall event found! Opening analysis modal...', recentFall);
            setCurrentFallEvent(recentFall);
            setShowFallAnalysis(true);
            setFallProcessed(true);
          }
        }
      };

      // Check immediately
      checkForFallEvent();

      // Also set up a small interval to check for fall events
      const intervalId = setInterval(checkForFallEvent, 1000);
      return () => clearInterval(intervalId);
    } catch (error) {
      console.error("Error checking for fall events:", error);
    }
  }, [showFallAnalysis, fallProcessed]);
  
  // Helper function to get color based on sensor value
  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-700';
    if (value < 0.3) return 'bg-blue-400/50';
    if (value < 0.6) return 'bg-blue-400/75';
    return 'bg-blue-400';
  };

  const handleOpenAnalysis = () => {
    try {
      if (fallEventCapture.getFallEvents().length > 0) {
        const fallEvent = fallEventCapture.getFallEvents()[fallEventCapture.getFallEvents().length - 1];
        if (fallEvent) {
          console.log('Manually opening fall analysis with event:', fallEvent);
          setCurrentFallEvent(fallEvent);
          setShowFallAnalysis(true);
          setFallProcessed(true);
          return;
        }
      }
      
      // If no fall events found, try simulating one
      console.log('No fall events found. Simulating a fall event...');
      const simulatedEvent = fallEventCapture.simulateFallEvent();
      setCurrentFallEvent(simulatedEvent);
      setShowFallAnalysis(true);
      setFallProcessed(true);
    } catch (error) {
      console.error("Error opening analysis:", error);
      alert("Error analyzing fall data. Please try again.");
    }
  };

  const handleCloseModal = () => {
    setShowFallAnalysis(false);
  };

  return (
    <div className="relative bg-gray-900 rounded-lg p-4 h-full w-full">
      {/* Toggle button for 2D/3D visualization */}
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={() => setShow3D(!show3D)}
          className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded text-xs',
            show3D ? 'bg-blue-500' : 'bg-gray-700'
          )}
        >
          <Box size={12} />
          <span>{show3D ? '3D' : '2D'}</span>
        </button>
      </div>
      
      {/* 2D Grid Visualization */}
      {!show3D && (
        <div className="grid grid-cols-12 gap-1 aspect-[12/15] h-full">
          {data.frame.map((row, i) =>
            row.map((value, j) => (
              <div
                key={`${i}-${j}`}
                className={clsx(
                  'rounded transition-colors duration-200',
                  getColor(value)
                )}
              />
            ))
          )}
        </div>
      )}
      
      {/* 3D Visualization */}
      <div className={clsx(
        'absolute inset-0 transition-opacity duration-300',
        show3D ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        <Grid3DContainer data={data} isVisible={show3D} />
      </div>
      
      {/* Fall detection overlay */}
      {data.fallDetected && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-red-500/20 backdrop-blur-sm cursor-pointer"
          onClick={handleOpenAnalysis}
        >
          <div className="bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2">
            <Activity className="animate-pulse" />
            <span className="font-semibold">Fall Detected!</span>
            <span className="text-sm opacity-75">
              ({(data.fallProbability * 100).toFixed(0)}% confidence)
            </span>
          </div>
          
          <div className="absolute bottom-4 w-full text-center text-white text-sm">
            Click for detailed analysis
          </div>
        </div>
      )}
      
      {/* Open Analysis Button - Positioned at top-left corner */}
      <div className="absolute top-0 left-0 z-20 m-2">
        <button
          onClick={handleOpenAnalysis}
          className="bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold py-1.5 px-3 rounded shadow-md"
        >
          Open Analysis
        </button>
      </div>
      
      {/* Fall Analysis Modal with Error Boundary */}
      {currentFallEvent && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-white text-xl font-semibold">Error in Fall Analysis</h2>
                  <button 
                    onClick={handleCloseModal}
                    className="text-gray-300 hover:text-white p-1 rounded"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
                <div className="text-white p-4 bg-red-900/20 rounded-md">
                  <p className="mb-4">There was an error displaying the fall analysis.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          }
        >
          <FallAnalysisModal 
            fallEvent={currentFallEvent} 
            isOpen={showFallAnalysis} 
            onClose={handleCloseModal} 
          />
        </ErrorBoundary>
      )}
    </div>
  );
}