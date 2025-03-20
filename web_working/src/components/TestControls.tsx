import React, { useState, useEffect } from 'react';
import { fallEventCapture } from '../services/FallEventCapture';
import { FallEvent } from '../services/FallEventCapture';
import FallAnalysisModal from './fall-analysis/FallAnalysisModal';
import ErrorBoundary from './ErrorBoundary';

export default function TestControls() {
  const [showModal, setShowModal] = useState(false);
  const [currentFallEvent, setCurrentFallEvent] = useState<any>(undefined);
  const [trainingFiles, setTrainingFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [trainingSequences, setTrainingSequences] = useState<FallEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load training files on component mount
  useEffect(() => {
    fetchTrainingFiles();
  }, []);

  // Fetch available training files
  const fetchTrainingFiles = async () => {
    try {
      const response = await fetch('/api/training-sequences');
      const data = await response.json();
      
      if (data.files && Array.isArray(data.files)) {
        setTrainingFiles(data.files);
      }
    } catch (error) {
      console.error('Error fetching training files:', error);
    }
  };

  // Load sequences from a specific file
  const loadTrainingSequences = async (filename: string) => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      const response = await fetch(`/api/training-sequence/${filename}`);
      const data = await response.json();
      
      if (data.sequences && Array.isArray(data.sequences)) {
        setTrainingSequences(data.sequences);
        setSelectedFile(filename);
        
        // If we have at least one sequence, select the first one
        if (data.sequences.length > 0) {
          setCurrentFallEvent(data.sequences[0]);
          setShowModal(true);
        }
      } else {
        setLoadError('No valid sequences found in this file');
      }
    } catch (error) {
      console.error('Error loading training sequences:', error);
      setLoadError('Failed to load training sequences');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate a simulated fall event
  const generateFallEvent = (type: 'forward' | 'backward' | 'left' | 'right') => {
    try {
      console.log(`Generating ${type} fall simulation...`);
      
      // Generate a simulated fall event using the service
      const generatedEvent = fallEventCapture.simulateFallEvent(type);
      
      // Add debugging
      console.log("Generated fall event:", generatedEvent);
      console.log("Frame count:", generatedEvent?.frames?.length || 0);
      
      // Verify the event has frames before showing modal
      if (!generatedEvent || !generatedEvent.frames || generatedEvent.frames.length === 0) {
        console.error("Generated fall event is missing frames!");
        alert("Error generating fall event. See console for details.");
        return;
      }
      
      // Set as current fall event and show modal
      setCurrentFallEvent(generatedEvent);
      setShowModal(true);
    } catch (error) {
      console.error('Error generating fall event:', error);
      alert(`Error generating fall event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Close the modal
  const handleClose = () => {
    setShowModal(false);
  };

  // Select a specific training sequence
  const selectTrainingSequence = (sequence: FallEvent) => {
    setCurrentFallEvent(sequence);
    setShowModal(true);
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-lg text-gray-200">
      <h2 className="text-lg mb-4 font-semibold">Fall Event Testing</h2>
      
      {/* Real Training Data */}
      <div className="mb-6 border-b border-gray-700 pb-4">
        <h3 className="text-md font-semibold mb-2">Real Training Data</h3>
        
        {/* File Selection */}
        <div className="mb-3">
          <label className="block text-sm mb-1">Select Training File:</label>
          <div className="flex space-x-2">
            <select 
              className="bg-gray-700 text-white rounded px-3 py-1 text-sm flex-1"
              onChange={e => e.target.value && loadTrainingSequences(e.target.value)}
              value={selectedFile || ''}
            >
              <option value="">-- Select a file --</option>
              {trainingFiles.map(file => (
                <option key={file} value={file}>{file}</option>
              ))}
            </select>
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1 text-sm"
              onClick={fetchTrainingFiles}
            >
              Refresh
            </button>
          </div>
        </div>
        
        {/* Loading state */}
        {isLoading && (
          <div className="text-sm text-gray-400 mb-2">Loading sequences...</div>
        )}
        
        {/* Error state */}
        {loadError && (
          <div className="text-sm text-red-400 mb-2">{loadError}</div>
        )}
        
        {/* Sequence listing */}
        {trainingSequences.length > 0 && (
          <div className="mb-2">
            <div className="text-sm font-semibold mb-1">Available Sequences:</div>
            <div className="grid grid-cols-2 gap-2">
              {trainingSequences.map((sequence, index) => (
                <button
                  key={sequence.id}
                  className={`text-left px-2 py-1 text-xs rounded ${
                    sequence.fallDetected ? 'bg-red-900/50 hover:bg-red-800/50' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  onClick={() => selectTrainingSequence(sequence)}
                >
                  <div className="font-semibold">{sequence.analysis?.type || 'Unknown'} #{index+1}</div>
                  <div className="text-xs opacity-70">{new Date(sequence.timestamp).toLocaleTimeString()}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Simulated Fall Events */}
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-2">Simulated Falls</h3>
        <div className="flex flex-wrap gap-2">
          <button 
            className="bg-red-700 hover:bg-red-600 text-white py-1 px-2 rounded text-sm"
            onClick={() => generateFallEvent('forward')}
          >
            Forward Fall
          </button>
          <button 
            className="bg-red-700 hover:bg-red-600 text-white py-1 px-2 rounded text-sm"
            onClick={() => generateFallEvent('backward')}
          >
            Demo Backward Fall
          </button>
          <button 
            className="bg-red-700 hover:bg-red-600 text-white py-1 px-2 rounded text-sm"
            onClick={() => generateFallEvent('left')}
          >
            Left Fall
          </button>
          <button 
            className="bg-red-700 hover:bg-red-600 text-white py-1 px-2 rounded text-sm"
            onClick={() => generateFallEvent('right')}
          >
            Right Fall
          </button>
        </div>
      </div>
      
      {/* Fall analysis modal */}
      <FallAnalysisModal 
        fallEvent={currentFallEvent}
        isOpen={showModal}
        onClose={handleClose}
      />
    </div>
  );
} 