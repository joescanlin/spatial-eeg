import React, { useState, useEffect } from 'react';
import UnifiedGridDisplay from '../../components/UnifiedGridDisplay';
import LaneConfigurator from '../../components/LaneConfigurator';
import { UnifiedGridFrame, LaneBoundary, LANE_BOUNDARIES, UNIFIED_GRID_HEIGHT } from '../../types/multistation';
import { Grid3x3 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function UnifiedGridTestView() {
  const [gridData, setGridData] = useState<UnifiedGridFrame | null>(null);
  const [showLanes, setShowLanes] = useState(false);
  const [showBoundaries, setShowBoundaries] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [cellSize, setCellSize] = useState(14);
  const [customLanes, setCustomLanes] = useState<LaneBoundary[]>(LANE_BOUNDARIES);
  const [fps, setFps] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Connect to live SSE stream
  useEffect(() => {
    let frameCount = 0;
    let lastFpsUpdate = Date.now();

    const eventSource = new EventSource(`${API_BASE_URL}/api/grid-stream`, {
      withCredentials: true,
    });

    eventSource.addEventListener('grid', (event) => {
      try {
        const data = JSON.parse(event.data);

        // Convert SSE data to UnifiedGridFrame format
        const unifiedFrame: UnifiedGridFrame = {
          timestamp: Date.now(),
          grid: data.grid,
          basestations: data.basestations || {}
        };

        setGridData(unifiedFrame);
        setIsConnected(true);

        // Calculate FPS
        frameCount++;
        const now = Date.now();
        if (now - lastFpsUpdate >= 1000) {
          setFps(frameCount);
          frameCount = 0;
          lastFpsUpdate = now;
        }
      } catch (error) {
        console.error('Error parsing grid data:', error);
      }
    });

    eventSource.addEventListener('keepalive', () => {
      setIsConnected(true);
    });

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
                <Grid3x3 className="w-8 h-8 text-purple-400" />
                Live Unified Grid - 4 Basestation Fusion
              </h1>
              <p className="text-gray-400 mt-2">
                Real-time visualization (80×54 pixels)
              </p>
            </div>

            {/* Connection Status & FPS */}
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-lg border ${
                isConnected
                  ? 'bg-green-900/20 border-green-500/30'
                  : 'bg-red-900/20 border-red-500/30'
              }`}>
                <div className="text-xs text-gray-400">Stream Status</div>
                <div className={`text-sm font-semibold ${
                  isConnected ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                </div>
              </div>
              <div className="bg-gray-800 px-4 py-3 rounded-lg border border-gray-700">
                <div className="text-xs text-gray-400">Render FPS</div>
                <div className="text-2xl font-bold text-cyan-400">{fps}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Display Options */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Display Options</h3>
          <div className="grid grid-cols-4 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLanes}
                    onChange={(e) => setShowLanes(e.target.checked)}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-700"
                  />
                  <span className="text-sm text-gray-300">Show Lanes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBoundaries}
                    onChange={(e) => setShowBoundaries(e.target.checked)}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-700"
                  />
                  <span className="text-sm text-gray-300">Show Boundaries</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-700"
                  />
                  <span className="text-sm text-gray-300">Show Labels</span>
                </label>
                <div>
                  <label className="text-sm text-gray-300 block mb-1">
                    Cell Size: {cellSize}px
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="24"
                    value={cellSize}
                    onChange={(e) => setCellSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
          </div>
        </div>

        {/* Grid Display */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-auto">
          <UnifiedGridDisplay
            data={gridData}
            showLanes={showLanes}
            showBasestationBoundaries={showBoundaries}
            showLabels={showLabels}
            cellSize={cellSize}
            customLanes={customLanes}
          />
        </div>

        {/* Lane Configurator */}
        <LaneConfigurator
          lanes={customLanes}
          onUpdate={setCustomLanes}
          gridHeight={UNIFIED_GRID_HEIGHT}
        />

        {/* Info Panel */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">System Architecture</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 mb-1">Basestation #630</div>
              <div className="text-gray-200 font-mono">40×24 pixels</div>
              <div className="text-xs text-gray-500 mt-1">Top-left quadrant</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 mb-1">Basestation #631</div>
              <div className="text-gray-200 font-mono">40×24 pixels</div>
              <div className="text-xs text-gray-500 mt-1">Top-right quadrant</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 mb-1">Basestation #632</div>
              <div className="text-gray-200 font-mono">40×30 pixels</div>
              <div className="text-xs text-gray-500 mt-1">Bottom-left quadrant</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 mb-1">Basestation #633</div>
              <div className="text-gray-200 font-mono">40×30 pixels</div>
              <div className="text-xs text-gray-500 mt-1">Bottom-right quadrant</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-purple-900/20 border border-purple-700/30 rounded-lg">
            <div className="text-sm text-purple-200">
              <strong>Lane Configuration:</strong> 5 horizontal walking lanes (A, B, C, D, E), each 8 pixels tall (32 inches)
            </div>
            <div className="text-xs text-purple-300 mt-2">
              <strong>Layout pattern:</strong> 8,3,8,3,8,3,8,3,8,2 (40 active pixels + 14 inactive pixels = 54 total)
            </div>
            <div className="text-xs text-purple-300 mt-1">
              Walking direction: Horizontal (left-to-right or right-to-left across the 80-pixel width)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
