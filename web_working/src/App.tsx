import React, { useState, useEffect } from 'react';
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
import ResearchSubjectReport from './web/views/ResearchSubjectReport';
import SubjectComparisonView from './web/views/SubjectComparisonView';
import EEGView from './web/views/EEGView';
import UnifiedGridTestView from './web/views/UnifiedGridTestView';

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
  // Set Research Subjects (patients) as the default view
  const [view, setView] = useState<'dashboard' | 'training-data' | 'pt-dashboard' | 'patients' | 'patient-detail' | 'pt-session' | 'live-gait' | 'patient-report' | 'patient-comparison' | 'eeg' | 'unified-grid'>('patients');
  
  // Pass current view to useDataStream
  const { gridData, stats } = useDataStream(view);
  const { alerts, isLoading: alertsLoading, error: alertsError } = useAlertHistory();

  // Add effect to log view changes for debugging
  useEffect(() => {
    console.log(`📱 App: View changed to "${view}"`);
  }, [view]);

  // Handle view changes with improved logging
  const changeView = (newView: typeof view) => {
    console.log(`🔄 App: Changing view from "${view}" to "${newView}"`);
    // Reset any global state if needed before switching views
    setView(newView);
  };

  // State for the selected patient in patient detail view
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // State for the selected patient ID in patient report view
  const [reportPatientId, setReportPatientId] = useState<number | null>(null);

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
    changeView('patient-detail');
  };

  // Handle patient report view
  const handleViewPatientReport = (patientId: number) => {
    setReportPatientId(patientId);
    changeView('patient-report');
  };

  // Handle back button from patient detail view
  const handleBackToPatients = () => {
    changeView('patients');
    setSelectedPatient(null);
  };

  // Handle back from patient report view
  const handleBackFromReport = () => {
    changeView('patients');
    setReportPatientId(null);
  };

  // Save the completed PT Session data as a new session for the patient
  // This function simulates what would happen when a session is saved
  const saveSessionToPatient = (patientId: number, sessionData: any) => {
    console.log("Session saved for patient", patientId, sessionData);
    // In a real implementation, this would make an API call
    // and then redirect to the patient detail view to see the session
    
    // For now, just simulate completion and redirect to patients view
    changeView('patients');
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
      case 'patient-report':
      case 'patient-comparison':
        return 'Patients';
      case 'pt-session':
        return 'Session';
      case 'live-gait':
        return 'Gait';
      case 'eeg':
        return 'EEG';
      default:
        return 'Sensor';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Status Banner */}
        <StatusBanner streamName={getStatusName()} status={stats} />

        {/* Navigation Buttons - Larger and more accessible */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-wrap gap-3">
            <button
              className={`px-6 py-3 rounded-lg text-base font-medium transition-colors ${
                view === 'live-gait' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={() => changeView('live-gait')}
            >
              Live Gait
            </button>
            <button
              className={`px-6 py-3 rounded-lg text-base font-medium transition-colors ${
                (view === 'patients' || view === 'patient-detail' || view === 'patient-report')
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={() => {
                changeView('patients');
                setSelectedPatient(null);
                setReportPatientId(null);
              }}
            >
              Subjects
            </button>
            <button
              className={`px-6 py-3 rounded-lg text-base font-medium transition-colors ${
                view === 'patient-comparison' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={() => changeView('patient-comparison')}
            >
              Subject Comparison
            </button>
            <button
              className={`px-6 py-3 rounded-lg text-base font-medium transition-colors ${
                view === 'eeg' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={() => changeView('eeg')}
            >
              EEG
            </button>
            <button
              className={`px-6 py-3 rounded-lg text-base font-medium transition-colors ${
                view === 'unified-grid' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={() => changeView('unified-grid')}
            >
              Unified Grid
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
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-6">Research Subject Management</h2>
              <PatientTable
                onSelect={handleSelectPatient}
                onViewReport={handleViewPatientReport}
              />
            </div>
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
        
        {view === 'patient-report' && reportPatientId && (
          <div className="w-full">
            <ResearchSubjectReport />
          </div>
        )}
        
        {view === 'pt-dashboard' && (
          <div className="w-full">
            <PTDashboard />
          </div>
        )}

        {/* Hidden PT Session view - component files kept for dependencies
        {view === 'pt-session' && (
          <div className="w-full">
            <PTSessionView />
          </div>
        )}
        */}

        {view === 'live-gait' && (
          <div className="w-full">
            <LiveGait />
          </div>
        )}

        {view === 'patient-comparison' && (
          <div className="w-full">
            <SubjectComparisonView />
          </div>
        )}

        {view === 'eeg' && (
          <div className="w-full">
            <EEGView />
          </div>
        )}

        {view === 'unified-grid' && (
          <div className="w-full">
            <UnifiedGridTestView />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;