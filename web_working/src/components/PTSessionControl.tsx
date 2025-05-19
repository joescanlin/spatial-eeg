import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, User, Save } from 'lucide-react';
import { CollapsiblePanel } from './CollapsiblePanel';

// Patient interface (matching the one from PatientTable)
interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  diagnosis: string;
  sessions_count: number;
  last_visit: string;
}

interface PTSessionControlProps {
  onSelectPatient: (patient: Patient | null) => void;
  onStartSession: () => void;
  onEndSession: () => void;
  selectedPatient: Patient | null;
  isSessionActive: boolean;
  sessionDuration: number; // in seconds
}

export function PTSessionControl({
  onSelectPatient,
  onStartSession,
  onEndSession,
  selectedPatient,
  isSessionActive,
  sessionDuration
}: PTSessionControlProps) {
  const [confirmEndSession, setConfirmEndSession] = useState(false);
  
  // Format session duration as MM:SS
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Reset confirmation when session state changes
  useEffect(() => {
    setConfirmEndSession(false);
    // Log session state for debugging
    console.log("PTSessionControl: Session active state changed:", isSessionActive);
  }, [isSessionActive]);

  // Log the current state for debugging
  console.log("PTSessionControl rendering: isSessionActive=", isSessionActive, "selectedPatient=", selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : "null");

  return (
    <CollapsiblePanel
      title="PT Session Control"
      subtitle={isSessionActive ? "Session in progress" : "No active session"}
      icon={<Clock className="w-6 h-6 text-blue-400" />}
      defaultExpanded={true}
    >
      <div className="space-y-4">
        {/* Patient selection */}
        <div className="bg-gray-800 p-3 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Patient</span>
            {selectedPatient && !isSessionActive && (
              <button 
                onClick={() => onSelectPatient(null)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
          
          {selectedPatient ? (
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-400" />
              <div>
                <div className="font-medium">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </div>
                <div className="text-xs text-gray-400">
                  {selectedPatient.diagnosis}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onSelectPatient(null)} // This will trigger the patient selection modal
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm flex items-center justify-center space-x-2"
              disabled={isSessionActive}
            >
              <User className="w-4 h-4" />
              <span>Select Patient</span>
            </button>
          )}
        </div>
        
        {/* Session controls */}
        <div className="bg-gray-800 p-3 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Session</span>
            {isSessionActive && (
              <div className="text-sm font-medium text-blue-400">
                {formatDuration(sessionDuration)}
              </div>
            )}
          </div>
          
          {isSessionActive ? (
            <div className="space-y-3">
              <div className="bg-gray-900 p-2 rounded-md text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>Session in progress with {selectedPatient?.first_name} {selectedPatient?.last_name}</span>
                </div>
              </div>
              
              {confirmEndSession ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfirmEndSession(false)}
                    className="py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      console.log("End Session button clicked");
                      onEndSession();
                    }}
                    className="py-2 bg-red-600 hover:bg-red-700 rounded-md text-white text-sm flex items-center justify-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save & End</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmEndSession(true)}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 rounded-md text-white text-sm flex items-center justify-center space-x-2"
                >
                  <Square className="w-4 h-4" />
                  <span>End Session</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                console.log("Start Session button clicked");
                onStartSession();
              }}
              className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-md text-white text-sm flex items-center justify-center space-x-2"
              disabled={!selectedPatient}
            >
              <Play className="w-4 h-4" />
              <span>Start Session</span>
            </button>
          )}
        </div>
        
        {/* Instructions */}
        {!isSessionActive && !selectedPatient && (
          <div className="text-sm text-gray-400">
            Please select a patient to begin a new PT session.
          </div>
        )}
        
        {!isSessionActive && selectedPatient && (
          <div className="text-sm text-gray-400">
            Ready to begin a session with {selectedPatient.first_name} {selectedPatient.last_name}.
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
}

export default PTSessionControl; 