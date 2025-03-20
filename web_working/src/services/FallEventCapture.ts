import { GridData } from '../types/grid';

// Define types for fall event data
export interface FallEventFrame {
  frame: number[][];
  timestamp: string;
  fallProbability: number;
  balanceMetrics?: {
    stabilityScore: number;
    swayArea: number;
    weightDistribution: number;
    copMovement: number;
  };
  gaitMetrics?: {
    speed: number;
    strideLength: number;
    symmetryScore: number;
    stepCount: number;
  };
}

export interface FallTrajectory {
  direction: 'forward' | 'backward' | 'left' | 'right' | 'none' | string; // Properly typed directions
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  impactPoints: [number, number, number][];
  velocity: number; // ft/s
}

export interface FallBalanceMetrics {
  preFailStabilityScore: number;
  asymmetryIndex: number;
}

export interface BodyPart {
  name: string;
  position: [number, number, number];
  impact?: number; // Impact force if applicable
}

export interface FallAnalysis {
  type: string; // slip, trip, collapse, etc.
  bodyImpactSequence: BodyPart[];
  trajectory: FallTrajectory;
  balanceMetrics: FallBalanceMetrics;
}

export interface FallEvent {
  id: string;
  timestamp: string;
  frames: FallEventFrame[];
  fallDetected: boolean;
  fallProbability: number;
  analysis?: FallAnalysis;
}

// Playback states for fall replay
export type PlaybackStatus = 'stopped' | 'playing' | 'paused';

// Playback settings for fall replay
export interface PlaybackSettings {
  speed: number; // 0.25, 0.5, 1, 2, etc.
  loop: boolean;
  currentFrameIndex: number;
}

// Default playback settings
const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = {
  speed: 1,
  loop: false,
  currentFrameIndex: 0
};

// Maximum number of frames to keep in the buffer (15fps × 20 seconds)
const MAX_BUFFER_SIZE = 300;

// Pre-fall buffer size (15fps × 5 seconds before fall)
const PRE_FALL_BUFFER_SIZE = 75;

// Default empty fall event for when no events are available
const EMPTY_FALL_EVENT: FallEvent = {
  id: 'empty',
  timestamp: new Date().toISOString(),
  frames: [],
  fallDetected: false,
  fallProbability: 0,
  analysis: {
    type: 'none',
    bodyImpactSequence: [],
    trajectory: {
      direction: 'none',
      startPoint: [0, 0, 0],
      endPoint: [0, 0, 0],
      impactPoints: [],
      velocity: 0
    },
    balanceMetrics: {
      preFailStabilityScore: 0,
      asymmetryIndex: 0
    }
  }
};

class FallEventCaptureService {
  private frameBuffer: FallEventFrame[] = [];
  private fallEvents: FallEvent[] = [];
  private isCapturing: boolean = false;
  private currentFallEvent: FallEvent | null = null;
  private captureStartTime: number = 0;
  
  // Playback state
  private playbackStatus: PlaybackStatus = 'stopped';
  private playbackSettings: PlaybackSettings = { ...DEFAULT_PLAYBACK_SETTINGS };
  private playbackCallbacks: ((frame: FallEventFrame | null) => void)[] = [];
  private playbackIntervalId: number | null = null;
  
  // Add a frame to the buffer
  addFrame(gridData: GridData): void {
    try {
      // Create a frame object from grid data
      const frame: FallEventFrame = {
        frame: gridData.frame,
        timestamp: gridData.timestamp,
        fallProbability: gridData.fallProbability,
        balanceMetrics: gridData.balanceMetrics,
        gaitMetrics: gridData.gaitMetrics
      };
      
      // Add to buffer
      this.frameBuffer.push(frame);
      
      // Keep buffer size limited
      if (this.frameBuffer.length > MAX_BUFFER_SIZE) {
        this.frameBuffer.shift();
      }
      
      // Start or continue capture if fall is detected
      if (gridData.fallDetected && !this.isCapturing) {
        this.startCapture();
      }
      
      // If we're capturing, add to current fall event
      if (this.isCapturing && this.currentFallEvent) {
        this.currentFallEvent.frames.push(frame);
        this.currentFallEvent.fallProbability = Math.max(
          this.currentFallEvent.fallProbability, 
          gridData.fallProbability
        );
        
        // Check if we should stop capturing (10 seconds after fall detection)
        const captureTime = Date.now() - this.captureStartTime;
        if (captureTime > 10000) {
          this.finishCapture();
        }
      }
    } catch (error) {
      console.error("Error adding frame to fall event capture:", error);
    }
  }
  
  // Start capturing a fall event
  private startCapture(): void {
    try {
      this.isCapturing = true;
      this.captureStartTime = Date.now();
      
      // Create new fall event
      const fallEventId = `fall-${Date.now()}`;
      this.currentFallEvent = {
        id: fallEventId,
        timestamp: new Date().toISOString(),
        frames: [...this.frameBuffer], // Include buffer (previous ~20 seconds)
        fallDetected: true,
        fallProbability: 0
      };
    } catch (error) {
      console.error("Error starting fall capture:", error);
      this.isCapturing = false;
    }
  }
  
