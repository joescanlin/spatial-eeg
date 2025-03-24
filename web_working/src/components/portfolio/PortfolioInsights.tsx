import React, { useState, useEffect, Suspense } from 'react';
import { mockBuildingData } from './mockData';
import { ErrorBoundary } from 'react-error-boundary';

// Lazy load the GlobeVisualization to prevent render issues
const GlobeVisualization = React.lazy(() => import('./GlobeVisualization'));

// Fallback component when visualization has an error
function FallbackComponent({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-white bg-gray-800 p-6">
      <h1 className="text-3xl font-bold mb-4 text-red-500">Error Loading Visualization</h1>
      <div className="bg-gray-900 p-6 rounded-lg shadow-lg max-w-3xl w-full mb-4">
        <h2 className="text-xl font-bold mb-4">Error Details</h2>
        <div className="bg-gray-800 p-4 rounded font-mono text-red-400 overflow-auto max-h-60 mb-4">
          {error.message}
          <br />
          {error.stack}
        </div>
        <button
          onClick={resetErrorBoundary}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Try Again
        </button>
      </div>
      
      <div className="bg-gray-900 p-6 rounded-lg shadow-lg max-w-3xl w-full">
        <h2 className="text-xl font-bold mb-4">Portfolio Summary</h2>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span>Total Buildings</span>
            <span className="font-medium">{mockBuildingData.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Building Types</span>
            <span className="font-medium">
              {Array.from(new Set(mockBuildingData.map(b => b.type))).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple loading component
function LoadingFallback() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 bg-opacity-70 p-6 rounded-lg text-blue-400 text-center">
        <div className="text-xl mb-2">Loading Building Portfolio</div>
        <div className="w-32 h-1 bg-gray-700 mx-auto overflow-hidden">
          <div className="h-full bg-blue-500 w-1/2 animate-pulse"></div>
        </div>
        <div className="mt-2 text-sm text-gray-400">Please wait...</div>
      </div>
    </div>
  );
}

// Tab content components
function OccupancyPanel() {
  return (
    <div className="absolute bottom-16 left-0 right-0 mx-auto max-w-4xl bg-gray-900 bg-opacity-80 rounded-lg p-4 text-white">
      <h3 className="text-lg font-bold mb-3">Building Occupancy Patterns</h3>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="text-sm text-gray-300 mb-1">Daily Occupancy Trends</div>
          <div className="bg-gray-800 rounded-lg p-3 h-32 flex items-end space-x-1">
            {Array.from({ length: 24 }).map((_, i) => {
              const hour = i;
              const height = hour >= 8 && hour <= 18 ? 
                Math.random() * 50 + 30 : // Business hours
                Math.random() * 30;       // Non-business hours
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t" 
                    style={{ height: `${height}%` }}
                  ></div>
                  {i % 3 === 0 && (
                    <div className="text-xs mt-1 text-gray-400">{hour}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-300 mb-1">Occupancy by Building Type</div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="space-y-2">
              {['hospital', 'office', 'retail', 'residence', 'education'].map(type => {
                const occupancy = type === 'hospital' ? 78 :
                                 type === 'office' ? 65 :
                                 type === 'retail' ? 82 :
                                 type === 'residence' ? 45 :
                                 70;
                
                // Color based on building type
                const color = 
                  type === 'hospital' ? '#3b82f6' : 
                  type === 'office' ? '#10b981' : 
                  type === 'retail' ? '#f59e0b' : 
                  type === 'residence' ? '#8b5cf6' : 
                  '#ec4899';
                
                return (
                  <div key={type} className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }}></div>
                    <span className="w-24">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                    <div className="flex-1 mx-2 bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-full rounded-full" 
                        style={{ width: `${occupancy}%`, backgroundColor: color }}
                      ></div>
                    </div>
                    <span className="text-sm">{occupancy}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MovementPatternsPanel() {
  return (
    <div className="absolute bottom-16 left-0 right-0 mx-auto max-w-4xl bg-gray-900 bg-opacity-80 rounded-lg p-4 text-white">
      <h3 className="text-lg font-bold mb-3">Movement Flow Analysis</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-sm font-medium mb-2">Circulation Efficiency</div>
          <div className="text-3xl font-bold text-blue-400">84%</div>
          <div className="text-xs text-gray-400 mt-1">+2.3% from last month</div>
          <div className="mt-2 text-xs text-gray-300">
            Primary movement paths show optimal routing with minimal congestion points
          </div>
        </div>
        
        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-sm font-medium mb-2">Congestion Points</div>
          <div className="text-3xl font-bold text-yellow-500">12</div>
          <div className="text-xs text-gray-400 mt-1">-3 from last month</div>
          <div className="mt-2 text-xs text-gray-300">
            Identified in lobbies and corridor intersections during peak hours
          </div>
        </div>
        
        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-sm font-medium mb-2">Path Optimization</div>
          <div className="text-3xl font-bold text-green-500">+18%</div>
          <div className="text-xs text-gray-400 mt-1">Improvement opportunity</div>
          <div className="mt-2 text-xs text-gray-300">
            Reconfiguration of secondary circulation paths could improve flow
          </div>
        </div>
      </div>
    </div>
  );
}

function DesignInsightsPanel() {
  return (
    <div className="absolute bottom-16 left-0 right-0 mx-auto max-w-4xl bg-gray-900 bg-opacity-80 rounded-lg p-4 text-white">
      <h3 className="text-lg font-bold mb-3">Design Pattern Insights</h3>
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-sm font-medium mb-2 text-blue-300">Top Performing Design Patterns</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-700 bg-opacity-50 p-2 rounded text-xs">
              <div className="font-medium mb-1">Natural Light Maximization</div>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-600 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '92%' }}></div>
                </div>
                <span className="ml-2">92%</span>
              </div>
              <div className="mt-1 text-gray-400">Improves occupant well-being and reduces energy usage</div>
            </div>
            
            <div className="bg-gray-700 bg-opacity-50 p-2 rounded text-xs">
              <div className="font-medium mb-1">Dual Circulation Paths</div>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-600 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '87%' }}></div>
                </div>
                <span className="ml-2">87%</span>
              </div>
              <div className="mt-1 text-gray-400">Reduces congestion and improves flow during peak hours</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-sm font-medium mb-2 text-blue-300">Optimization Recommendations</div>
          <ul className="space-y-2 text-xs">
            <li className="flex items-start">
              <div className="text-green-400 mr-2">■</div>
              <div>
                <span className="font-medium">Open Collaboration Zones:</span> 
                <span className="text-gray-300 ml-1">Implement in office buildings to increase interaction by 24%</span>
              </div>
            </li>
            <li className="flex items-start">
              <div className="text-yellow-400 mr-2">■</div>
              <div>
                <span className="font-medium">Decentralized Services:</span>
                <span className="text-gray-300 ml-1">Reduces travel distance by 31% in hospital environments</span>
              </div>
            </li>
            <li className="flex items-start">
              <div className="text-blue-400 mr-2">■</div>
              <div>
                <span className="font-medium">Biophilic Elements:</span>
                <span className="text-gray-300 ml-1">Increases occupant satisfaction by 18% across all building types</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// The portfolio insights component with error handling
const PortfolioInsights: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'occupancy' | 'movement' | 'design'>('overview');
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  
  // Log any errors to help with debugging
  useEffect(() => {
    const originalConsoleError = console.error;
    
    console.error = (...args) => {
      originalConsoleError(...args);
      setErrorInfo(prev => prev ? `${prev}\n${args.join(' ')}` : args.join(' '));
    };
    
    return () => {
      console.error = originalConsoleError;
    };
  }, []);
  
  // Render tab content based on selection
  const renderTabContent = () => {
    switch (selectedTab) {
      case 'occupancy':
        return <OccupancyPanel />;
      case 'movement':
        return <MovementPatternsPanel />;
      case 'design':
        return <DesignInsightsPanel />;
      default:
        return null;
    }
  };
  
  return (
    <div className="h-full w-full relative overflow-hidden">
      <ErrorBoundary
        FallbackComponent={FallbackComponent}
        onReset={() => setErrorInfo(null)}
      >
        {/* Main visualization */}
        <div className="absolute inset-0">
          <Suspense fallback={<LoadingFallback />}>
            <GlobeVisualization />
          </Suspense>
        </div>
        
        {/* Error display */}
        {errorInfo && (
          <div className="absolute bottom-16 left-4 right-4 bg-red-900 bg-opacity-90 p-3 rounded text-white text-sm max-h-32 overflow-auto">
            <div className="font-bold mb-1">Console Errors:</div>
            <pre className="text-xs">{errorInfo}</pre>
          </div>
        )}
        
        {/* Tab content */}
        {renderTabContent()}
        
        {/* Bottom controls panel */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center">
          <div className="bg-gray-900 bg-opacity-80 rounded-xl shadow-lg">
            <div className="flex text-gray-300">
              <button 
                className={`px-4 py-2 rounded-t-lg ${selectedTab === 'overview' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:bg-opacity-50'}`}
                onClick={() => setSelectedTab('overview')}
              >
                Overview
              </button>
              <button 
                className={`px-4 py-2 rounded-t-lg ${selectedTab === 'occupancy' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:bg-opacity-50'}`}
                onClick={() => setSelectedTab('occupancy')}
              >
                Occupancy Patterns
              </button>
              <button 
                className={`px-4 py-2 rounded-t-lg ${selectedTab === 'movement' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:bg-opacity-50'}`}
                onClick={() => setSelectedTab('movement')}
              >
                Movement Flow
              </button>
              <button 
                className={`px-4 py-2 rounded-t-lg ${selectedTab === 'design' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:bg-opacity-50'}`}
                onClick={() => setSelectedTab('design')}
              >
                Design Insights
              </button>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default PortfolioInsights; 