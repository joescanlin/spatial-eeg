import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CollapsiblePanel } from '../../components/CollapsiblePanel';
import { User, Calendar, ArrowLeft, ClipboardList } from 'lucide-react';
import PTSessionSummary from '../../components/PTSessionSummary';

// Define the Patient interface
interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  diagnosis: string;
  sessions_count: number;
  last_visit: string;
}

// Define the Session interface
interface Session {
  id: string;
  patientId: number;
  startTime: string;
  endTime: string;
  duration: number;
  metrics: any[];
  notes: string;
  selectedMetrics: string[];
}

interface PatientDetailViewProps {
  patient: Patient;
  onBack: () => void;
}

// Mock sessions for demo purposes
const mockSessions: Session[] = [
  {
    id: 'mock-1',
    patientId: 1,
    startTime: '2023-05-10T13:00:00Z',
    endTime: '2023-05-10T13:45:00Z',
    duration: 2700,
    metrics: [],
    notes: 'Mock session data',
    selectedMetrics: ['cadence', 'stepLengthSymmetry']
  },
  {
    id: 'mock-2',
    patientId: 2,
    startTime: '2023-05-15T09:30:00Z',
    endTime: '2023-05-15T10:15:00Z',
    duration: 2700,
    metrics: [],
    notes: 'Another mock session',
    selectedMetrics: ['cadence', 'stanceTime']
  }
];