  // Finish capturing and analyze
  private finishCapture(): void {
    try {
      if (!this.currentFallEvent) return;
      
      // Analyze the fall data
      this.currentFallEvent.analysis = this.analyzeFall(this.currentFallEvent);
      
      // Save to history
      this.fallEvents.push(this.currentFallEvent);
      
      // Log the event for debugging
      console.log("Fall event captured and analyzed:", this.currentFallEvent);
      
      // Reset state
      this.isCapturing = false;
      this.currentFallEvent = null;
    } catch (error) {
      console.error("Error finishing fall capture:", error);
      this.isCapturing = false;
      this.currentFallEvent = null;
    }
  }
  
  // Simulate a fall event for testing (useful when real data is unavailable)
  simulateFallEvent(type: 'forward' | 'backward' | 'left' | 'right' = 'forward'): FallEvent {
    try {
      console.log(`Starting simulation for ${type} fall...`);
      
      // For backward falls, use our specialized realistic simulation
      if (type === 'backward') {
        const result = this.simulateRealisticBackwardFall();
        console.log(`Backward fall simulation completed with ${result.frames.length} frames`);
        return result;
      }
      
      // Create a test fall event
      const fallEventId = `test-fall-${Date.now()}`;
      const timestamp = new Date().toISOString();
      
      // Create basic frame with some data
      const baseFrame = Array(15).fill(0).map(() => Array(12).fill(0));
      
      // Add some data based on fall type
      for (let i = 0; i < baseFrame.length; i++) {
        for (let j = 0; j < baseFrame[i].length; j++) {
          if (Math.random() < 0.2) {
            baseFrame[i][j] = Math.random() * 0.8;
          }
        }
      }
      
      // Create test frames
      const frames: FallEventFrame[] = [];
      for (let i = 0; i < 30; i++) {
        const fallProbability = i > 15 ? 0.9 : i / 15;
        frames.push({
          frame: [...baseFrame.map(row => [...row])], // Deep copy to avoid reference issues
          timestamp: new Date(Date.now() - (30 - i) * 100).toISOString(),
          fallProbability
        });
      }
      
      // Create basic body parts based on fall type
      const bodyParts: BodyPart[] = [];
      
      switch (type) {
        case 'forward':
          bodyParts.push(
            { name: 'head', position: [0, 1.2, -0.5] },
            { name: 'hands', position: [0, 0.5, -0.3] },
            { name: 'knees', position: [0, 0.3, 0.2] }
          );
          break;
        case 'backward':
          bodyParts.push(
            { name: 'back', position: [0, 0.8, 0.5] },
            { name: 'head', position: [0, 1.2, 0.7] },
            { name: 'hands', position: [0, 0.5, 0.4] }
          );
          break;
        case 'left':
          bodyParts.push(
            { name: 'left hip', position: [-0.5, 0.8, 0] },
            { name: 'left elbow', position: [-0.6, 1.0, 0] },
            { name: 'head', position: [-0.7, 1.2, 0] }
          );
          break;
        case 'right':
          bodyParts.push(
            { name: 'right hip', position: [0.5, 0.8, 0] },
            { name: 'right elbow', position: [0.6, 1.0, 0] },
            { name: 'head', position: [0.7, 1.2, 0] }
          );
          break;
      }
      
      // Create fall event object
      const fallEvent: FallEvent = {
        id: fallEventId,
        timestamp,
        frames,
        fallDetected: true,
        fallProbability: 0.95,
        analysis: {
          type: `${type} fall`,
          bodyImpactSequence: bodyParts,
          trajectory: {
            direction: type,
            startPoint: [0, 0, 0],
            endPoint: calculateEndPoint(type),
            impactPoints: [[0, 0, 0]],
            velocity: 1.5
          },
          balanceMetrics: {
            preFailStabilityScore: 0.7,
            asymmetryIndex: 0.3
          }
        }
      };
      
      // Add to fall events history
      this.fallEvents.push(fallEvent);
      
      console.log(`Standard fall event created with ${fallEvent.frames.length} frames`);
      
      return fallEvent;
    } catch (error) {
      console.error("Error simulating fall event:", error);
      return EMPTY_FALL_EVENT;
    }
  }
  
