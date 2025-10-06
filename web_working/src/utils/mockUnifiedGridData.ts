/**
 * Mock Data Generator for Unified Grid Testing
 *
 * Generates realistic walking patterns across the 4-basestation fused grid
 * for testing and demonstration purposes.
 */

import {
  UnifiedGridFrame,
  UNIFIED_GRID_WIDTH,
  UNIFIED_GRID_HEIGHT,
  BASESTATION_LAYOUT,
  getLaneBoundaries
} from '../types/multistation';

interface WalkingPath {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  footprintRadius: number;
}

let activePaths: WalkingPath[] = [];

/**
 * Initialize walking paths in random lanes
 * Lanes are now HORIZONTAL - people walk left-to-right
 */
function initializePaths(count: number = 2): void {
  const lanes = getLaneBoundaries();
  activePaths = [];

  for (let i = 0; i < count; i++) {
    // Pick a random lane
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const laneCenter = (lane.start + lane.end) / 2;

    // Start at left or right side
    const startAtLeft = Math.random() > 0.5;

    activePaths.push({
      x: startAtLeft ? 5 : UNIFIED_GRID_WIDTH - 5,  // Start at left or right edge
      y: laneCenter + (Math.random() - 0.5) * 2,     // Position in lane (with slight randomness)
      velocityX: startAtLeft ? 0.8 : -0.8,           // Walk left-to-right or right-to-left
      velocityY: (Math.random() - 0.5) * 0.3,        // Slight lateral drift
      footprintRadius: 2 + Math.random() * 1.5       // Footprint size variation
    });
  }
}

/**
 * Update walking paths (simulate movement)
 * Paths now move horizontally (left-right)
 */
function updatePaths(): void {
  activePaths = activePaths.filter(path => {
    // Update position
    path.x += path.velocityX;
    path.y += path.velocityY;

    // Keep in bounds vertically (bounce off lane edges)
    if (path.y < 0 || path.y >= UNIFIED_GRID_HEIGHT) {
      path.velocityY *= -1;
      path.y = Math.max(0, Math.min(UNIFIED_GRID_HEIGHT - 1, path.y));
    }

    // Remove if walked off the grid horizontally
    return path.x >= 0 && path.x < UNIFIED_GRID_WIDTH;
  });

  // Add new paths randomly
  if (Math.random() < 0.02 && activePaths.length < 4) {
    initializePaths(1);
  }
}

/**
 * Generate a realistic footprint pattern (binary on/off)
 * Each pixel is either activated (1) or not (0) - no pressure gradients
 */
function generateFootprint(
  grid: number[][],
  centerX: number,
  centerY: number,
  radius: number,
  intensity: number = 1.0
): void {
  const startX = Math.max(0, Math.floor(centerX - radius));
  const endX = Math.min(UNIFIED_GRID_WIDTH - 1, Math.ceil(centerX + radius));
  const startY = Math.max(0, Math.floor(centerY - radius));
  const endY = Math.min(UNIFIED_GRID_HEIGHT - 1, Math.ceil(centerY + radius));

  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= radius) {
        // Binary activation - pixel is either on (1) or off (0)
        grid[y][x] = 1;
      }
    }
  }
}

/**
 * Generate mock unified grid frame with walking patterns
 */
export function generateMockUnifiedGridFrame(): UnifiedGridFrame {
  // Initialize empty grid
  const grid: number[][] = Array(UNIFIED_GRID_HEIGHT)
    .fill(0)
    .map(() => Array(UNIFIED_GRID_WIDTH).fill(0));

  // Initialize paths if needed
  if (activePaths.length === 0) {
    initializePaths(2);
  }

  // Update and render paths
  updatePaths();

  activePaths.forEach(path => {
    // Generate footprints for both feet (alternating)
    // For horizontal walking, feet are offset along Y-axis (side-to-side)
    // and staggered along X-axis (one foot ahead of the other)
    const footOffset = Math.sin(Date.now() / 500) * 1.5; // Alternating feet side-to-side
    const direction = path.velocityX > 0 ? 1 : -1; // Walking direction

    // Left and right feet, one slightly ahead
    generateFootprint(grid, path.x, path.y - footOffset, path.footprintRadius, 1);
    generateFootprint(grid, path.x - (direction * 2), path.y + footOffset, path.footprintRadius * 0.8, 1);
  });

  // Binary system - no decay needed, sensors turn off when foot leaves
  // In real system, sensors simply report 0 when not pressed, 1 when pressed

  // Generate basestation status (all connected for mock)
  const basestations: UnifiedGridFrame['basestations'] = {};
  BASESTATION_LAYOUT.forEach(bs => {
    basestations[bs.id] = {
      lastUpdate: Date.now(),
      connected: true
    };
  });

  return {
    timestamp: Date.now(),
    grid,
    basestations
  };
}

