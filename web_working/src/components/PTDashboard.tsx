import React from 'react';
import { GridDisplay } from './GridDisplay';
import { BalanceAssessment } from './BalanceAssessment';
import { GaitVisualization } from './GaitVisualization';
import { PTExercisePanel } from './PTExercisePanel';
import { usePTStream } from '../hooks/usePTStream';
import { useDataStream } from '../hooks/useDataStream';
import { AlertHistoryList } from './alerts/AlertHistoryList';
import { useAlertHistory } from '../hooks/useAlertHistory';
import PTDashboardLayout from '../layouts/PTDashboardLayout';

export function PTDashboard() {
  const { gridData, stats } = useDataStream();
  const { 
    ptMetrics, 
    isExerciseActive, 
    exerciseType, 
    loading,
    isConnected,
    startExercise, 
    stopExercise 
  } = usePTStream();
  const { alerts, isLoading: alertsLoading, error: alertsError } = useAlertHistory();

  // No longer block UI while loading - components will show with default values

  // Define the sidebar content
  const sidebarContent = (
    <>
      <PTExercisePanel 
        metrics={ptMetrics}
        isActive={isExerciseActive}
        exerciseType={exerciseType}
        onStart={startExercise}
        onStop={stopExercise}
        isConnected={isConnected}
      />
      
      <AlertHistoryList
        alerts={alerts}
        isLoading={alertsLoading}
        error={alertsError}
      />
    </>
  );

  // Define the main content
  const mainContent = (
    <>
      <div className="h-[550px]">
        <GridDisplay data={gridData} />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <BalanceAssessment metrics={gridData.balanceMetrics} />
        <GaitVisualization data={gridData} />
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Conditionally show a non-blocking notification if not connected */}
      {!isConnected && (
        <div className="bg-yellow-900/30 border border-yellow-800 text-yellow-200 px-4 py-2 rounded-lg text-sm">
          <p>Using simulated data for demonstration. Connect MQTT sensors for real-time data.</p>
        </div>
      )}
      
      <PTDashboardLayout 
        sidebar={sidebarContent}
      >
        {mainContent}
      </PTDashboardLayout>
    </div>
  );
} 