  /**
   * Simulates a realistic backward fall with perfect sequence of frames
   * The simulation starts from one end of the sensor array and shows:
   * 1. Walking phase: 3 steps from the edge of the sensor grid
   * 2. Transition: Stumble/slip causing loss of balance
   * 3. Fall: Realistic backward fall with proper impact sequence (hip→back→head)
   * 4. Final position: Stable pressure pattern of person on the ground
   */
  simulateRealisticBackwardFall(): FallEvent {
    try {
      console.log("Starting realistic backward fall simulation...");
      
      const fallEventId = `realistic-backward-fall-${Date.now()}`;
      const timestamp = new Date().toISOString();
      const totalFrames = 45; // Total sequence length
      const frames: FallEventFrame[] = [];
      
      // Grid dimensions (15x12)
      const GRID_HEIGHT = 15;
      const GRID_WIDTH = 12;
      
      // Create empty frame template
      const createEmptyFrame = () => {
        return Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
      };
      
      // Function to add foot pressure pattern at a specific position
      const addFootPressure = (frame: number[][], x: number, y: number, intensity: number = 1.0, isRightFoot: boolean = true) => {
        // Ensure coordinates are within grid bounds
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return frame;
        
        // Enhanced foot shape (more realistic foot pattern)
        const footShape = isRightFoot ?
          [[0, 0, 0.7], [1, 0, 0.8], [0, 1, 0.9], [1, 1, 1.0], [0, 2, 0.4], [1, 2, 0.5]] :  // Right foot
          [[0, 0, 0.7], [1, 0, 0.9], [0, 1, 0.8], [1, 1, 1.0], [0, 2, 0.5], [1, 2, 0.4]];   // Left foot
        
        // Apply foot shape to the frame
        for (const [dx, dy, factor] of footShape) {
          const posX = x + dx;
          const posY = y + dy;
          if (posX >= 0 && posX < GRID_WIDTH && posY >= 0 && posY < GRID_HEIGHT) {
            frame[posY][posX] = intensity * factor;
          }
        }
        
        return frame;
      };
      
      // Function to add body part pressure (for fall impact)
      const addBodyPressure = (frame: number[][], centerX: number, centerY: number, radiusX: number, radiusY: number, intensity: number = 1.0) => {
        for (let y = Math.max(0, centerY - radiusY); y <= Math.min(GRID_HEIGHT - 1, centerY + radiusY); y++) {
          for (let x = Math.max(0, centerX - radiusX); x <= Math.min(GRID_WIDTH - 1, centerX + radiusX); x++) {
            // Calculate distance from center (normalized ellipse equation)
            const distanceSquared = Math.pow((x - centerX) / radiusX, 2) + Math.pow((y - centerY) / radiusY, 2);
            
            // Apply pressure based on distance from center (more pressure in center, less at edges)
            if (distanceSquared <= 1) {
              const pressureFactor = 1 - Math.sqrt(distanceSquared) * 0.7; // Pressure decreases toward edges
              frame[y][x] = Math.max(frame[y][x], intensity * pressureFactor);
            }
          }
        }
        
        return frame;
      };
      
      console.log("Generating walking phase frames...");
      
      // ----- WALKING PHASE (Frames 0-8) -----
      // Start position at one of the long ends (row 14, near bottom of 15x12 grid)
      
      // Frame 0-2: Standing position with both feet
      for (let i = 0; i < 3; i++) {
        let frame = createEmptyFrame();
        // Starting position at the bottom of grid - both feet
        frame = addFootPressure(frame, 5, 13, 0.9, true);  // Right foot
        frame = addFootPressure(frame, 7, 13, 0.9, false); // Left foot
        
        frames.push({
          frame,
          timestamp: new Date(Date.now() - (totalFrames - i) * 100).toISOString(),
          fallProbability: 0.05
        });
      }
      
      // Frame 3-5: First step forward with right foot
      for (let i = 3; i < 6; i++) {
        let frame = createEmptyFrame();
        frame = addFootPressure(frame, 7, 13, 0.9 - (i-3)*0.1, false); // Left foot stationary, gradually lightening
        frame = addFootPressure(frame, 5, 10, 0.7 + (i-3)*0.1, true);  // Right foot moving forward, gradually increasing pressure
        
        frames.push({
          frame,
          timestamp: new Date(Date.now() - (totalFrames - i) * 100).toISOString(),
          fallProbability: 0.07
        });
      }
      
      // Frame 6-8: Second step forward with left foot
      for (let i = 6; i < 9; i++) {
        let frame = createEmptyFrame();
        // Gradual transition: right foot gradually lifts, left foot gradually lands
        const rightPressure = Math.max(0, 0.9 - (i-6)*0.3);  // Decreasing
        const leftPressure = Math.min(0.9, 0.6 + (i-6)*0.15); // Increasing
        
        if (rightPressure > 0) {
          frame = addFootPressure(frame, 5, 10, rightPressure, true);  // Right foot stationary but lifting
        }
        frame = addFootPressure(frame, 7, 7, leftPressure, false);  // Left foot more forward
        
        frames.push({
          frame,
          timestamp: new Date(Date.now() - (totalFrames - i) * 100).toISOString(),
          fallProbability: 0.1
        });
      }
      
      console.log("Generating transition phase frames...");
      
      // ----- TRANSITION PHASE (Frames 9-12) -----
      // Frame 9-10: Weight shifting backward, beginning to lose balance
      for (let i = 9; i < 11; i++) {
        let frame = createEmptyFrame();
        frame = addFootPressure(frame, 5, 10, 0.8, true);   // Right foot, less pressure on toes
        frame = addFootPressure(frame, 7, 7, 0.8, false);   // Left foot, less pressure on toes
        
        // Add more heel pressure (more weight on heels as balance shifts backward)
        frame[11][5] = 1.0; // Right heel - more pronounced
        frame[8][7] = 1.0;  // Left heel - more pronounced
        
        frames.push({
          frame,
          timestamp: new Date(Date.now() - (totalFrames - i) * 100).toISOString(),
          fallProbability: 0.2 + (i - 9) * 0.2
        });
      }
      
      // Frame 11-12: Stumbling backward, losing balance completely
      for (let i = 11; i < 13; i++) {
        let frame = createEmptyFrame();
        
        // Add fading foot pressure and increasing heel pressure as person stumbles
        if (i === 11) {
          // Unstable foot pressure as balance is lost
          frame = addFootPressure(frame, 5, 10, 0.5, true);   // Right foot, unstable
          frame = addFootPressure(frame, 7, 7, 0.4, false);   // Left foot, lifting
          frame[11][5] = 0.9; // Right heel pressure - strong
          frame[8][7] = 0.8;  // Left heel pressure - strong
        } else {
          // Nearly no toe pressure, mostly heel pressure as fall begins
          frame = addFootPressure(frame, 5, 10, 0.2, true);   // Right foot, barely touching
          frame = addFootPressure(frame, 7, 7, 0.2, false);   // Left foot, barely touching
          frame[11][5] = 0.7; // Right heel pressure - decreasing as falling
          frame[8][7] = 0.6;  // Left heel pressure - decreasing as falling
        }
        
        frames.push({
          frame,
          timestamp: new Date(Date.now() - (totalFrames - i) * 100).toISOString(),
          fallProbability: 0.4 + (i - 11) * 0.3
        });
      }
      
      console.log("Generating impact phase frames...");
      
      // ----- IMPACT SEQUENCE (Frames 13-25) -----
      // Frame 13-15: Hip/Buttocks impact
      for (let i = 13; i < 16; i++) {
        let frame = createEmptyFrame();
        
        // Hip/buttocks impact (centered around row 9, more pronounced)
        frame = addBodyPressure(frame, 6, 9, 1.5, 1, 0.9 + (i - 13) * 0.05);
        
        // Feet still slightly touching ground
        if (i === 13) {
          frame[11][5] = 0.3; // Right heel fading touch
          frame[8][7] = 0.3;  // Left heel fading touch
        }
        
        frames.push({
          frame,
          timestamp: new Date(Date.now() - (totalFrames - i) * 100).toISOString(),
          fallProbability: 0.7 + (i - 13) * 0.1
        });
      }
      
      // Frame 16-19: Lower back impact
      for (let i = 16; i < 20; i++) {
        let frame = createEmptyFrame();
        
        // Hip/buttocks impact remains
        frame = addBodyPressure(frame, 6, 9, 1.5, 1, 1.0);
        
        // Lower back impact (centered around row 7, more centered on grid)
        frame = addBodyPressure(frame, 6, 7, 2, 1.5, 0.8 + (i - 16) * 0.07);
        
        frames.push({
          frame,
          timestamp: new Date(Date.now() - (totalFrames - i) * 100).toISOString(),
          fallProbability: 0.9
        });
      }
      
      // Frame 20-22: Upper back/shoulders impact
      for (let i = 20; i < 23; i++) {
        let frame = createEmptyFrame();
        
        // Previous impacts remain
        frame = addBodyPressure(frame, 6, 9, 1.5, 1, 1.0);     // Hip/buttocks
        frame = addBodyPressure(frame, 6, 7, 2, 1.5, 1.0);     // Lower back
        
        // Upper back impact (centered around row 5, more centered)
        frame = addBodyPressure(frame, 6, 5, 2.5, 1.5, 0.8 + (i - 20) * 0.07);
        
        frames.push({
          frame,
          timestamp: new Date(Date.now() - (totalFrames - i) * 100).toISOString(),
          fallProbability: 0.95
        });
      }
      
      // Frame 23-25: Head contact
      for (let i = 23; i < 26; i++) {
        let frame = createEmptyFrame();
        
        // Previous impacts remain
        frame = addBodyPressure(frame, 6, 9, 1.5, 1, 1.0);   // Hip/buttocks
        frame = addBodyPressure(frame, 6, 7, 2, 1.5, 1.0);   // Lower back
        frame = addBodyPressure(frame, 6, 5, 2.5, 1.5, 1.0); // Upper back
        
        // Head impact (centered around row 3, more centered and pronounced)
        frame = addBodyPressure(frame, 6, 3, 1, 1, 0.8 + (i - 23) * 0.07);
        
        frames.push({
          frame,
          timestamp: new Date(Date.now() - (totalFrames - i) * 100).toISOString(),
          fallProbability: 0.97
        });
      }
      
      console.log("Generating final position frames...");
      
      // ----- FINAL POSITION (Frames 26-45) -----
      // Frame 26-45: Final stable position with subtle variations
      for (let i = 26; i < totalFrames; i++) {
        let frame = createEmptyFrame();
        
        // Complete body contact pattern
        frame = addBodyPressure(frame, 6, 9, 1.5, 1, 1.0);   // Hip/buttocks
        frame = addBodyPressure(frame, 6, 7, 2, 1.5, 1.0);    // Lower back
        frame = addBodyPressure(frame, 6, 5, 2.5, 1.5, 1.0);  // Upper back
        frame = addBodyPressure(frame, 6, 3, 1, 1, 0.9);      // Head
        
        // Add subtle variations to simulate breathing or small movements
        const variationFactor = Math.sin(i * 0.4) * 0.05 + 0.95;
        for (let y = 0; y < GRID_HEIGHT; y++) {
          for (let x = 0; x < GRID_WIDTH; x++) {
            if (frame[y][x] > 0) {
              frame[y][x] *= variationFactor;
            }
          }
        }
        
        frames.push({
          frame,
          timestamp: new Date(Date.now() - (totalFrames - i) * 100).toISOString(),
          fallProbability: 0.99
        });
      }
      
      // Define impact sequence with precise positions and timing
      const bodyImpactSequence: BodyPart[] = [
        { name: "hip", position: [6, 0.3, 9], impact: 0.9 },
        { name: "lower back", position: [6, 0.4, 7], impact: 0.8 },
        { name: "upper back", position: [6, 0.5, 5], impact: 0.7 },
        { name: "head", position: [6, 0.7, 3], impact: 0.6 }
      ];
      
      console.log(`Created ${frames.length} frames for backward fall simulation`);
      
      // Create fall event with complete analysis
      const fallEvent: FallEvent = {
        id: fallEventId,
        timestamp,
        frames,
        fallDetected: true,
        fallProbability: 0.95,
        analysis: {
          type: 'backward fall',
          bodyImpactSequence,
          trajectory: {
            direction: 'backward',
            startPoint: [6, 0, 13],  // Start at the bottom of grid
            endPoint: [6, 0, 3],     // End at the top where head impacts
            impactPoints: [
              [6, 0, 9],   // Hip impact
              [6, 0, 7],   // Lower back impact
              [6, 0, 5],   // Upper back impact
              [6, 0, 3]    // Head impact
            ],
            velocity: 1.2 // Moderate fall velocity
          },
          balanceMetrics: {
            preFailStabilityScore: 0.7,
            asymmetryIndex: 0.3
          }
        }
      };
      
      // Verify frames were created properly
      if (!frames.length) {
        console.error("No frames were created for backward fall simulation!");
        throw new Error("Failed to generate fall frames");
      }
      
      // Add to fall events history
      this.fallEvents.push(fallEvent);
      
      console.log(`Realistic backward fall event created with ${fallEvent.frames.length} frames`);
      
      return fallEvent;
    } catch (error) {
      console.error("Error in backward fall simulation:", error);
      
      // Create simple fallback in case of error
      const simpleEvent = this.createSimpleFallbackEvent('backward');
      this.fallEvents.push(simpleEvent);
      
      return simpleEvent;
    }
  }
  
