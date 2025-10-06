import React, { useMemo } from 'react';
import clsx from 'clsx';
import {
  BASESTATION_LAYOUT,
  UNIFIED_GRID_WIDTH,
  UNIFIED_GRID_HEIGHT,
  getLaneBoundaries,
  UnifiedGridFrame,
  LaneBoundary
} from '../types/multistation';

interface UnifiedGridDisplayProps {
  data?: UnifiedGridFrame | null;
  showLanes?: boolean;
  showBasestationBoundaries?: boolean;
  showLabels?: boolean;
  cellSize?: number;  // Size of each pixel cell in CSS pixels
  compact?: boolean;  // Hide header, legend, and status panel for embedding
  customLanes?: LaneBoundary[];  // Optional custom lane configuration
}

/**
 * Unified Grid Display Component
 *
 * Displays a fused 80×54 grid composed of 4 basestations:
 * - #630 (top-left): 40×24
 * - #631 (top-right): 40×24
 * - #632 (bottom-left): 40×30
 * - #633 (bottom-right): 40×30
 *
 * Features:
 * - Lane overlays (8 lanes, 8px wide, 3px separation)
 * - Basestation boundary indicators
 * - Real-time pressure visualization
 * - Cross-basestation path tracking
 */
export default function UnifiedGridDisplay({
  data,
  showLanes = true,
  showBasestationBoundaries = true,
  showLabels = true,
  cellSize = 8,
  compact = false,
  customLanes
}: UnifiedGridDisplayProps) {

  // Initialize empty grid if no data
  const grid = useMemo(() => {
    if (data?.grid) return data.grid;

    // Create empty 80×54 grid
    return Array(UNIFIED_GRID_HEIGHT).fill(0).map(() =>
      Array(UNIFIED_GRID_WIDTH).fill(0)
    );
  }, [data]);

  // Calculate lane boundaries - use custom lanes if provided
  const lanes = useMemo(() => customLanes || getLaneBoundaries(), [customLanes]);

  // Helper function to determine which basestation a pixel belongs to
  const getBasestationForPixel = (x: number, y: number): string => {
    for (const bs of BASESTATION_LAYOUT) {
      const inRangeX = x >= bs.offsetX && x < bs.offsetX + bs.width;
      const inRangeY = y >= bs.offsetY && y < bs.offsetY + bs.height;
      if (inRangeX && inRangeY) {
        return bs.id;
      }
    }
    return '';
  };

  // Color scheme for each basestation (subtle backgrounds)
  const basestationColors = {
    '630': 'bg-purple-950/40',  // Top-left
    '631': 'bg-blue-950/40',    // Top-right
    '632': 'bg-green-950/40',   // Bottom-left
    '633': 'bg-amber-950/40'    // Bottom-right
  };

  // Helper function to get color based on sensor value
  const getColor = (value: number, x: number, y: number) => {
    // Check if this pixel is in a lane (active area)
    const inLane = lanes.some(lane => y >= lane.start && y <= lane.end);

    // Binary on/off visualization (not pressure)
    // Each pixel is a simple switch - either activated (>0) or not (0)
    if (value > 0) {
      return 'bg-cyan-400'; // Activated sensor - bright cyan
    }

    // Get basestation-specific background color
    const basestationId = getBasestationForPixel(x, y);
    const basestationBg = basestationColors[basestationId as keyof typeof basestationColors] || 'bg-gray-900';

    // Empty cells in active lane areas - show basestation background with subtle outline
    if (inLane) {
      return `${basestationBg} ring-1 ring-inset ring-gray-700/40`;
    }

    // Spacing/gap cells - darker with very subtle outline
    return `${basestationBg} ring-1 ring-inset ring-gray-800/20`;
  };

  // Calculate active sensors
  const activeSensors = useMemo(() => {
    return grid.reduce((acc, row) =>
      acc + row.reduce((sum, cell) => sum + (cell > 0 ? 1 : 0), 0), 0
    );
  }, [grid]);

  // Calculate basestation status
  const basestationStatus = useMemo(() => {
    if (!data?.basestations) return null;

    return BASESTATION_LAYOUT.map(bs => ({
      id: bs.id,
      connected: data.basestations[bs.id]?.connected || false,
      lastUpdate: data.basestations[bs.id]?.lastUpdate || 0,
      offsetX: bs.offsetX,
      offsetY: bs.offsetY
    }));
  }, [data]);

  return (
    <div className={clsx(
      "relative bg-gray-950 rounded-lg h-full w-full overflow-auto",
      !compact && "p-6"
    )}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-200">
              Unified Grid - 4 Basestation Fusion
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              80×54 pixels ({UNIFIED_GRID_WIDTH} × {UNIFIED_GRID_HEIGHT})
            </p>
          </div>

          {/* Active sensors counter */}
          <div className="flex items-center gap-4">
            <div className="bg-gray-800 px-3 py-2 rounded-lg">
              <div className="text-xs text-gray-400">Active Sensors</div>
              <div className="text-2xl font-bold text-cyan-400">{activeSensors}</div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Container */}
      <div className="relative inline-block">
        {/* Main Grid */}
        <div
          className="grid gap-[1px] bg-gray-950"
          style={{
            gridTemplateColumns: `repeat(${UNIFIED_GRID_WIDTH}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${UNIFIED_GRID_HEIGHT}, ${cellSize}px)`
          }}
        >
          {grid.map((row, y) =>
            row.map((value, x) => (
              <div
                key={`${y}-${x}`}
                className={clsx(
                  'transition-colors duration-150',
                  getColor(value, x, y)
                )}
                title={`[${x},${y}]: ${value.toFixed(3)}`}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`
                }}
              />
            ))
          )}
        </div>

        {/* Lane Overlays - Horizontal lanes spanning full width */}
        {showLanes && (
          <div
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: `${UNIFIED_GRID_WIDTH * cellSize}px`,
              height: `${UNIFIED_GRID_HEIGHT * cellSize}px`
            }}
          >
            {lanes.map((lane, idx) => (
              <React.Fragment key={`lane-${idx}`}>
                {/* Top boundary line - positioned at top edge of lane.start cell */}
                <div
                  className="absolute bg-yellow-500/40"
                  style={{
                    top: `${lane.start * cellSize}px`,
                    left: 0,
                    width: '100%',
                    height: '1px'
                  }}
                />

                {/* Bottom boundary line - positioned at bottom edge of lane.end cell */}
                <div
                  className="absolute bg-yellow-500/40"
                  style={{
                    top: `${(lane.end + 1) * cellSize}px`,
                    left: 0,
                    width: '100%',
                    height: '1px'
                  }}
                />

                {/* Lane label */}
                {showLabels && (
                  <div
                    className="absolute left-2 text-[10px] font-mono text-yellow-400/60"
                    style={{
                      top: `${((lane.start + lane.end + 1) / 2) * cellSize - 6}px`
                    }}
                  >
                    L{lane.lane}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Basestation Boundary Overlays */}
        {showBasestationBoundaries && (
          <div
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: `${UNIFIED_GRID_WIDTH * cellSize}px`,
              height: `${UNIFIED_GRID_HEIGHT * cellSize}px`
            }}
          >
            {BASESTATION_LAYOUT.map((bs) => (
              <React.Fragment key={`bs-${bs.id}`}>
                <div
                  className="absolute border-2 border-dashed border-purple-500/30"
                  style={{
                    left: `${bs.offsetX * cellSize}px`,
                    top: `${bs.offsetY * cellSize}px`,
                    width: `${bs.width * cellSize}px`,
                    height: `${bs.height * cellSize}px`
                  }}
                >
                  {/* Connection status indicator */}
                  {basestationStatus && (
                    <div className="absolute top-1 right-1">
                      <div
                        className={clsx(
                          'w-2 h-2 rounded-full',
                          basestationStatus.find(s => s.id === bs.id)?.connected
                            ? 'bg-green-400 animate-pulse'
                            : 'bg-red-400'
                        )}
                        title={
                          basestationStatus.find(s => s.id === bs.id)?.connected
                            ? 'Connected'
                            : 'Disconnected'
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Basestation label - positioned outside the grid */}
                {showLabels && (
                  <div
                    className="absolute bg-purple-900/50 px-2 py-1 rounded text-[10px] font-mono text-purple-300 whitespace-nowrap"
                    style={{
                      left: `${bs.offsetX * cellSize}px`,
                      top: `${(bs.offsetY * cellSize) - 20}px`
                    }}
                  >
                    #{bs.id} ({bs.width}×{bs.height})
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* Vertical center dividing line - exactly at x=40 */}
            <div
              className="absolute bg-purple-500/40"
              style={{
                left: `${40 * cellSize}px`,
                top: 0,
                width: '1px',
                height: '100%'
              }}
            />

            {/* Horizontal dividing line - exactly at y=24 (between top and bottom rows) */}
            <div
              className="absolute bg-purple-500/40"
              style={{
                top: `${24 * cellSize}px`,
                left: 0,
                width: '100%',
                height: '1px'
              }}
            />
          </div>
        )}
      </div>

      {/* Legend */}
      {!compact && (
        <div className="mt-4 space-y-3">
        {/* Sensor States */}
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-900 border border-gray-700" />
            <span className="text-gray-400">Sensor Off (0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-cyan-400" />
            <span className="text-gray-400">Sensor On (1)</span>
          </div>

          {showLanes && (
            <>
              <div className="ml-4 border-l-2 pl-4 border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-yellow-500/40" />
                  <span className="text-gray-400">Walking Lanes</span>
                </div>
              </div>
            </>
          )}

          <div className="ml-4 text-gray-500 italic">
            Note: Each 4" pixel is a binary switch (on/off)
          </div>
        </div>

        {/* Basestation Color Legend */}
        <div className="flex items-center gap-4 text-xs pt-2 border-t border-gray-800">
          <span className="text-gray-400 font-semibold">Basestation Colors:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-950/40 border border-purple-700/30" />
            <span className="text-purple-300">#630 (Top-Left)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-950/40 border border-blue-700/30" />
            <span className="text-blue-300">#631 (Top-Right)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-950/40 border border-green-700/30" />
            <span className="text-green-300">#632 (Bottom-Left)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-950/40 border border-amber-700/30" />
            <span className="text-amber-300">#633 (Bottom-Right)</span>
          </div>
        </div>
        </div>
      )}

      {/* Basestation Status Panel */}
      {!compact && basestationStatus && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {basestationStatus.map((bs) => {
            const colorMap = {
              '630': { bg: 'bg-purple-900/20', border: 'border-purple-500/30', text: 'text-purple-300' },
              '631': { bg: 'bg-blue-900/20', border: 'border-blue-500/30', text: 'text-blue-300' },
              '632': { bg: 'bg-green-900/20', border: 'border-green-500/30', text: 'text-green-300' },
              '633': { bg: 'bg-amber-900/20', border: 'border-amber-500/30', text: 'text-amber-300' }
            };

            const colors = colorMap[bs.id as keyof typeof colorMap];

            return (
              <div
                key={bs.id}
                className={clsx(
                  'px-3 py-2 rounded border',
                  colors.bg,
                  bs.connected ? colors.border : 'border-red-500/30'
                )}
              >
                <div className={clsx('text-xs font-mono font-semibold', colors.text)}>
                  Basestation #{bs.id}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  {bs.connected ? '🟢 Connected' : '🔴 Offline'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
