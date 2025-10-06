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
import PatientReport from './web/views/PatientReport';
import PatientComparisonView from './web/views/PatientComparisonView';
import { Cpu, Award, Clock, FileText } from 'lucide-react';

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
  // Set PT Session as the default view
  const [view, setView] = useState<'dashboard' | 'training-data' | 'pt-dashboard' | 'patients' | 'patient-detail' | 'pt-session' | 'live-gait' | 'patient-report' | 'patient-comparison'>('pt-session');
  
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
      default:
        return 'Sensor';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <StatusBanner streamName={getStatusName()} status={stats} />
          <div className="flex flex-wrap gap-2">
            {/* Hidden dashboard button for development
            <button 
              className={`px-3 py-1 rounded text-sm ${view === 'dashboard' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => changeView('dashboard')}
            >
              Dashboard
            </button>
            */}
            {/* Hidden PT Dashboard button for development
            <button
              className={`px-3 py-1 rounded text-sm ${view === 'pt-dashboard' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => changeView('pt-dashboard')}
            >
              PT Dashboard
            </button>
            */}
            <button
              className={`px-3 py-1 rounded text-sm ${view === 'pt-session' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => changeView('pt-session')}
            >
              PT Session
            </button>
            <button
              className={`px-3 py-1 rounded text-sm ${view === 'live-gait' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => changeView('live-gait')}
            >
              Live Gait
            </button>
            <button
              className={`px-3 py-1 rounded text-sm ${(view === 'patients' || view === 'patient-detail' || view === 'patient-report') ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => {
                changeView('patients');
                setSelectedPatient(null);
                setReportPatientId(null);
              }}
            >
              Patients
            </button>
            <button
              className={`px-3 py-1 rounded text-sm ${view === 'patient-comparison' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => changeView('patient-comparison')}
            >
              Patient Comparison
            </button>
            {/* Hidden Training Data button for development
            <button
              className={`px-3 py-1 rounded text-sm ${view === 'training-data' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => changeView('training-data')}
            >
              Training Data
            </button>
            */}
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
            {/* Feature highlight card for SOAP Note Generation */}
            <div className="bg-indigo-900/30 border border-indigo-800 rounded-lg p-6">
              <div className="flex flex-col md:flex-row md:items-start">
                <div className="bg-indigo-600 p-3 rounded-lg mb-4 md:mr-4 md:mb-0">
                  <Cpu className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    New: AI-Powered SOAP Note Generation
                  </h2>
                  <p className="text-indigo-200 mb-4">
                    Our new AI-powered SOAP note generator automatically creates structured clinical documentation
                    based on your session data, saving you valuable time and improving standardization.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-indigo-800/50 p-3 rounded-lg flex items-center">
                      <Clock className="w-5 h-5 text-indigo-300 mr-2" />
                      <span className="text-sm">Save 15+ minutes per patient</span>
                    </div>
                    <div className="bg-indigo-800/50 p-3 rounded-lg flex items-center">
                      <FileText className="w-5 h-5 text-indigo-300 mr-2" />
                      <span className="text-sm">Standardized documentation</span>
                    </div>
                    <div className="bg-indigo-800/50 p-3 rounded-lg flex items-center">
                      <Award className="w-5 h-5 text-indigo-300 mr-2" />
                      <span className="text-sm">Medicare/insurance compliant</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-indigo-200">
                    To try it, select a patient from the list below and click on any session to see the AI-generated SOAP note.
                  </div>
                </div>
              </div>
            </div>
          
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-6">Patient Management</h2>
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
            <PatientReport />
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
        
        {view === 'patient-comparison' && (
          <div className="w-full">
            <PatientComparisonView />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;