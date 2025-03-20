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
  direction: string; // forward, backward, left, right
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
          frame: [...baseFrame],
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
            { name: 'hips', position: [0, 0.4, 0.3] }
          );
          break;
        case 'left':
          bodyParts.push(
            { name: 'left shoulder', position: [-0.5, 1.0, 0] },
            { name: 'left hip', position: [-0.3, 0.5, 0] },
            { name: 'head', position: [-0.7, 1.2, 0] }
          );
          break;
        case 'right':
          bodyParts.push(
            { name: 'right shoulder', position: [0.5, 1.0, 0] },
            { name: 'right hip', position: [0.3, 0.5, 0] },
            { name: 'head', position: [0.7, 1.2, 0] }
          );
          break;
      }
      
      // Create test fall event
      const fallEvent: FallEvent = {
        id: fallEventId,
        timestamp,
        frames,
        fallDetected: true,
        fallProbability: 0.9,
        analysis: {
          type: type === 'forward' ? 'trip' : 
                type === 'backward' ? 'slip' : 'sideway fall',
          bodyImpactSequence: bodyParts,
          trajectory: {
            direction: type,
            startPoint: [0, 0, 0],
            endPoint: type === 'forward' ? [0, 0, -1] : 
                      type === 'backward' ? [0, 0, 1] :
                      type === 'left' ? [-1, 0, 0] : [1, 0, 0],
            impactPoints: bodyParts.map(part => part.position),
            velocity: 2.5
          },
          balanceMetrics: {
            preFailStabilityScore: 0.4,
            asymmetryIndex: 0.3
          }
        }
      };
      
      // Add to history
      this.fallEvents.push(fallEvent);
      
      console.log("Simulated fall event created:", fallEvent);
      
      return fallEvent;
    } catch (error) {
      console.error("Error simulating fall event:", error);
      return { ...EMPTY_FALL_EVENT };
    }
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
      const fallEvent = this.getFallEvent(fallEventId);
      if (!fallEvent || !fallEvent.frames.length) return;
      
      // Ensure index is within bounds
      const index = Math.max(0, Math.min(frameIndex, fallEvent.frames.length - 1));
      this.playbackSettings.currentFrameIndex = index;
      
      // Trigger callback for the new frame
      this.triggerPlaybackCallbacks(fallEvent.frames[index]);
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