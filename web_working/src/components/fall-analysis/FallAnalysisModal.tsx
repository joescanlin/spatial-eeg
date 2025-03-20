import React, { useState, useEffect } from 'react';
import { FallEvent } from '../../services/FallEventCapture';
import FallAnalysisScene from './FallAnalysisScene';
import { X, Minimize2, Maximize2, ChevronRight, ChevronLeft } from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary';

interface FallAnalysisModalProps {
  fallEvent: FallEvent | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export default function FallAnalysisModal({ fallEvent, isOpen, onClose }: FallAnalysisModalProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'visualization' | 'metrics' | 'recommendations'>('visualization');
  
  // Reset minimized state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setIsMinimized(false);
    }
  }, [isOpen]);

  // Log when the component renders with different props
  useEffect(() => {
    console.log("FallAnalysisModal rendered with:", { 
      isOpen, 
      hasEvent: !!fallEvent, 
      eventId: fallEvent?.id,
      frameCount: fallEvent?.frames?.length || 0,
      fallDetected: fallEvent?.fallDetected
    });
    
    // Add more detailed logging for debugging
    if (fallEvent) {
      if (!fallEvent.frames || fallEvent.frames.length === 0) {
        console.error("FallAnalysisModal received fall event with no frames:", fallEvent);
      } else {
        console.log(`FallAnalysisModal received event with ${fallEvent.frames.length} frames`);
        
        // Verify frames have frame data
        const invalidFrames = fallEvent.frames.filter(frame => !frame.frame || !Array.isArray(frame.frame));
        if (invalidFrames.length > 0) {
          console.error(`Found ${invalidFrames.length} frames with invalid data!`, invalidFrames);
        }
      }
    }
  }, [isOpen, fallEvent]);
  
  // If modal is not open, don't render anything
  if (!isOpen) return null;
  
  // If fall event is undefined, show loading state
  if (!fallEvent) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl w-full">
          <div className="text-white text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg">Loading fall analysis data...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Check for invalid fall event data
  if (!fallEvent.frames || fallEvent.frames.length === 0) {
    console.error("FallAnalysisModal received invalid fall event:", fallEvent);
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white text-xl font-semibold">Fall Analysis</h2>
            <button 
              onClick={onClose}
              className="text-gray-300 hover:text-white p-1 rounded"
            >
              <X size={18} />
            </button>
          </div>
          <div className="text-white text-center py-8">
            <p className="text-lg">No fall event data is available.</p>
            <p className="text-sm text-gray-400 mt-2">Try simulating a fall event again.</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 rounded-lg shadow-xl z-50 overflow-hidden w-64">
        <div className="flex justify-between items-center p-2 bg-gray-700">
          <h3 className="text-white text-sm font-semibold">Fall Analysis</h3>
          <div className="flex space-x-1">
            <button 
              onClick={() => setIsMinimized(false)}
              className="text-gray-300 hover:text-white p-1 rounded"
            >
              <Maximize2 size={16} />
            </button>
            <button 
              onClick={onClose}
              className="text-gray-300 hover:text-white p-1 rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="p-3">
          <div className="text-white text-sm">
            <div><span className="font-semibold">Type:</span> {fallEvent.analysis?.type || 'Unknown'}</div>
            <div><span className="font-semibold">Direction:</span> {fallEvent.analysis?.trajectory?.direction || 'Unknown'}</div>
            <div><span className="font-semibold">Confidence:</span> {(fallEvent.fallProbability * 100).toFixed(0)}%</div>
            <button 
              onClick={() => setIsMinimized(false)}
              className="mt-2 w-full bg-blue-500 text-white text-xs py-1 px-2 rounded"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Normal full view
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-white text-xl font-semibold">Fall Event Analysis</h2>
          <div className="flex space-x-2">
            <button 
              onClick={() => setIsMinimized(true)}
              className="text-gray-300 hover:text-white p-1 rounded"
            >
              <Minimize2 size={18} />
            </button>
            <button 
              onClick={onClose}
              className="text-gray-300 hover:text-white p-1 rounded"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Tabs navigation */}
        <div className="flex border-b border-gray-700">
          <button
            className={`px-4 py-2 text-sm ${selectedTab === 'visualization' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
            onClick={() => setSelectedTab('visualization')}
          >
            3D Visualization
          </button>
          <button
            className={`px-4 py-2 text-sm ${selectedTab === 'metrics' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
            onClick={() => setSelectedTab('metrics')}
          >
            Fall Metrics
          </button>
          <button
            className={`px-4 py-2 text-sm ${selectedTab === 'recommendations' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
            onClick={() => setSelectedTab('recommendations')}
          >
            Recommendations
          </button>
        </div>
        
        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {/* 3D Visualization tab */}
          {selectedTab === 'visualization' && (
            <div className="h-full flex">
              {/* Main 3D visualization */}
              <div className="flex-1 h-full">
                <ErrorBoundary componentName="FallAnalysisScene">
                  <FallAnalysisScene fallEvent={fallEvent} />
                </ErrorBoundary>
              </div>
              
              {/* Sidebar with details */}
              <div className="w-80 border-l border-gray-700 bg-gray-800 p-4 overflow-y-auto">
                <h3 className="text-white text-lg font-semibold mb-3">Fall Details</h3>
                
                <div className="space-y-4">
                  {/* Event info */}
                  <div className="bg-gray-700 rounded-lg p-3">
                    <h4 className="text-blue-300 text-sm font-medium mb-2">Event Information</h4>
                    <div className="space-y-1 text-sm text-white">
                      <div><span className="font-semibold">Timestamp:</span> {new Date(fallEvent.timestamp).toLocaleString()}</div>
                      <div><span className="font-semibold">Fall Type:</span> {fallEvent.analysis?.type || 'Unknown'}</div>
                      <div><span className="font-semibold">Direction:</span> {fallEvent.analysis?.trajectory?.direction || 'Unknown'}</div>
                      <div><span className="font-semibold">Confidence:</span> {(fallEvent.fallProbability * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                  
                  {/* Impact sequence */}
                  <div className="bg-gray-700 rounded-lg p-3">
                    <h4 className="text-blue-300 text-sm font-medium mb-2">Impact Sequence</h4>
                    <div className="space-y-1 text-sm text-white">
                      {fallEvent.analysis?.bodyImpactSequence?.map((part, idx) => (
                        <div key={idx} className="flex items-center">
                          <span className="w-5 h-5 flex items-center justify-center bg-gray-600 rounded-full mr-2 text-xs">{idx + 1}</span>
                          <span className="capitalize">{part.name}</span>
                        </div>
                      )) || <div>No impact data available</div>}
                    </div>
                  </div>
                  
                  {/* Balance metrics */}
                  <div className="bg-gray-700 rounded-lg p-3">
                    <h4 className="text-blue-300 text-sm font-medium mb-2">Balance Metrics</h4>
                    <div className="space-y-2 text-sm text-white">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Pre-Fall Stability:</span>
                          <span>{((fallEvent.analysis?.balanceMetrics?.preFailStabilityScore || 0) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-1.5">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full" 
                            style={{ width: `${(fallEvent.analysis?.balanceMetrics?.preFailStabilityScore || 0) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Asymmetry Index:</span>
                          <span>{((fallEvent.analysis?.balanceMetrics?.asymmetryIndex || 0) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-1.5">
                          <div 
                            className="bg-orange-500 h-1.5 rounded-full" 
                            style={{ width: `${(fallEvent.analysis?.balanceMetrics?.asymmetryIndex || 0) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Metrics tab - simplified for now */}
          {selectedTab === 'metrics' && (
            <div className="p-6 h-full overflow-y-auto text-white">
              <h3 className="text-xl font-semibold mb-4">Detailed Fall Metrics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fall characteristics */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-medium mb-3 text-blue-300">Fall Characteristics</h4>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="py-2 font-medium">Type:</td>
                        <td>{fallEvent.analysis?.type || 'Unknown'}</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Direction:</td>
                        <td>{fallEvent.analysis?.trajectory?.direction || 'Unknown'}</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Velocity:</td>
                        <td>{fallEvent.analysis?.trajectory?.velocity.toFixed(2) || 'Unknown'} ft/s</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Impact Points:</td>
                        <td>{fallEvent.analysis?.trajectory?.impactPoints?.length || 0}</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Confidence:</td>
                        <td>{(fallEvent.fallProbability * 100).toFixed(0)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Simple recommendations placeholder */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-medium mb-3 text-blue-300">Fall Analysis Summary</h4>
                  <p className="text-sm text-gray-200 mb-3">
                    Based on the analysis of this fall event, we've identified the following key metrics and observations:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-200 space-y-2">
                    <li>Fall type: <span className="text-white">{fallEvent.analysis?.type || 'Unknown'}</span></li>
                    <li>Direction: <span className="text-white">{fallEvent.analysis?.trajectory?.direction || 'Unknown'}</span></li>
                    <li>Impact sequence: <span className="text-white">{fallEvent.analysis?.bodyImpactSequence?.length || 0} points of impact</span></li>
                    <li>Event duration: <span className="text-white">{fallEvent.frames.length / 15} seconds</span></li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* Recommendations tab */}
          {selectedTab === 'recommendations' && (
            <div className="p-6 h-full overflow-y-auto text-white">
              <h3 className="text-xl font-semibold mb-4">Safety Recommendations</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-medium mb-3 text-blue-300">Fall Prevention Suggestions</h4>
                  <ul className="list-disc list-inside text-sm text-gray-200 space-y-2">
                    <li>Consider environmental modifications to reduce trip hazards</li>
                    <li>Balance training exercises may help improve stability</li>
                    <li>Review medication that may affect balance or cause dizziness</li>
                    <li>Ensure proper lighting in all areas, especially at night</li>
                  </ul>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-medium mb-3 text-blue-300">Follow-up Actions</h4>
                  <ul className="list-disc list-inside text-sm text-gray-200 space-y-2">
                    <li>Schedule a follow-up assessment to evaluate gait patterns</li>
                    <li>Consider a home safety evaluation</li>
                    <li>Review fall history for patterns or recurring issues</li>
                    <li>Discuss with healthcare provider if falls are becoming more frequent</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 