export default function PatientDetailView({ patient, onBack }: PatientDetailViewProps) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  
  // Fetch patient sessions
  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['patient-sessions', patient.id],
    queryFn: async () => {
      try {
        console.log('Fetching sessions for patient:', patient.id);
        
        // Use localStorage for session data
        // This is already the fallback approach, but now we're using it directly
        // since the API endpoint seems to be configured incorrectly
        try {
          const storedSessions = JSON.parse(localStorage.getItem('pt-sessions') || '[]');
          console.log('MetricsDebug - Retrieved sessions from localStorage:', storedSessions);
          console.log('MetricsDebug - Total sessions in localStorage:', storedSessions.length);
          
          // Examine each session to check metrics
          storedSessions.forEach((s: any, i: number) => {
            console.log(`MetricsDebug - Session ${i} (ID: ${s.id}) metrics:`, {
              hasMetricsProperty: s.hasOwnProperty('metrics'),
              metricsType: typeof s.metrics,
              isArray: Array.isArray(s.metrics),
              metricsLength: Array.isArray(s.metrics) ? s.metrics.length : 'N/A',
              patientId: s.patientId
            });
          });
          
          // Filter sessions for this patient
          const patientSessions = storedSessions.filter((session: Session) => 
            session.patientId === patient.id
          );
          
          console.log(`MetricsDebug - After filtering, found ${patientSessions.length} sessions for patient ${patient.id}`);
          
          // If we have stored sessions for this patient, return them
          if (patientSessions.length > 0) {
            console.log(`Found ${patientSessions.length} sessions for patient ${patient.id} in localStorage`);
            
            // Log the full data of the first session to check its structure
            if (patientSessions.length > 0) {
              const sessionToCheck = patientSessions[0];
              console.log('MetricsDebug - First session data:', {
                id: sessionToCheck.id,
                patientId: sessionToCheck.patientId,
                start: sessionToCheck.startTime,
                end: sessionToCheck.endTime,
                duration: sessionToCheck.duration,
                notesLength: sessionToCheck.notes ? sessionToCheck.notes.length : 0,
                selectedMetricsCount: Array.isArray(sessionToCheck.selectedMetrics) ? sessionToCheck.selectedMetrics.length : 'not array',
                metricsCount: Array.isArray(sessionToCheck.metrics) ? sessionToCheck.metrics.length : 'not array',
                metricsData: Array.isArray(sessionToCheck.metrics) && sessionToCheck.metrics.length > 0 ? 
                  sessionToCheck.metrics[0] : 'no metrics'
              });
            }
            
            return patientSessions;
          }
        } catch (storageError) {
          console.error('Error accessing localStorage:', storageError);
        }
        
        // If no stored sessions, fall back to mock data for demo purposes
        console.log('No stored sessions found, using mock data');
        return mockSessions.filter(session => session.patientId === patient.id);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        throw new Error('Failed to fetch patient sessions');
      }
    },
    // Only fetch if we have a patient
    enabled: Boolean(patient?.id),
  });
  
  // Back to session list from a selected session
  const handleBackToSessions = () => {
    setSelectedSession(null);
  };
  
  // Log the selected session data when it changes (for debugging)
  useEffect(() => {
    if (selectedSession) {
      console.log('Selected session metrics:', selectedSession.metrics);
      console.log('Metrics count:', Array.isArray(selectedSession.metrics) ? selectedSession.metrics.length : 0);
      console.log('Selected metrics:', selectedSession.selectedMetrics);
    }
  }, [selectedSession]);
  
  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center">
        <button
          onClick={onBack}
          className="mr-4 p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold">Patient Details</h2>
      </div>
      
      {/* Patient Details Card */}
      <CollapsiblePanel
        title="Patient Information"
        icon={<User className="w-6 h-6 text-blue-400" />}
        defaultExpanded={true}
      >
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Name</p>
              <p className="font-medium">{patient.first_name} {patient.last_name}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Diagnosis</p>
              <p className="font-medium">{patient.diagnosis}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Sessions</p>
              <p className="font-medium">{patient.sessions_count}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Last Visit</p>
              <p className="font-medium">{new Date(patient.last_visit).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </CollapsiblePanel>
      
      {/* Show session details or session list */}
      {selectedSession ? (
        <div className="space-y-4">
          <div className="flex items-center">
            <button
              onClick={handleBackToSessions}
              className="mr-4 p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
            >
              <ArrowLeft size={16} />
            </button>
            <h3 className="text-xl font-bold">Session Details</h3>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-gray-400 text-sm">Date</p>
                <p className="font-medium">{new Date(selectedSession.startTime).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Time</p>
                <p className="font-medium">
                  {new Date(selectedSession.startTime).toLocaleTimeString()} - 
                  {new Date(selectedSession.endTime).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Duration</p>
                <p className="font-medium">
                  {Math.floor(selectedSession.duration / 60)}:{(selectedSession.duration % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
            
            {/* Session Notes */}
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-2">Session Notes</h4>
              <div className="bg-gray-700 p-3 rounded-lg">
                {selectedSession.notes || <span className="text-gray-400 italic">No notes recorded for this session</span>}
              </div>
            </div>
            
            {/* Session Metrics */}
            <PTSessionSummary 
              metrics={Array.isArray(selectedSession.metrics) ? selectedSession.metrics : []} 
              isSessionActive={false} 
              selectedMetrics={Array.isArray(selectedSession.selectedMetrics) ? selectedSession.selectedMetrics : []} 
            />
          </div>
        </div>
      ) : (
        <CollapsiblePanel
          title="Session History"
          icon={<Calendar className="w-6 h-6 text-green-400" />}
          defaultExpanded={true}
        >
          {isLoading ? (
            <div className="flex justify-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-900/30 text-red-200 p-4 rounded-lg">
              Error loading sessions. Please try again.
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session: Session) => (
                <div 
                  key={session.id}
                  className="bg-gray-700 p-3 rounded-lg hover:bg-gray-600 cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <ClipboardList className="mr-3 text-green-400" size={18} />
                      <div>
                        <div className="font-medium">
                          {new Date(session.startTime).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-400">
                          Duration: {Math.floor(session.duration / 60)}:{(session.duration % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm bg-gray-800 px-2 py-1 rounded">
                      {Array.isArray(session.metrics) ? session.metrics.length : 0} data points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 text-gray-400">
              No sessions found for this patient.
            </div>
          )}
        </CollapsiblePanel>
      )}
    </div>
  );
} 