  /**
   * Create a simple fallback event in case the detailed simulation fails
   */
  private createSimpleFallbackEvent(type: 'forward' | 'backward' | 'left' | 'right'): FallEvent {
    console.log("Creating simple fallback event for", type);
    
    const fallEventId = `fallback-${type}-fall-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    // Create simple frames with basic data
    const frames: FallEventFrame[] = [];
    const baseFrame = Array(15).fill(0).map(() => Array(12).fill(0));
    
    // Add some random data to frame
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 12; j++) {
        if (Math.random() < 0.2) {
          baseFrame[i][j] = Math.random() * 0.8;
        }
      }
    }
    
    // Create 30 simple frames
    for (let i = 0; i < 30; i++) {
      const frameCopy = baseFrame.map(row => [...row]);
      frames.push({
        frame: frameCopy,
        timestamp: new Date(Date.now() - (30 - i) * 100).toISOString(),
        fallProbability: i > 15 ? 0.9 : i / 15
      });
    }
    
    // Create body parts
    const bodyParts: BodyPart[] = [];
    if (type === 'backward') {
      bodyParts.push(
        { name: 'back', position: [0, 0.8, 0.5], impact: 0.9 },
        { name: 'head', position: [0, 1.2, 0.7], impact: 0.8 },
        { name: 'hands', position: [0, 0.5, 0.4], impact: 0.7 }
      );
    }
    
    return {
      id: fallEventId,
      timestamp,
      frames,
      fallDetected: true,
      fallProbability: 0.95,
      analysis: {
        type: `${type} fall`,
        bodyImpactSequence: bodyParts,
        trajectory: {
          direction: type,
          startPoint: [0, 0, 0],
          endPoint: calculateEndPoint(type),
          impactPoints: [[0, 0, 0]],
          velocity: 1.5
        },
        balanceMetrics: {
          preFailStabilityScore: 0.7,
          asymmetryIndex: 0.3
        }
      }
    };
  }
  
  // Get all fall events
  getFallEvents(): FallEvent[] {
    return this.fallEvents;
  }
  
  // Get a specific fall event by ID
  getFallEvent(id: string): FallEvent | undefined {
    return this.fallEvents.find(event => event.id === id);
  }
  
  // Get the most recent fall event (only if one exists, does NOT auto-simulate)
  getMostRecentFallEvent(): FallEvent | undefined {
    if (this.fallEvents.length === 0) {
      // Return undefined instead of auto-simulating
      return undefined;
    }
    return this.fallEvents[this.fallEvents.length - 1];
  }
  
  // === Playback Control Methods ===
  
  // Start playback of a fall event
  startPlayback(fallEventId: string, options?: Partial<PlaybackSettings>): void {
    try {
      const fallEvent = this.getFallEvent(fallEventId);
      if (!fallEvent || fallEvent.frames.length === 0) return;
      
      // Stop any existing playback
      this.stopPlayback();
      
      // Set playback settings
      this.playbackSettings = {
        ...DEFAULT_PLAYBACK_SETTINGS,
        ...options
      };
      
      // Set playback status to playing
      this.playbackStatus = 'playing';
      
      // Start playback interval
      const frameDelay = 1000 / (15 * this.playbackSettings.speed); // Assuming 15fps
      this.playbackIntervalId = window.setInterval(() => {
        this.advancePlayback();
      }, frameDelay);
      
      // Trigger initial frame
      this.triggerPlaybackCallbacks(fallEvent.frames[this.playbackSettings.currentFrameIndex]);
    } catch (error) {
      console.error("Error starting playback:", error);
    }
  }
  
  // Pause playback
  pausePlayback(): void {
    try {
      if (this.playbackStatus !== 'playing') return;
      
      this.playbackStatus = 'paused';
      
      if (this.playbackIntervalId !== null) {
        window.clearInterval(this.playbackIntervalId);
        this.playbackIntervalId = null;
      }
    } catch (error) {
      console.error("Error pausing playback:", error);
    }
  }
  
  // Resume playback
  resumePlayback(): void {
    try {
      if (this.playbackStatus !== 'paused') return;
      
      this.playbackStatus = 'playing';
      
      // Start playback interval
      const frameDelay = 1000 / (15 * this.playbackSettings.speed); // Assuming 15fps
      this.playbackIntervalId = window.setInterval(() => {
        this.advancePlayback();
      }, frameDelay);
    } catch (error) {
      console.error("Error resuming playback:", error);
    }
  }
  
  // Stop playback
  stopPlayback(): void {
    try {
      if (this.playbackIntervalId !== null) {
        window.clearInterval(this.playbackIntervalId);
        this.playbackIntervalId = null;
      }
      
      this.playbackStatus = 'stopped';
      this.playbackSettings.currentFrameIndex = 0;
      
      // Clear current frame
      this.triggerPlaybackCallbacks(null);
    } catch (error) {
      console.error("Error stopping playback:", error);
    }
  }
  
  // Seek to a specific frame
  seekToFrame(frameIndex: number, fallEventId: string): void {
    try {
      console.log(`Seeking to frame ${frameIndex} for event ${fallEventId}`);
      const fallEvent = this.getFallEvent(fallEventId);
      if (!fallEvent || !fallEvent.frames.length) {
        console.error(`Cannot seek: fall event ${fallEventId} not found or has no frames`);
        return;
      }
      
      // Ensure index is within bounds
      const index = Math.max(0, Math.min(frameIndex, fallEvent.frames.length - 1));
      
      // Update current playback state
      this.playbackStatus = 'paused';
      this.playbackSettings.currentFrameIndex = index;
      
      // Cache the frame for quick access
      const targetFrame = fallEvent.frames[index];
      if (!targetFrame) {
        console.error(`No frame found at index ${index}`);
        return;
      }
      
      // Log detailed seek information for debugging
      console.log(`Seeking to frame ${index}/${fallEvent.frames.length - 1}, timestamp: ${new Date(targetFrame.timestamp).toLocaleTimeString()}`);
      
      // Trigger callback for the new frame
      this.triggerPlaybackCallbacks(targetFrame);
    } catch (error) {
      console.error("Error seeking to frame:", error);
    }
  }
  
  // Set playback speed
  setPlaybackSpeed(speed: number): void {
    try {
      this.playbackSettings.speed = speed;
      
      // If playing, restart interval with new speed
      if (this.playbackStatus === 'playing' && this.playbackIntervalId !== null) {
        window.clearInterval(this.playbackIntervalId);
        
        const frameDelay = 1000 / (15 * this.playbackSettings.speed); // Assuming 15fps
        this.playbackIntervalId = window.setInterval(() => {
          this.advancePlayback();
        }, frameDelay);
      }
    } catch (error) {
      console.error("Error setting playback speed:", error);
    }
  }
  
  // Set looping
  setLooping(loop: boolean): void {
    try {
      this.playbackSettings.loop = loop;
    } catch (error) {
      console.error("Error setting loop:", error);
    }
  }
  
  // Register a callback for playback frames
  registerPlaybackCallback(callback: (frame: FallEventFrame | null) => void): () => void {
    try {
      this.playbackCallbacks.push(callback);
      
      // Return unregister function
      return () => {
        const index = this.playbackCallbacks.indexOf(callback);
        if (index !== -1) {
          this.playbackCallbacks.splice(index, 1);
        }
      };
    } catch (error) {
      console.error("Error registering playback callback:", error);
      return () => {}; // Return empty function on error
    }
  }
  
  // Get current playback status
  getPlaybackStatus(): PlaybackStatus {
    return this.playbackStatus;
  }
  
  // Get current playback settings
  getPlaybackSettings(): PlaybackSettings {
    return { ...this.playbackSettings };
  }
  
  // Private method to advance playback
  private advancePlayback(): void {
    try {
      // Find current fall event
      const currentEventId = this.fallEvents.find(event => 
        this.playbackStatus !== 'stopped' && 
        (this.playbackSettings.currentFrameIndex < event.frames.length))?.id;
      
      if (!currentEventId) {
        this.stopPlayback();
        return;
      }
      
      const fallEvent = this.getFallEvent(currentEventId);
      if (!fallEvent) {
        this.stopPlayback();
        return;
      }
      
      // Advance to next frame
      const nextFrameIndex = this.playbackSettings.currentFrameIndex + 1;
      
      // Check if we've reached the end
      if (nextFrameIndex >= fallEvent.frames.length) {
        if (this.playbackSettings.loop) {
          // Loop back to start
          this.playbackSettings.currentFrameIndex = 0;
          this.triggerPlaybackCallbacks(fallEvent.frames[0]);
        } else {
          // Stop playback
          this.stopPlayback();
        }
      } else {
        // Advance to next frame
        this.playbackSettings.currentFrameIndex = nextFrameIndex;
        this.triggerPlaybackCallbacks(fallEvent.frames[nextFrameIndex]);
      }
    } catch (error) {
      console.error("Error advancing playback:", error);
      this.stopPlayback(); // Stop playback on error
    }
  }
  
  // Trigger all playback callbacks with current frame
  private triggerPlaybackCallbacks(frame: FallEventFrame | null): void {
    try {
      for (const callback of this.playbackCallbacks) {
        callback(frame);
      }
    } catch (error) {
      console.error("Error triggering playback callbacks:", error);
    }
  }
  
  // Analyze fall data to extract insights
  private analyzeFall(fallEvent: FallEvent): FallAnalysis {
    try {
      // This is a simplified analysis - would be more sophisticated in production
      
      // Find the time of highest fall probability
      let fallIndex = 0;
      let maxProbability = 0;
      
      for (let i = 0; i < fallEvent.frames.length; i++) {
        if (fallEvent.frames[i].fallProbability > maxProbability) {
          maxProbability = fallEvent.frames[i].fallProbability;
          fallIndex = i;
        }
      }
      
      // Get frames before and after the fall
      const preFrames = fallEvent.frames.slice(Math.max(0, fallIndex - 15), fallIndex);
      const postFrames = fallEvent.frames.slice(fallIndex, Math.min(fallEvent.frames.length, fallIndex + 15));
      
      // Determine direction of fall
      const direction = this.determineFallDirection(preFrames, postFrames);
      
      // Calculate center of pressure (CoP) before and during fall
      let startCoP: [number, number, number] | null = null;
      let midCoP: [number, number, number] | null = null;
      
      if (preFrames.length > 0) {
        const startFrame = preFrames[0].frame;
        startCoP = this.calculateCenterOfPressure(startFrame);
      }
      
      if (postFrames.length > 0) {
        const midFrame = postFrames[0].frame;
        midCoP = this.calculateCenterOfPressure(midFrame);
      }
      
      // Find impact points (highest pressure points during fall)
      const impactPoints = this.findImpactPoints(postFrames);
      
      // Create body parts based on impact points and fall direction
      const bodyParts: BodyPart[] = this.estimateBodyParts(impactPoints, direction);
      
      // Create fall analysis
      return {
        type: this.determineFallType(direction),
        bodyImpactSequence: bodyParts,
        trajectory: {
          direction,
          startPoint: startCoP || [0, 0, 0],
          endPoint: midCoP || [0, 0, 0],
          impactPoints,
          velocity: 2.5 // Placeholder value
        },
        balanceMetrics: {
          preFailStabilityScore: 0.4, // Placeholder value
          asymmetryIndex: 0.3 // Placeholder value
        }
      };
    } catch (error) {
      console.error("Error analyzing fall:", error);
      // Return a default analysis on error
      return {
        type: "unknown",
        bodyImpactSequence: [],
        trajectory: {
          direction: "unknown",
          startPoint: [0, 0, 0],
          endPoint: [0, 0, 0],
          impactPoints: [],
          velocity: 0
        },
        balanceMetrics: {
          preFailStabilityScore: 0,
          asymmetryIndex: 0
        }
      };
    }
  }
  
  // Helper: Calculate center of pressure from a grid frame
  private calculateCenterOfPressure(frame: number[][]): [number, number, number] {
    try {
      let totalPressure = 0;
      let weightedX = 0;
      let weightedY = 0;
      
      for (let y = 0; y < frame.length; y++) {
        for (let x = 0; x < frame[y].length; x++) {
          const pressure = frame[y][x];
          totalPressure += pressure;
          weightedX += x * pressure;
          weightedY += y * pressure;
        }
      }
      
      if (totalPressure === 0) {
        return [frame[0].length / 2, 0, frame.length / 2];
      }
      
      // Adjust for grid center
      const centerX = weightedX / totalPressure;
      const centerY = weightedY / totalPressure;
      
      // Convert to 3D coordinates
      return [centerX - frame[0].length / 2, 0, centerY - frame.length / 2];
    } catch (error) {
      console.error("Error calculating center of pressure:", error);
      return [0, 0, 0];
    }
  }
  
  // Helper: Find impact points in frames
  private findImpactPoints(frames: FallEventFrame[]): [number, number, number][] {
    try {
      const impactPoints: [number, number, number][] = [];
      const highPressureThreshold = 0.7;
      
      // Combine frames to find high pressure points
      const combinedPressure: number[][] = [];
      
      // Initialize combined pressure grid
      if (frames.length > 0 && frames[0].frame.length > 0) {
        for (let y = 0; y < frames[0].frame.length; y++) {
          combinedPressure[y] = [];
          for (let x = 0; x < frames[0].frame[y].length; x++) {
            combinedPressure[y][x] = 0;
          }
        }
        
        // Aggregate pressure across frames
        for (const frame of frames) {
          for (let y = 0; y < frame.frame.length; y++) {
            for (let x = 0; x < frame.frame[y].length; x++) {
              combinedPressure[y][x] = Math.max(combinedPressure[y][x], frame.frame[y][x]);
            }
          }
        }
        
        // Find high pressure points
        for (let y = 0; y < combinedPressure.length; y++) {
          for (let x = 0; x < combinedPressure[y].length; x++) {
            if (combinedPressure[y][x] > highPressureThreshold) {
              // Convert to 3D coordinates
              impactPoints.push([
                x - combinedPressure[y].length / 2, 
                0, 
                y - combinedPressure.length / 2
              ]);
            }
          }
        }
      }
      
      return impactPoints;
    } catch (error) {
      console.error("Error finding impact points:", error);
      return [];
    }
  }
  
  // Helper: Determine fall direction from frames
  private determineFallDirection(preFrames: FallEventFrame[], postFrames: FallEventFrame[]): string {
    try {
      // Simple heuristic based on pressure shift
      if (preFrames.length === 0 || postFrames.length === 0) {
        return 'forward'; // Default if no data
      }
      
      const preCoP = this.calculateCenterOfPressure(preFrames[0].frame);
      const postCoP = this.calculateCenterOfPressure(postFrames[0].frame);
      
      const dx = postCoP[0] - preCoP[0];
      const dz = postCoP[2] - preCoP[2];
      
      if (Math.abs(dx) > Math.abs(dz)) {
        return dx > 0 ? 'right' : 'left';
      } else {
        return dz > 0 ? 'backward' : 'forward';
      }
    } catch (error) {
      console.error("Error determining fall direction:", error);
      return 'forward'; // Default on error
    }
  }
  
  // Helper: Estimate body parts from impact points
  private estimateBodyParts(impactPoints: [number, number, number][], direction: string): BodyPart[] {
    try {
      const bodyParts: BodyPart[] = [];
      
      if (impactPoints.length === 0) {
        // If no impact points, create generic body layout based on direction
        switch (direction) {
          case 'forward':
            bodyParts.push({ name: 'head', position: [0, 0.3, -1] });
            bodyParts.push({ name: 'hands', position: [0, 0.2, -0.5] });
            bodyParts.push({ name: 'knees', position: [0, 0.1, 0.5] });
            break;
          case 'backward':
            bodyParts.push({ name: 'back of head', position: [0, 0.3, 1] });
            bodyParts.push({ name: 'back', position: [0, 0.2, 0.5] });
            bodyParts.push({ name: 'hips', position: [0, 0.1, 0] });
            break;
          case 'left':
            bodyParts.push({ name: 'left shoulder', position: [-1, 0.3, 0] });
            bodyParts.push({ name: 'left hip', position: [-0.5, 0.2, 0] });
            bodyParts.push({ name: 'left leg', position: [0, 0.1, 0] });
            break;
          case 'right':
            bodyParts.push({ name: 'right shoulder', position: [1, 0.3, 0] });
            bodyParts.push({ name: 'right hip', position: [0.5, 0.2, 0] });
            bodyParts.push({ name: 'right leg', position: [0, 0.1, 0] });
            break;
        }
      } else {
        // Map impact points to body parts based on direction
        const bodyPartNames = this.mapImpactPointsToBodyParts(impactPoints, direction);
        
        // Create body parts from mapped names and impact points
        for (let i = 0; i < impactPoints.length; i++) {
          if (i < bodyPartNames.length) {
            bodyParts.push({
              name: bodyPartNames[i],
              position: impactPoints[i]
            });
          }
        }
      }
      
      return bodyParts;
    } catch (error) {
      console.error("Error estimating body parts:", error);
      return [];
    }
  }
  
  // Helper: Map impact points to body part names
  private mapImpactPointsToBodyParts(impactPoints: [number, number, number][], direction: string): string[] {
    try {
      // Simple mapping based on fall direction
      switch (direction) {
        case 'forward':
          return ['face', 'chest', 'hands', 'knees'].slice(0, impactPoints.length);
        case 'backward':
          return ['back of head', 'upper back', 'lower back', 'buttocks'].slice(0, impactPoints.length);
        case 'left':
          return ['left shoulder', 'left arm', 'left hip', 'left leg'].slice(0, impactPoints.length);
        case 'right':
          return ['right shoulder', 'right arm', 'right hip', 'right leg'].slice(0, impactPoints.length);
        default:
          return impactPoints.map((_, i) => `body part ${i + 1}`);
      }
    } catch (error) {
      console.error("Error mapping impact points to body parts:", error);
      return [];
    }
  }
  
  // Helper: Determine fall type based on direction
  private determineFallType(direction: string): string {
    try {
      // Simple heuristic
      switch (direction) {
        case 'forward':
          return 'trip';
        case 'backward':
          return 'slip';
        case 'left':
        case 'right':
          return 'sideway fall';
        default:
          return 'collapse';
      }
    } catch (error) {
      console.error("Error determining fall type:", error);
      return 'unknown';
    }
  }
}

// Export singleton instance
export const fallEventCapture = new FallEventCaptureService(); 

// Helper function to calculate endpoint based on direction
function calculateEndPoint(direction: string): [number, number, number] {
  switch(direction) {
    case 'forward': return [0, 0, -1];
    case 'backward': return [0, 0, 1];
    case 'left': return [-1, 0, 0];
    case 'right': return [1, 0, 0];
    default: return [0, 0, 0];
  }
} 