/**
 * Generate a static test pattern for debugging
 */
export function generateTestPattern(): UnifiedGridFrame {
  const grid: number[][] = Array(UNIFIED_GRID_HEIGHT)
    .fill(0)
    .map(() => Array(UNIFIED_GRID_WIDTH).fill(0));

  // Draw corner markers for each basestation
  BASESTATION_LAYOUT.forEach(bs => {
    const { offsetX, offsetY, width, height } = bs;

    // Mark corners
    const corners = [
      [offsetX, offsetY], // Bottom-left
      [offsetX + width - 1, offsetY], // Bottom-right
      [offsetX, offsetY + height - 1], // Top-left
      [offsetX + width - 1, offsetY + height - 1] // Top-right
    ];

    corners.forEach(([x, y]) => {
      if (y >= 0 && y < UNIFIED_GRID_HEIGHT && x >= 0 && x < UNIFIED_GRID_WIDTH) {
        grid[y][x] = 1.0;
        // Add cross pattern
        if (x > 0) grid[y][x - 1] = 0.7;
        if (x < UNIFIED_GRID_WIDTH - 1) grid[y][x + 1] = 0.7;
        if (y > 0) grid[y - 1][x] = 0.7;
        if (y < UNIFIED_GRID_HEIGHT - 1) grid[y + 1][x] = 0.7;
      }
    });

    // Draw center marker
    const centerX = offsetX + Math.floor(width / 2);
    const centerY = offsetY + Math.floor(height / 2);
    if (centerY >= 0 && centerY < UNIFIED_GRID_HEIGHT) {
      grid[centerY][centerX] = 0.5;
    }
  });

  // Mark lane boundaries
  const lanes = getLaneBoundaries();
  lanes.forEach((lane, idx) => {
    // Draw vertical line at lane start
    for (let y = 0; y < UNIFIED_GRID_HEIGHT; y += 5) {
      if (lane.start < UNIFIED_GRID_WIDTH) {
        grid[y][lane.start] = 0.3;
      }
    }
  });

  const basestations: UnifiedGridFrame['basestations'] = {};
  BASESTATION_LAYOUT.forEach(bs => {
    basestations[bs.id] = {
      lastUpdate: Date.now(),
      connected: true
    };
  });

  return {
    timestamp: Date.now(),
    grid,
    basestations
  };
}

/**
 * Generate cross-basestation walking pattern
 * (demonstrates continuity across basestation boundaries)
 * Now with HORIZONTAL walking paths
 */
export function generateCrossBoundaryPattern(): UnifiedGridFrame {
  const grid: number[][] = Array(UNIFIED_GRID_HEIGHT)
    .fill(0)
    .map(() => Array(UNIFIED_GRID_WIDTH).fill(0));

  const time = Date.now() / 1000;

  // Horizontal walking path that crosses the vertical boundary (x=40)
  // Walking in lane 2 (around y=12)
  const path1Y = 12 + Math.sin(time * 0.3) * 2; // Slight drift in lane
  const path1X = 30 + Math.sin(time * 0.8) * 15; // Oscillates across x=40 boundary

  generateFootprint(grid, path1X, path1Y, 3, 0.9);
  generateFootprint(grid, path1X - 2, path1Y + 1.5, 2.5, 0.7);

  // Second horizontal path that crosses the horizontal boundary (y=24)
  // Walking across both top and bottom sections
  const path2X = 60 + Math.sin(time * 0.6) * 10;
  const path2Y = 20 + Math.sin(time * 0.5) * 8; // Oscillates across y=24 boundary

  generateFootprint(grid, path2X, path2Y, 3, 0.9);
  generateFootprint(grid, path2X - 2, path2Y - 1.5, 2.5, 0.7);

  const basestations: UnifiedGridFrame['basestations'] = {};
  BASESTATION_LAYOUT.forEach(bs => {
    basestations[bs.id] = {
      lastUpdate: Date.now(),
      connected: true
    };
  });

  return {
    timestamp: Date.now(),
    grid,
    basestations
  };
}
