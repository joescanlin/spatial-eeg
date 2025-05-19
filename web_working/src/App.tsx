import React, { useState } from 'react';
import { GridDisplay } from './components/GridDisplay';
import { AlertHistoryList } from './components/alerts/AlertHistoryList';
import { useDataStream } from './hooks/useDataStream';
import { useAlertHistory } from './hooks/useAlertHistory';
import { GaitVisualization } from './components/GaitVisualization';
import { BalanceAssessment } from './components/BalanceAssessment';
import WanderingAssessment from './components/WanderingAssessment';
import { MobilityHealthScore } from './components/MobilityHealthScore';
import { PTDashboard } from './components/PTDashboard';
import { StatusBanner } from './components/StatusBanner';
import PatientTable from './components/PatientTable';
import PTSessionView from './web/views/PTSessionView';
import LiveGait from './web/views/LiveGait';
import PatientDetailView from './web/views/PatientDetailView';

// Define the Patient interface
interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  diagnosis: string;
  sessions_count: number;
  last_visit: string;
}

function App() {
  const { gridData, stats } = useDataStream();
  const { alerts, isLoading: alertsLoading, error: alertsError } = useAlertHistory();
  
  // Set PT Dashboard as the default view
  const [view, setView] = useState<'dashboard' | 'training-data' | 'pt-dashboard' | 'patients' | 'patient-detail' | 'pt-session' | 'live-gait'>('pt-dashboard');

  // State for the selected patient in patient detail view
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Combine metrics for mobility health score
  const mobilityMetrics = {
    walkingSpeed: gridData.gaitMetrics.speed,
    strideLength: gridData.gaitMetrics.strideLength,
    balanceScore: gridData.balanceMetrics.stabilityScore * 100,
    stepCount: gridData.gaitMetrics.stepCount
  };

  // Handle patient selection
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setView('patient-detail');
  };

  // Handle back button from patient detail view
  const handleBackToPatients = () => {
    setView('patients');
    setSelectedPatient(null);
  };

  // Save the completed PT Session data as a new session for the patient
  // This function simulates what would happen when a session is saved
  const saveSessionToPatient = (patientId: number, sessionData: any) => {
    console.log("Session saved for patient", patientId, sessionData);
    // In a real implementation, this would make an API call
    // and then redirect to the patient detail view to see the session
    
    // For now, just simulate completion and redirect to patients view
    setView('patients');
  };

  // Determine the status banner name based on the active view
  const getStatusName = () => {
    switch(view) {
      case 'pt-dashboard':
        return 'PT';
      case 'training-data':
        return 'Training';
      case 'patients':
      case 'patient-detail':
        return 'Patients';
      case 'pt-session':
        return 'Session';
      case 'live-gait':
        return 'Gait';
      default:
        return 'Sensor';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <StatusBanner streamName={getStatusName()} status={stats} />
          <div className="flex space-x-2">
            <button 
              className={`px-3 py-1 rounded text-sm ${view === 'dashboard' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => setView('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`px-3 py-1 rounded text-sm ${view === 'pt-dashboard' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => setView('pt-dashboard')}
            >
              PT Dashboard
            </button>
            <button
              className={`px-3 py-1 rounded text-sm ${view === 'pt-session' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => setView('pt-session')}
            >
              PT Session
            </button>
            <button
              className={`px-3 py-1 rounded text-sm ${view === 'live-gait' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => setView('live-gait')}
            >
              Live Gait
            </button>
            <button
              className={`px-3 py-1 rounded text-sm ${(view === 'patients' || view === 'patient-detail') ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => {
                setView('patients');
                setSelectedPatient(null);
              }}
            >
              Patients
            </button>
            <button
              className={`px-3 py-1 rounded text-sm ${view === 'training-data' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => setView('training-data')}
            >
              Training Data
            </button>
          </div>
        </div>
        
        {view === 'dashboard' && (
          <div className="grid grid-cols-[1fr_350px] gap-6">
            <div className="space-y-4">
              <div className="h-[750px]">
                <GridDisplay data={gridData} />
              </div>
              <MobilityHealthScore currentMetrics={mobilityMetrics} />
            </div>

            <div className="space-y-6">
              <AlertHistoryList
                alerts={alerts}
                isLoading={alertsLoading}
                error={alertsError}
              />
              <GaitVisualization data={gridData} />
              <BalanceAssessment metrics={gridData.balanceMetrics} />
              <WanderingAssessment metrics={gridData.wanderingMetrics} />
            </div>
          </div>
        )}
        
        {view === 'training-data' && (
          <div className="grid grid-cols-1 gap-6">
            <div className="p-4 bg-gray-800 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Training Mode</h2>
              <p>Training mode controls have been removed for this demo.</p>
            </div>
          </div>
        )}
        
        {view === 'patients' && (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Patient Management</h2>
            <PatientTable 
              onSelect={handleSelectPatient}
            />
          </div>
        )}

        {view === 'patient-detail' && selectedPatient && (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <PatientDetailView 
              patient={selectedPatient}
              onBack={handleBackToPatients}
            />
          </div>
        )}
        
        {view === 'pt-dashboard' && (
          <div className="w-full">
            <PTDashboard />
          </div>
        )}

        {view === 'pt-session' && (
          <div className="w-full">
            <PTSessionView />
          </div>
        )}

        {view === 'live-gait' && (
          <div className="w-full">
            <LiveGait />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;