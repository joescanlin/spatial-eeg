import React, { useState } from 'react';
import { GridDisplay } from './components/GridDisplay';
import { StatusPanel } from './components/StatusPanel';
import { AlertHistoryList } from './components/alerts/AlertHistoryList';
import { DecibelDisplay } from './components/DecibelDisplay';
import { useDataStream } from './hooks/useDataStream';
import { useAlertHistory } from './hooks/useAlertHistory';
import { GaitVisualization } from './components/GaitVisualization';
import { BalanceAssessment } from './components/BalanceAssessment';
import WanderingAssessment from './components/WanderingAssessment';
import { MobilityHealthScore } from './components/MobilityHealthScore';
import TestControls from './components/TestControls';
import BuildingVisualization from './components/3d/BuildingVisualization';
import PortfolioInsights from './components/portfolio/PortfolioInsights';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  const { gridData, stats } = useDataStream();
  const { alerts, isLoading: alertsLoading, error: alertsError } = useAlertHistory();
  const [view, setView] = useState<'dashboard' | 'training-data' | 'building-view' | 'portfolio-insights'>('training-data');

  // Combine metrics for mobility health score
  const mobilityMetrics = {
    walkingSpeed: gridData.gaitMetrics.speed,
    strideLength: gridData.gaitMetrics.strideLength,
    balanceScore: gridData.balanceMetrics.stabilityScore * 100,
    stepCount: gridData.gaitMetrics.stepCount
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <StatusPanel stats={stats} />
          <div className="flex space-x-2">
            <button 
              className={`px-3 py-1 rounded text-sm ${view === 'dashboard' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => setView('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`px-3 py-1 rounded text-sm ${view === 'training-data' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => setView('training-data')}
            >
              Training Data
            </button>
            <button
              className={`px-3 py-1 rounded text-sm ${view === 'building-view' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => setView('building-view')}
            >
              Building View
            </button>
            <button
              className={`px-3 py-1 rounded text-sm ${view === 'portfolio-insights' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => setView('portfolio-insights')}
            >
              Portfolio Insights
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
              <DecibelDisplay level={gridData.decibelLevel} />
              <GaitVisualization data={gridData} />
              <BalanceAssessment metrics={gridData.balanceMetrics} />
              <WanderingAssessment metrics={gridData.wanderingMetrics} />
              <TestControls />
            </div>
          </div>
        )}
        
        {view === 'training-data' && (
          <div className="grid grid-cols-1 gap-6">
            <TestControls />
          </div>
        )}

        {view === 'building-view' && (
          <div className="h-[800px] w-full bg-gray-800 rounded-lg overflow-hidden">
            <ErrorBoundary fallback={<div className="p-4 text-white">Error loading 3D visualization. Check console for details.</div>}>
              <BuildingVisualization data={gridData} />
            </ErrorBoundary>
          </div>
        )}

        {view === 'portfolio-insights' && (
          <div className="h-[800px] w-full bg-gray-800 rounded-lg overflow-hidden">
            <ErrorBoundary fallback={<div className="p-4 text-white">Error loading Portfolio Insights. Check console for details.</div>}>
              <PortfolioInsights />
            </ErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;