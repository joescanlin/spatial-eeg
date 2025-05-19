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

export default function PatientDetailView({ patient, onBack }: PatientDetailViewProps) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  
  // Fetch patient sessions
  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['patient-sessions', patient.id],
    queryFn: async () => {
      try {
        // Try to fetch from the API first (in a real app)
        try {
          const response = await fetch(`/api/pt-sessions?patientId=${patient.id}`);
          if (response.ok) {
            return await response.json();
          }
        } catch (apiError) {
          console.warn('API fetch failed, falling back to localStorage:', apiError);
        }
        
        // Fallback to localStorage for demo purposes
        const storedSessions = JSON.parse(localStorage.getItem('pt-sessions') || '[]');
        console.log('Retrieved sessions from localStorage:', storedSessions);
        
        // Filter sessions for this patient
        const patientSessions = storedSessions.filter((session: Session) => 
          session.patientId === patient.id
        );
        
        // If we have stored sessions for this patient, return them
        if (patientSessions.length > 0) {
          console.log(`Found ${patientSessions.length} sessions for patient ${patient.id} in localStorage`);
          return patientSessions;
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

// Mock session data for demonstration
const mockSessions: Session[] = [
  {
    id: 'sess-1',
    patientId: 1,
    startTime: '2025-05-15T09:30:00Z',
    endTime: '2025-05-15T10:15:00Z',
    duration: 2700, // 45 minutes
    notes: 'Patient showed good progress with gait symmetry. Recommended continuing home exercises focusing on balance.',
    selectedMetrics: ['cadence', 'stepLengthSymmetry', 'stanceTime', 'gaitVariability'],
    metrics: Array(30).fill(null).map((_, i) => ({
      timestamp: new Date(new Date('2025-05-15T09:30:00Z').getTime() + i * 60000).toISOString(),
      duration: i * 60,
      balanceScore: 80 + Math.random() * 10,
      stabilityIndex: 0.7 + Math.random() * 0.2,
      weightShiftQuality: 75 + Math.random() * 10,
      rangeOfMotion: 80 + Math.random() * 10,
      cadence: 110 + Math.random() * 10,
      leftStanceTimeMs: 550 + Math.random() * 50,
      rightStanceTimeMs: 580 + Math.random() * 50,
      stanceTimeAsymmetry: 5 + Math.random() * 3,
      leftStepLength: 25 + Math.random() * 3,
      rightStepLength: 26 + Math.random() * 3,
      stepLengthSymmetry: 92 + Math.random() * 5,
      cadenceVariability: 2 + Math.random() * 1,
      symmetry: 85 + Math.random() * 10,
      metricStatus: {
        cadence: 'normal',
        stanceTime: 'normal',
        stepLengthSymmetry: 'normal',
        gaitVariability: 'normal',
        balanceScore: 'normal',
        stabilityIndex: 'normal',
        weightShiftQuality: 'normal',
        rangeOfMotion: 'normal',
        symmetry: 'normal'
      }
    }))
  },
  {
    id: 'sess-2',
    patientId: 1,
    startTime: '2025-05-10T13:00:00Z',
    endTime: '2025-05-10T13:45:00Z',
    duration: 2700, // 45 minutes
    notes: 'Initial assessment - patient shows asymmetric gait with reduced step length on left side. Starting with basic exercises.',
    selectedMetrics: ['cadence', 'stepLengthSymmetry', 'stanceTime', 'gaitVariability'],
    metrics: Array(25).fill(null).map((_, i) => ({
      timestamp: new Date(new Date('2025-05-10T13:00:00Z').getTime() + i * 60000).toISOString(),
      duration: i * 60,
      balanceScore: 75 + Math.random() * 10,
      stabilityIndex: 0.6 + Math.random() * 0.2,
      weightShiftQuality: 70 + Math.random() * 10,
      rangeOfMotion: 75 + Math.random() * 10,
      cadence: 100 + Math.random() * 10,
      leftStanceTimeMs: 600 + Math.random() * 50,
      rightStanceTimeMs: 520 + Math.random() * 50,
      stanceTimeAsymmetry: 12 + Math.random() * 5,
      leftStepLength: 22 + Math.random() * 3,
      rightStepLength: 27 + Math.random() * 3,
      stepLengthSymmetry: 82 + Math.random() * 5,
      cadenceVariability: 3.5 + Math.random() * 1,
      symmetry: 80 + Math.random() * 10,
      metricStatus: {
        cadence: 'normal',
        stanceTime: 'high',
        stepLengthSymmetry: 'high',
        gaitVariability: 'normal',
        balanceScore: 'normal',
        stabilityIndex: 'normal',
        weightShiftQuality: 'normal',
        rangeOfMotion: 'normal',
        symmetry: 'normal'
      }
    }))
  },
  {
    id: 'sess-3',
    patientId: 2,
    startTime: '2025-05-14T10:00:00Z',
    endTime: '2025-05-14T11:00:00Z',
    duration: 3600, // 60 minutes
    notes: 'Post-surgery follow-up. Focus on regaining range of motion. Patient reported mild discomfort but completed full session.',
    selectedMetrics: ['cadence', 'rangeOfMotion', 'balanceScore'],
    metrics: Array(35).fill(null).map((_, i) => ({
      timestamp: new Date(new Date('2025-05-14T10:00:00Z').getTime() + i * 60000).toISOString(),
      duration: i * 60,
      balanceScore: 70 + Math.random() * 10,
      stabilityIndex: 0.5 + Math.random() * 0.2,
      weightShiftQuality: 65 + Math.random() * 10,
      rangeOfMotion: 65 + Math.random() * 10,
      cadence: 95 + Math.random() * 10,
      leftStanceTimeMs: 580 + Math.random() * 50,
      rightStanceTimeMs: 550 + Math.random() * 50,
      stanceTimeAsymmetry: 8 + Math.random() * 3,
      leftStepLength: 24 + Math.random() * 3,
      rightStepLength: 25 + Math.random() * 3,
      stepLengthSymmetry: 88 + Math.random() * 5,
      cadenceVariability: 2.5 + Math.random() * 1,
      symmetry: 82 + Math.random() * 10,
      metricStatus: {
        cadence: 'low',
        stanceTime: 'normal',
        stepLengthSymmetry: 'normal',
        gaitVariability: 'normal',
        balanceScore: 'normal',
        stabilityIndex: 'normal',
        weightShiftQuality: 'normal',
        rangeOfMotion: 'normal',
        symmetry: 'normal'
      }
    }))
  }
]; 