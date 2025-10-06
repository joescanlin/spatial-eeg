/**
 * Multi-Basestation Grid Fusion
 *
 * This system fuses 4 independent sensor basestations into one unified grid space
 * for continuous gait tracking across a larger walking area.
 */

export interface BasestationConfig {
  id: string;           // e.g., "630", "631", "632", "633"
  width: number;        // pixels wide
  height: number;       // pixels tall
  offsetX: number;      // unified grid X offset
  offsetY: number;      // unified grid Y offset
  mqttTopic: string;    // MQTT topic for this basestation
}

export interface BasestationFrame {
  basestationId: string;
  timestamp: number;
  frame: number[][];    // Local coordinate frame data
}

export interface UnifiedGridFrame {
  timestamp: number;
  grid: number[][];     // 80×54 unified grid
  basestations: {
    [id: string]: {
      lastUpdate: number;
      connected: boolean;
    };
  };
}

// Configuration for the 4-basestation layout
// Physical installation (top-down view):
//   TOP ROW:    #630 (left, 40×24) | 3px gap | #631 (right, 40×24)
//   BOTTOM ROW: #632 (left, 40×30) | 3px gap | #633 (right, 40×30)
// Y-axis: 0 at TOP, increases DOWNWARD (screen coordinates)
export const BASESTATION_LAYOUT: BasestationConfig[] = [
  {
    id: "630",
    width: 40,
    height: 24,
    offsetX: 0,
    offsetY: 0,   // Top-left (y: 0-23)
    mqttTopic: "basestation/630/frame"
  },
  {
    id: "631",
    width: 40,
    height: 24,
    offsetX: 40,
    offsetY: 0,   // Top-right (y: 0-23)
    mqttTopic: "basestation/631/frame"
  },
  {
    id: "632",
    width: 40,
    height: 30,
    offsetX: 0,
    offsetY: 24,  // Bottom-left (y: 24-53, includes 3px gap from top row)
    mqttTopic: "basestation/632/frame"
  },
  {
    id: "633",
    width: 40,
    height: 30,
    offsetX: 40,
    offsetY: 24,  // Bottom-right (y: 24-53, includes 3px gap from top row)
    mqttTopic: "basestation/633/frame"
  }
];

// Unified grid dimensions
export const UNIFIED_GRID_WIDTH = 80;
export const UNIFIED_GRID_HEIGHT = 54;

// Lane configuration
// Lanes run HORIZONTALLY (left-to-right across the width)
// People walk parallel to the X-axis
// MANUAL CONFIGURATION: Set exact Y-pixel positions for each lane
export interface LaneBoundary {
  start: number;  // Y-coordinate where lane starts (top edge)
  end: number;    // Y-coordinate where lane ends (bottom edge)
  lane: string;   // Lane label (A, B, C, D, E)
}

/**
 * CONFIGURABLE LANE BOUNDARIES
 * 5 lanes total (A, B, C, D, E)
 *
 * True coordinates based on physical installation:
 * A: Y=2-9   (8 active pixels)  [Edge Y=0-1]
 * B: Y=13-20 (8 active pixels)  [Gap Y=10-12]
 * C: Y=24-31 (8 active pixels)  [Gap Y=21-23]
 * D: Y=35-42 (8 active pixels)  [Gap Y=32-34]
 * E: Y=46-53 (8 active pixels)  [Gap Y=43-45]
 *
 * Y-coordinates (0 = top, 53 = bottom)
 * Lane ordering: A at top, B, C, D, E going downward
 */
export const LANE_BOUNDARIES: LaneBoundary[] = [
  { start: 2,  end: 9,  lane: 'A' },   // Lane A: Y=2-9   (8 pixels) [Edge Y=0-1]
  { start: 13, end: 20, lane: 'B' },   // Lane B: Y=13-20 (8 pixels) [Gap Y=10-12]
  { start: 24, end: 31, lane: 'C' },   // Lane C: Y=24-31 (8 pixels) [Gap Y=21-23]
  { start: 35, end: 42, lane: 'D' },   // Lane D: Y=35-42 (8 pixels) [Gap Y=32-34]
  { start: 46, end: 53, lane: 'E' }    // Lane E: Y=46-53 (8 pixels) [Gap Y=43-45]
];

/**
 * Get lane boundaries for visualization
 * Uses manual configuration above
 */
export function getLaneBoundaries(): LaneBoundary[] {
  return LANE_BOUNDARIES;
}

/**
 * Transform local basestation coordinates to unified grid coordinates
 */
export function localToUnified(
  basestationId: string,
  localX: number,
  localY: number
): { x: number; y: number } | null {
  const config = BASESTATION_LAYOUT.find(b => b.id === basestationId);
  if (!config) return null;

  return {
    x: config.offsetX + localX,
    y: config.offsetY + localY
  };
}

/**
 * Transform unified grid coordinates to local basestation coordinates
 */
export function unifiedToLocal(
  unifiedX: number,
  unifiedY: number
): { basestationId: string; localX: number; localY: number } | null {
  for (const config of BASESTATION_LAYOUT) {
    const inRangeX = unifiedX >= config.offsetX && unifiedX < config.offsetX + config.width;
    const inRangeY = unifiedY >= config.offsetY && unifiedY < config.offsetY + config.height;

    if (inRangeX && inRangeY) {
      return {
        basestationId: config.id,
        localX: unifiedX - config.offsetX,
        localY: unifiedY - config.offsetY
      };
    }
  }

  return null;
}
