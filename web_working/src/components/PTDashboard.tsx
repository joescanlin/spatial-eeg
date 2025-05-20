import React from 'react';
import { GridDisplay } from './GridDisplay';
import { PTExercisePanel } from './PTExercisePanel';
import { usePTStream } from '../hooks/usePTStream';
import { useDataStream } from '../hooks/useDataStream';
import { AlertHistoryList } from './alerts/AlertHistoryList';
import { useAlertHistory } from '../hooks/useAlertHistory';
import PTDashboardLayout from '../layouts/PTDashboardLayout';
import { BarChart2, HelpCircle } from 'lucide-react';
import { CollapsiblePanel } from './CollapsiblePanel';

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

  // Define the main content with feature highlights
  const mainContent = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <CollapsiblePanel
          title="PT Performance Metrics"
          icon={<BarChart2 className="w-6 h-6 text-green-500" />}
          defaultExpanded={true}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-gray-400 text-sm">Patients This Week</div>
                <div className="text-2xl font-bold">24</div>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-gray-400 text-sm">Avg. Session Length</div>
                <div className="text-2xl font-bold">42 min</div>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-gray-400 text-sm">Documentation Time</div>
                <div className="text-2xl font-bold text-green-500">↓ 35%</div>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-gray-400 text-sm">Patient Satisfaction</div>
                <div className="text-2xl font-bold">92%</div>
              </div>
            </div>
          </div>
        </CollapsiblePanel>
        
        <CollapsiblePanel
          title="Help & Resources"
          icon={<HelpCircle className="w-6 h-6 text-purple-500" />}
          defaultExpanded={false}
        >
          <div className="space-y-3">
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="font-medium mb-1">Using the Sensor Grid</div>
              <div className="text-sm text-gray-400">Learn how to configure and use the pressure sensor grid for optimal results.</div>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="font-medium mb-1">Understanding Gait Metrics</div>
              <div className="text-sm text-gray-400">A comprehensive guide to interpreting the gait metrics provided in the app.</div>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="font-medium mb-1">Exercise Protocol Library</div>
              <div className="text-sm text-gray-400">Access standardized exercise protocols for common conditions.</div>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="font-medium mb-1">Using AI-Generated SOAP Notes</div>
              <div className="text-sm text-gray-400">Learn how to make the most of our new AI-powered documentation system.</div>
            </div>
          </div>
        </CollapsiblePanel>
      </div>
      
      <div className="h-[550px]">
        <GridDisplay data={gridData} />
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="text-2xl font-bold mb-2">Physical Therapy Dashboard</div>
      
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

export default PTDashboard; 