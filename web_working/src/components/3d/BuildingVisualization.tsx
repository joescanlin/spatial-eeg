import React, { useState, useRef, useEffect, useMemo, Suspense, useCallback, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Text, 
  Environment,
  useGLTF,
  Html,
  useTexture,
  PerspectiveCamera,
  Stats,
  Grid,
  Sky,
  Billboard,
  Line,
  useProgress,
  Center
} from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, animated, config } from '@react-spring/three';
import { GridData } from '../../types/grid';
import BuildingModel, { Room, generateHospitalLayout } from './BuildingModel';
import gsap from 'gsap';

// Path growth configuration
const PATH_GROWTH_CONFIG = {
  // Growth rate in world units per minute (now much faster for simulation)
  METERS_PER_MINUTE: 50.0,
  // Minimum initial segments to show
  INITIAL_SEGMENTS: 3,
  // Default speed multiplier (user adjustable via slider)
  DEFAULT_SPEED: 1.0
};

// Convert to units per millisecond for internal calculations
const GROWTH_RATE_MS = PATH_GROWTH_CONFIG.METERS_PER_MINUTE / (1000 * 60);

// File paths
// const HOSPITAL_MODEL_PATH = '/models/hospital.glb'; // We'll need to add this model file

interface BuildingVisualizationProps {
  data: GridData;
}

// Waypoint for path visualization
interface Waypoint {
  position: THREE.Vector3;
  timestamp: number;
  type: 'walking' | 'standing' | 'transition';
  duration?: number; // Duration at this point in seconds (for standing)
}

// Path with metadata
interface Path {
  id: string;
  name: string;
  color: string;
  waypoints: Waypoint[];
  startTime: number;
  endTime: number;
  frequency: number; // Estimated frequency per day
}

// Path growth state
interface PathGrowthState {
  visibleDistance: number;
  totalLength: number;
  visiblePoints: THREE.Vector3[];
  visibleWaypoints: Waypoint[];
  dwellPoints: {position: THREE.Vector3, duration: number}[];
  isComplete: boolean;
}

// Sample hospital paths (until we get real data)
const SAMPLE_PATHS: Path[] = [
  {
    id: 'nurse-rounds',
    name: 'Staff Circulation',
    color: '#3b82f6', // blue
    waypoints: [] as Waypoint[], // Explicitly type as Waypoint array
    startTime: 0,
    endTime: 0,
    frequency: 24
  },
  {
    id: 'patient-bathroom',
    name: 'Patient Movement',
    color: '#8b5cf6', // purple
    waypoints: [] as Waypoint[],
    startTime: 0,
    endTime: 0,
    frequency: 8
  },
  {
    id: 'visitor-path',
    name: 'Visitor Traffic',
    color: '#10b981', // green
    waypoints: [] as Waypoint[],
    startTime: 0,
    endTime: 0,
    frequency: 12
  },
  {
    id: 'doctor-consult',
    name: 'Emergency Routes',
    color: '#f59e0b', // amber
    waypoints: [] as Waypoint[],
    startTime: 0,
    endTime: 0,
    frequency: 6
  }
];

// Loading screen while model loads
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center bg-gray-800 bg-opacity-80 p-6 rounded-lg">
        <div className="text-xl font-bold text-white mb-2">Loading Hospital Model</div>
        <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-blue-300 mt-2">{progress.toFixed(0)}%</div>
      </div>
    </Html>
  );
}

// Hospital model component with optimizations
function HospitalModel({ onLoad }: { onLoad: (rooms: Room[]) => void }) {
  return (
    <BuildingModel onLoad={onLoad} />
  );
}

/**
 * Path grower class - handles deterministic path growth calculations
 * Based on elapsed time and growth rate
 */
class PathGrower {
  private pathPoints: THREE.Vector3[];
  private waypoints: Waypoint[];
  private segments: { start: number, end: number, length: number }[];
  private totalLength: number;
  private startTime: number;
  private speedMultiplier: number;
  
  constructor(waypoints: Waypoint[], speedMultiplier = PATH_GROWTH_CONFIG.DEFAULT_SPEED) {
    this.waypoints = waypoints;
    this.startTime = Date.now();
    this.speedMultiplier = speedMultiplier;
    
    // Initialize with valid points
    this.pathPoints = this.generateSmoothPath(waypoints);
    
    // Calculate segment lengths and total path length
    this.segments = this.calculateSegments();
    this.totalLength = this.segments.reduce((sum, segment) => sum + segment.length, 0);
  }
  
  /**
   * Reset the growth animation
   */
  reset() {
    this.startTime = Date.now();
  }
  
  /**
   * Update the speed multiplier
   */
  setSpeedMultiplier(multiplier: number) {
    // Save current progress
    const currentDistance = this.getVisibleDistance();
    
    // Update speed
    this.speedMultiplier = multiplier;
    
    // Adjust start time to maintain current progress
    const elapsedMs = (currentDistance - this.getInitialDistance()) / (GROWTH_RATE_MS * this.speedMultiplier);
    this.startTime = Date.now() - elapsedMs;
  }
  
  /**
   * Generate a smooth path through waypoints
   */
  private generateSmoothPath(waypoints: Waypoint[]): THREE.Vector3[] {
    if (waypoints.length < 2) return [];
    
    try {
      // Extract positions from waypoints
      const positions = waypoints.map(wp => wp.position);
      
      // Create a smooth curve through points
      const curve = new THREE.CatmullRomCurve3(positions);
      
      // Generate enough points for a smooth curve
      return curve.getPoints(Math.max(50, positions.length * 10));
    } catch (error) {
      console.warn("Error creating smooth path, using direct points:", error);
      return waypoints.map(wp => wp.position);
    }
  }
  
  /**
   * Calculate path segments and their lengths
   */
  private calculateSegments() {
    const segments = [];
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const start = i;
      const end = i + 1;
      const length = this.pathPoints[i].distanceTo(this.pathPoints[i + 1]);
      segments.push({ start, end, length });
    }
    return segments;
  }
  
  /**
   * Calculate the visible distance based on elapsed time
   */
  private getVisibleDistance(): number {
    const elapsedMs = Date.now() - this.startTime;
    return (elapsedMs * GROWTH_RATE_MS * this.speedMultiplier) + this.getInitialDistance();
  }
  
  /**
   * Get initial distance to show (for immediate visibility)
   */
  private getInitialDistance(): number {
    if (this.segments.length <= PATH_GROWTH_CONFIG.INITIAL_SEGMENTS) {
      return 0; // Show all if we have fewer segments than initial
    }
    
    // Calculate distance covered by initial segments
    let distance = 0;
    for (let i = 0; i < PATH_GROWTH_CONFIG.INITIAL_SEGMENTS; i++) {
      if (i < this.segments.length) {
        distance += this.segments[i].length;
      }
    }
    return distance;
  }
  
  /**
   * Get waypoints that are within the visible distance
   */
  private getVisibleWaypoints(visibleDistance: number): Waypoint[] {
    if (visibleDistance >= this.totalLength) {
      return this.waypoints;
    }
    
    let accumulatedDistance = 0;
    let lastWaypointIndex = 0;
    
    // Find waypoint positions along the original path
    const waypointPositions = this.waypoints.map(wp => wp.position);
    
    // Find the waypoint index corresponding to the visible distance
    for (let i = 0; i < waypointPositions.length - 1; i++) {
      const segmentLength = waypointPositions[i].distanceTo(waypointPositions[i + 1]);
      if (accumulatedDistance + segmentLength > visibleDistance) {
        lastWaypointIndex = i;
        break;
      }
      accumulatedDistance += segmentLength;
      lastWaypointIndex = i + 1;
    }
    
    // Return waypoints up to and including the last visible one
    return this.waypoints.slice(0, lastWaypointIndex + 1);
  }
  
  /**
   * Get points that are within the visible distance
   */
  private getVisiblePoints(visibleDistance: number): THREE.Vector3[] {
    if (visibleDistance >= this.totalLength) {
      return this.pathPoints;
    }
    
    let accumulatedDistance = 0;
    let visiblePoints: THREE.Vector3[] = [];
    
    // Add all fully visible segments
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      
      if (accumulatedDistance + segment.length <= visibleDistance) {
        // Segment is fully visible
        visiblePoints.push(this.pathPoints[segment.start]);
        accumulatedDistance += segment.length;
      } else {
        // Segment is partially visible
        visiblePoints.push(this.pathPoints[segment.start]);
        
        // Calculate partial visibility
        const remainingDistance = visibleDistance - accumulatedDistance;
        const ratio = remainingDistance / segment.length;
        
        // Interpolate the final point position
        const partialPoint = new THREE.Vector3().lerpVectors(
          this.pathPoints[segment.start],
          this.pathPoints[segment.end],
          ratio
        );
        
        visiblePoints.push(partialPoint);
        break;
      }
    }
    
    // Always add at least two points for a valid line
    if (visiblePoints.length < 2 && this.pathPoints.length >= 2) {
      visiblePoints = [this.pathPoints[0], this.pathPoints[1]];
    }
    
    return visiblePoints;
  }
  
  /**
   * Calculate dwell points for standing waypoints
   */
  private calculateDwellPoints(visibleWaypoints: Waypoint[]): {position: THREE.Vector3, duration: number}[] {
    return visibleWaypoints
      .filter(wp => wp.type === 'standing' && wp.duration)
      .map(wp => ({
        position: wp.position,
        duration: wp.duration || 0
      }));
  }
  
  /**  * Get the current growth state
   */
  getGrowthState(): PathGrowthState {
    const visibleDistance = this.getVisibleDistance();
    const visiblePoints = this.getVisiblePoints(visibleDistance);
    const visibleWaypoints = this.getVisibleWaypoints(visibleDistance);
    const dwellPoints = this.calculateDwellPoints(visibleWaypoints);
    
    return {
      visibleDistance,
      totalLength: this.totalLength,
      visiblePoints,
      visibleWaypoints,
      dwellPoints,
      isComplete: visibleDistance >= this.totalLength
    };
  }
}

/**
 * Memo-wrapped path component for efficient rendering
 */
const MemorizedPath = memo(
  function PathComponent({ 
    path, 
    growthState 
  }: { 
    path: Path, 
    growthState: PathGrowthState 
  }) {
    // Use the clock from THREE.js for the pulse animation only
    const clock = new THREE.Clock();
    
    // Dwell circles rendering function
    const renderDwellCircle = (position: THREE.Vector3, duration: number, color: string, index: number) => {
      // Scale circle size based on duration, with a minimum size
      const size = Math.max(0.3, Math.min(1.5, duration / 20));
      
      // Create a pulsing effect with unique phase for each dwell point
      const pulseScale = 1 + Math.sin(clock.getElapsedTime() * 1.5 + index * 0.7) * 0.15;
      
      return (
        <group key={`dwell-${index}`} position={[position.x, 0.05, position.z]}>
          {/* Outer circle with glow effect */}
          <mesh rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[size * pulseScale * 0.9, size * pulseScale, 32]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
          
          {/* Main dwell circle */}
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>
            <circleGeometry args={[size * 0.9 * pulseScale, 32]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
          
          {/* Inner circle */}
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
            <circleGeometry args={[size * 0.5 * pulseScale, 32]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      );
    };
    
    return (
      <group key={path.id}>
        {/* Render path using the calculated visible points */}
        <Line
          points={growthState.visiblePoints}
          color={path.color}
          lineWidth={2.5}
          transparent
          opacity={0.7}
        />
        
        {/* Render smaller spheres only at key waypoints */}
        {growthState.visibleWaypoints.filter((_, i) => i % 3 === 0 || i === growthState.visibleWaypoints.length - 1).map((wp, i) => (
          <mesh key={`${path.id}-point-${i}`} position={[wp.position.x, wp.position.y, wp.position.z]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color={path.color} transparent opacity={0.8} />
          </mesh>
        ))}
        
        {/* Render dwell circles for standing points with duration */}
        {growthState.dwellPoints.map((dwellPoint, i) => renderDwellCircle(dwellPoint.position, dwellPoint.duration, path.color, i))}
      </group>
    );
  },
  // Deep comparison to prevent unnecessary re-renders - only update when visible points change
  (prevProps, nextProps) => {
    // Only re-render if visible points length changed (path grew)
    return prevProps.growthState.visiblePoints.length === nextProps.growthState.visiblePoints.length;
  }
);

/**
 * Main path visualization component using time-based growth
 */
function PathVisualization({ paths, visible, onResetRef, speedMultiplier = PATH_GROWTH_CONFIG.DEFAULT_SPEED, onSpeedChange }: { 
  paths: Path[], 
  visible: boolean,
  onResetRef: React.MutableRefObject<() => void>,
  speedMultiplier: number,
  onSpeedChange?: (multiplier: number) => void
}) {
  if (!visible || paths.length === 0) return null;
  
  // Store path growers keyed by path ID
  const pathGrowersRef = useRef<Map<string, PathGrower>>(new Map());
  
  // Store growth state for each path - use state to force updates only when needed
  const [pathStates, setPathStates] = useState<Map<string, PathGrowthState>>(new Map());
  
  // Counter used to force a re-render periodically without update floods
  const [updateCounter, setUpdateCounter] = useState(0);
  
  // Track previous speed multiplier to detect changes
  const prevSpeedMultiplierRef = useRef(speedMultiplier);
  
  // Update interval in milliseconds - adjust based on speed (faster updates for higher speeds)
  const UPDATE_INTERVAL = Math.max(1000, 10000 / speedMultiplier); // Between 1-10 seconds
  
  // Initialize path growers for all paths
  useEffect(() => {
    // Create growers for paths that don't have one yet
    paths.forEach(path => {
      if (path.waypoints.length >= 2 && !pathGrowersRef.current.has(path.id)) {
        pathGrowersRef.current.set(path.id, new PathGrower(path.waypoints, speedMultiplier));
      }
    });
    
    // Update existing growers with new speed
    if (speedMultiplier !== prevSpeedMultiplierRef.current) {
      pathGrowersRef.current.forEach(grower => {
        grower.setSpeedMultiplier(speedMultiplier);
      });
      prevSpeedMultiplierRef.current = speedMultiplier;
    }
    
    // Calculate initial states for all paths
    updatePathStates();
    
    // Initialize the update interval
    const intervalId = setInterval(() => {
      // Increment counter to trigger re-render
      setUpdateCounter(prev => prev + 1);
    }, UPDATE_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [paths, speedMultiplier]); // Re-run when paths or speed changes

  // Update path states from growers
  const updatePathStates = () => {
    const newStates = new Map();
    
    // Get current state for each path
    pathGrowersRef.current.forEach((grower, pathId) => {
      newStates.set(pathId, grower.getGrowthState());
    });
    
    setPathStates(newStates);
  };
  
  // Reset function for all paths
  const resetPaths = useCallback(() => {
    // Reset all path growers
    pathGrowersRef.current.forEach(grower => {
      grower.reset();
    });
    
    // Update states immediately
    updatePathStates();
    console.log('Path animations reset');
  }, []);
  
  // Set up reset function for parent
  useEffect(() => {
    onResetRef.current = resetPaths;
    return () => {
      onResetRef.current = () => {};
    };
  }, [resetPaths, onResetRef]);
  
  return (
    <group>
      {/* Render each path component with its current growth state */}
      {paths.map(path => {
        const growthState = pathStates.get(path.id);
        
        if (!growthState) return null;
        
        return (
          <MemorizedPath 
            key={path.id} 
            path={path} 
            growthState={growthState} 
          />
        );
      })}
    </group>
  );
}

// Room highlighting and selection
function RoomHighlight({ room, selected, onClick }: { 
  room: Room, 
  selected: boolean, 
  onClick: () => void 
}) {
  // Create a box representing room boundaries
  const { min, max } = room.bounds;
  const size = new THREE.Vector3().subVectors(max, min);
  const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
  
  // Spring animation for selection
  const { scale, opacity, color } = useSpring({
    scale: selected ? 1.02 : 1,
    opacity: selected ? 0.4 : 0.1,
    color: selected ? '#3b82f6' : '#9ca3af',
    config: { tension: 120, friction: 14 }
  });
  
  return (
    <>
      <animated.mesh 
        position={center} 
        scale={scale}
        onClick={onClick}
      >
        <boxGeometry args={[size.x, size.y, size.z]} />
        <animated.meshBasicMaterial 
          color={color} 
          transparent 
          opacity={opacity} 
          wireframe={!selected}
        />
      </animated.mesh>
      
      {/* Room label */}
      <Billboard
        position={[center.x, max.y + 0.2, center.z]}
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        <Text
          fontSize={0.3}
          color={selected ? '#ffffff' : '#9ca3af'}
          anchorX="center"
          anchorY="middle"
        >
          {room.name}
        </Text>
      </Billboard>
    </>
  );
}

// Room details panel
function RoomDetailsPanel({ room, onClose }: { room: Room, onClose: () => void }) {
  if (!room) return null;
  
  return (
    <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-90 p-5 rounded-lg text-white w-72 shadow-lg">
      <h3 className="text-lg font-bold mb-2">{room.name}</h3>
      <div className="text-sm opacity-80 mb-4 flex items-center">
        <span className="px-2 py-0.5 bg-gray-700 rounded">{room.type}</span>
        <span className="ml-2 text-gray-400">
          {((room.bounds.max.x - room.bounds.min.x) * (room.bounds.max.z - room.bounds.min.z)).toFixed(1)} sq ft
        </span>
      </div>
      
      {room.occupancyData && (
        <>
          <h4 className="text-sm font-semibold text-blue-300 mb-2">Space Utilization Metrics</h4>
          <div className="space-y-3 mb-4">
            <div>
              <div className="flex justify-between">
                <span className="text-gray-300">Daily Traffic:</span>
                <span className="font-medium">{room.occupancyData.avgVisits} visits</span>
              </div>
              <div className="w-full bg-gray-700 h-1.5 mt-1 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${Math.min(100, room.occupancyData.avgVisits/2)}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between">
                <span className="text-gray-300">Dwell Time:</span>
                <span className="font-medium">{room.occupancyData.avgDuration} min</span>
              </div>
              <div className="w-full bg-gray-700 h-1.5 mt-1 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full" 
                  style={{ width: `${Math.min(100, room.occupancyData.avgDuration * 2)}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="text-gray-300 mb-1">Peak Usage Hours:</div>
              <div className="flex flex-wrap gap-1">
                {room.occupancyData.peakTimes.map((time, i) => (
                  <span key={i} className="bg-blue-900 bg-opacity-60 text-xs px-2 py-1 rounded">
                    {time}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <h4 className="text-sm font-semibold text-blue-300 mb-2">Design Insights</h4>
          <ul className="text-xs text-gray-300 space-y-1 mb-4">
            <li>• {room.type === 'patient' ? 'Room layout optimized for care delivery' : 
                 room.type === 'service' ? 'High traffic area requires durable finishes' :
                 room.type === 'entrance' ? 'Critical circulation node for wayfinding' :
                 'Space shows moderate utilization patterns'}
            </li>
            <li>• Occupancy pattern suggests {room.occupancyData.avgDuration > 20 ? 'long-duration activities' : 'short interactions'}</li>
            <li>• Connected to {room.connectsTo.length} adjacent spaces</li>
          </ul>
        </>
      )}
      
      <div className="mt-4 flex space-x-2">
        <button 
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm flex-1"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          View Space Analysis
        </button>
        <button 
          className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-sm"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Camera controls based on view mode
function CameraControls() {
  const { camera, controls } = useThree();
  const controlsRef = useRef<any>();
  const animatingRef = useRef<boolean>(false);
  const startPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const startTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const endTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(1000); // ms
  
  // Store the controls reference
  useEffect(() => {
    if (controls) {
      controlsRef.current = controls;
    }
  }, [controls]);
  
  useEffect(() => {
    // Set initial camera position
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 0, 0);
    
    if (controls && (controls as any).target) {
      (controls as any).target.set(0, 0, 0);
      (controls as any).update();
    }
    
    return () => {
      // Cleanup
    };
  }, [camera, controls]);
  
  // Animation function for smooth camera movement
  useFrame(() => {
    if (animatingRef.current && controlsRef.current) {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, elapsed / durationRef.current);
      
      // Easing function (ease-in-out)
      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // Interpolate camera position
      camera.position.lerpVectors(startPosRef.current, targetPosRef.current, eased);
      
      // Interpolate target
      controlsRef.current.target.lerpVectors(startTargetRef.current, endTargetRef.current, eased);
      controlsRef.current.update();
      
      // End animation when complete
      if (progress >= 1) {
        animatingRef.current = false;
      }
    }
  });
  
  // Function to start a camera animation
  const animateCamera = (targetPos: THREE.Vector3, targetLookAt: THREE.Vector3, duration: number = 1000) => {
    if (!controlsRef.current) return;
    
    startPosRef.current.copy(camera.position);
    targetPosRef.current.copy(targetPos);
    
    startTargetRef.current.copy(controlsRef.current.target);
    endTargetRef.current.copy(targetLookAt);
    
    startTimeRef.current = Date.now();
    durationRef.current = duration;
    animatingRef.current = true;
  };
  
  // Make the animation function available globally
  (window as any).animateCamera = animateCamera;
  
  return null;
}

// Main visualization scene
function BuildingScene({ data, externalSpeedMultiplier, onSpeedChange, showPaths, onTogglePaths, onResetPaths, onReturnToOverview, viewMode }: { 
  data: GridData,
  externalSpeedMultiplier: number,
  onSpeedChange: (multiplier: number) => void,
  showPaths: boolean,
  onTogglePaths: () => void,
  onResetPaths: (resetFn: () => void) => void,
  onReturnToOverview: () => void,
  viewMode: 'overview' | 'room'
}) {
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const controlsRef = useRef<any>();
  
  // Add a reference to reset the animation
  const resetPathAnimationRef = useRef<() => void>(() => {});
  
  // Track camera position for reset
  const defaultCameraPosition = useRef<THREE.Vector3>(new THREE.Vector3(0, 15, 25));
  const defaultCameraTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  
  // Get Three.js objects
  const { camera, controls } = useThree();
  
  // Store controls reference
  useEffect(() => {
    if (controls) {
      controlsRef.current = controls;
    }
  }, [controls]);
  
  // Reset camera to overview position
  const resetCamera = useCallback(() => {
    // Use the global animateCamera function if available
    if ((window as any).animateCamera) {
      (window as any).animateCamera(
        defaultCameraPosition.current,
        defaultCameraTarget.current
      );
    } else if (camera && controlsRef.current) {
      // Fallback direct positioning
      camera.position.copy(defaultCameraPosition.current);
      controlsRef.current.target.copy(defaultCameraTarget.current);
      controlsRef.current.update();
    }
  }, [camera]);
  
  // Handle reset paths request from parent
  useEffect(() => {
    // Pass the reset function to the parent
    onResetPaths(() => {
      if (resetPathAnimationRef.current) {
        resetPathAnimationRef.current();
      }
    });
  }, [onResetPaths]);
  
  // Handle model load and room extraction
  const handleModelLoaded = (extractedRooms: Room[]) => {
    try {
      setRooms(extractedRooms);
      
      if (!extractedRooms || extractedRooms.length === 0) {
        console.warn("No rooms extracted from the model");
        return;
      }
      
      // Generate more realistic paths throughout the building
      console.log("Generating paths from extracted rooms:", extractedRooms.length);
      const generatedPaths = generateRealisticPaths(extractedRooms);
      console.log("Setting paths:", generatedPaths.length);
      setPaths(generatedPaths);
      
    } catch (error) {
      console.error("Error loading model:", error);
      setError("An error occurred while loading the model. Please try again later.");
    }
  };
  
  // Generate more realistic paths throughout the building
  const generateRealisticPaths = (rooms: Room[]): Path[] => {
    if (!rooms || rooms.length === 0) {
      console.warn("No rooms available to generate paths");
      return [];
    }
    
    const pathTemplates = [...SAMPLE_PATHS];
    const result: Path[] = [];
    
    try {
      // Generate path for each template (ensure at least one path per template)
      pathTemplates.forEach(template => {
        // Always create at least one path per type
        for (let i = 0; i < 2; i++) {
          try {
            // Start with a copy of the template
            const path: Path = {
              id: template.id + '-' + i,
              name: template.name,
              color: template.color,
              waypoints: [] as Waypoint[],
              startTime: 0,
              endTime: 0,
              frequency: template.frequency
            };
            const waypoints: Waypoint[] = [];
            const currentTime = Date.now() + i * 10000; // Stagger start times
            
            // Pick a start room based on the path type
            let startRoom: Room | undefined;
            if (template.id === 'nurse-rounds') {
              // Nurses typically start from nursing station
              startRoom = rooms.find(r => r.type === 'service') || rooms[0];
            } else if (template.id === 'patient-bathroom') {
              // Patient bathroom trips start from patient rooms
              startRoom = rooms.find(r => r.type === 'patient') || rooms[0];
            } else if (template.id === 'visitor-path') {
              // Visitors typically start from entrance
              startRoom = rooms.find(r => r.type === 'entrance') || rooms[0];
            } else {
              // Doctor consultations can start anywhere
              startRoom = rooms[Math.floor(Math.random() * rooms.length)];
            }
            
            if (!startRoom) {
              console.warn("Unable to find starting room for path");
              startRoom = rooms[0]; // Always use first room as fallback
            }

            // Generate a route through 2-4 rooms (ensure at least 2 rooms)
            const visitRooms: Room[] = [startRoom];
            let currentRoom = startRoom;
            
            // Add at least 2 more rooms to visit
            const roomsToVisit = 2 + Math.floor(Math.random() * 2);
            for (let j = 0; j < roomsToVisit; j++) {
              // Find a connected room
              if (currentRoom.connectsTo && currentRoom.connectsTo.length > 0) {
                const connectedId = currentRoom.connectsTo[Math.floor(Math.random() * currentRoom.connectsTo.length)];
                const nextRoom = rooms.find(r => r.id === connectedId);
                
                if (nextRoom && !visitRooms.includes(nextRoom)) {
                  visitRooms.push(nextRoom);
                  currentRoom = nextRoom;
                } else if (rooms.length > 1) {
                  // Fallback: pick any unvisited room
                  const unvisitedRooms = rooms.filter(r => !visitRooms.includes(r));
                  if (unvisitedRooms.length > 0) {
                    const randomRoom = unvisitedRooms[Math.floor(Math.random() * unvisitedRooms.length)];
                    visitRooms.push(randomRoom);
                    currentRoom = randomRoom;
                  }
                }
              }
            }
            
            // Ensure we have at least 2 rooms
            if (visitRooms.length < 2 && rooms.length > 1) {
              // Add another random room
              const otherRooms = rooms.filter(r => r !== startRoom);
              if (otherRooms.length > 0) {
                visitRooms.push(otherRooms[0]);
              }
            }
                        
            // Convert room sequence to waypoints
            let time = currentTime;
            
            // Generate waypoints for each room transition
            for (let roomIndex = 0; roomIndex < visitRooms.length; roomIndex++) {
              const room = visitRooms[roomIndex];
              const isLastRoom = roomIndex === visitRooms.length - 1;
              
              // Validate room bounds
              if (!room.bounds || !room.bounds.min || !room.bounds.max) {
                console.warn("Room missing valid bounds:", room.id);
                continue;
              }
              
              // Room center
              const center = new THREE.Vector3(
                (room.bounds.min.x + room.bounds.max.x) / 2,
                0.1,
                (room.bounds.min.z + room.bounds.max.z) / 2
              );
              
              // Add path from previous room if not the first room
              if (roomIndex > 0) {
                const prevRoom = visitRooms[roomIndex - 1];
                
                // Validate previous room bounds
                if (!prevRoom.bounds || !prevRoom.bounds.min || !prevRoom.bounds.max) {
                  console.warn("Previous room missing valid bounds:", prevRoom.id);
                  continue;
                }
                
                const prevCenter = new THREE.Vector3(
                  (prevRoom.bounds.min.x + prevRoom.bounds.max.x) / 2,
                  0.1,
                  (prevRoom.bounds.min.z + prevRoom.bounds.max.z) / 2
                );
                
                // Calculate path direction - with safety check
                const direction = new THREE.Vector3().subVectors(center, prevCenter);
                if (direction.length() === 0) {
                  // If centers are identical, add a small offset
                  direction.set(0.1, 0, 0.1);
                }
                direction.normalize();
                
                // Create a natural curve path with just a few points and an offset for curvature
                // Add a curve control point for a more natural path
                
                // Start from edge of previous room
                const startPoint = new THREE.Vector3().copy(prevCenter).add(
                  direction.clone().multiplyScalar(Math.random() * 2 + 1)
                );
                
                // End at edge of current room
                const endPoint = new THREE.Vector3().copy(center).add(
                  direction.clone().negate().multiplyScalar(Math.random() * 2 + 1)
                );
                
                // Create midpoint with offset for curve
                const midPoint = new THREE.Vector3()
                  .addVectors(startPoint, endPoint)
                  .multiplyScalar(0.5);
                
                // Add perpendicular offset for curve
                const perpOffset = new THREE.Vector3(-direction.z, 0, direction.x)
                  .multiplyScalar((Math.random() * 2 - 1) * 3); // Random curve left or right
                
                midPoint.add(perpOffset);
                
                // Add first point (from previous room)
                waypoints.push({
                  position: startPoint,
                  timestamp: time,
                  type: 'walking'
                });
                
                time += 1000;
                
                // Add curve control point
                waypoints.push({
                  position: midPoint,
                  timestamp: time,
                  type: 'walking'
                });
                
                time += 1000;
              }
              
              // Add destination point in current room (with small random offset for realism)
              // With bounds checking to avoid out-of-bounds positions
              const roomWidth = Math.max(0.1, room.bounds.max.x - room.bounds.min.x);
              const roomDepth = Math.max(0.1, room.bounds.max.z - room.bounds.min.z);
              
              const roomOffset = new THREE.Vector3(
                (Math.random() - 0.5) * roomWidth * 0.5,
                0,
                (Math.random() - 0.5) * roomDepth * 0.5
              );
              
              const roomPosition = center.clone().add(roomOffset);
              
              // Always create a standing point with longer dwell time in each room
              waypoints.push({
                position: roomPosition,
                timestamp: time,
                type: 'standing',
                duration: isLastRoom ? 
                          Math.floor(Math.random() * 50) + 30 : // Longer dwell at final destination
                          Math.floor(Math.random() * 30) + 15   // Standard dwell at intermediate stops
              });
              
              // Add longer pause at the room
              time += waypoints[waypoints.length - 1].duration! * 1000;
            }
            
            // Only add paths with at least 2 waypoints
            if (waypoints.length >= 2) {
              // Update path with generated waypoints
              path.waypoints = waypoints;
              path.startTime = waypoints[0].timestamp;
              path.endTime = waypoints[waypoints.length - 1].timestamp;
              
              // Add to results
              result.push(path);
              console.log(`Generated path ${path.id} with ${waypoints.length} waypoints`);
            } else {
              console.warn(`Failed to generate enough waypoints for path ${template.id}-${i}`);
            }
          } catch (error) {
            console.error("Error generating individual path:", error);
            // Continue with next path
          }
        }
      });
    } catch (error) {
      console.error("Error generating paths:", error);
    }
    
    console.log(`Generated ${result.length} total paths`);
    return result;
  };
  
  // Camera control for room view
  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
    
    // Animate camera to room view using our custom animation system
    if (camera && room.cameraPosition && (window as any).animateCamera) {
      (window as any).animateCamera(
        room.cameraPosition,
        room.cameraTarget
      );
    } else if (camera && room.cameraPosition && controlsRef.current) {
      // Fallback direct positioning
      camera.position.copy(room.cameraPosition);
      controlsRef.current.target.copy(room.cameraTarget);
      controlsRef.current.update();
    }
  };
  
  // Return to overview when signaled from parent
  useEffect(() => {
    if (viewMode === 'overview' && selectedRoom) {
      setSelectedRoom(null);
      resetCamera();
    }
  }, [viewMode, resetCamera]);
  
  return (
    <>
      {/* Camera and environment setup */}
      <PerspectiveCamera makeDefault position={[0, 15, 25]} fov={50} />
      <CameraControls />
      <OrbitControls 
        makeDefault
        enableDamping 
        dampingFactor={0.1}
        minDistance={3}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2 - 0.1} // Prevent going below ground
      />
      <Environment preset="city" />
      <Sky />
      
      {/* Main scene content */}
      <Suspense fallback={<Loader />}>
        <HospitalModel onLoad={handleModelLoaded} />
        
        {/* Room highlighting */}
        {rooms.map(room => (
          <RoomHighlight 
            key={room.id} 
            room={room} 
            selected={selectedRoom?.id === room.id}
            onClick={() => handleRoomSelect(room)}
          />
        ))}
        
        {/* Path visualization with speed control */}
        <PathVisualization 
          paths={paths} 
          visible={showPaths} 
          onResetRef={resetPathAnimationRef}
          speedMultiplier={externalSpeedMultiplier}
          onSpeedChange={onSpeedChange}
        />
      </Suspense>
      
      {/* Floor grid for reference */}
      <Grid 
        infiniteGrid 
        cellSize={1}
        sectionSize={10}
        cellThickness={0.5}
        sectionThickness={1}
        fadeDistance={50}
        fadeStrength={1.5}
      />
      
      {/* Performance monitor in development */}
      {process.env.NODE_ENV === 'development' && <Stats />}
      
      {/* Room details overlay */}
      {viewMode === 'room' && selectedRoom && (
        <Html fullscreen>
          <RoomDetailsPanel 
            room={selectedRoom} 
            onClose={onReturnToOverview}
          />
        </Html>
      )}
    </>
  );
}

// Main component export
export default function BuildingVisualization({ data }: BuildingVisualizationProps) {
  const [error, setError] = useState<Error | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(PATH_GROWTH_CONFIG.DEFAULT_SPEED);
  const [showPaths, setShowPaths] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'room'>('overview');
  
  // Function refs for callbacks
  const resetPathsRef = useRef(() => {});
  
  // Error handling wrapper function
  const handleError = (e: Error) => {
    console.error("Building visualization error:", e);
    setError(e);
  };
  
  // Toggle paths visibility
  const handleTogglePaths = () => {
    setShowPaths(!showPaths);
  };
  
  // Reset paths animation
  const handleResetPaths = () => {
    resetPathsRef.current();
  };
  
  // Return to overview
  const handleReturnToOverview = () => {
    setViewMode('overview');
  };
  
  // Connect reset paths function to scene
  const connectResetPaths = useCallback((resetFn: () => void) => {
    resetPathsRef.current = resetFn;
  }, []);
  
  // Wrap component with error boundary
  try {
    return (
      <div className="w-full h-full relative">
        {/* Three.js Canvas - completely separated from controls */}
        <div className="w-full h-full absolute inset-0">
          <Canvas shadows>
            <BuildingScene 
              data={data} 
              externalSpeedMultiplier={speedMultiplier}
              onSpeedChange={setSpeedMultiplier}
              showPaths={showPaths}
              onTogglePaths={handleTogglePaths}
              onResetPaths={connectResetPaths}
              onReturnToOverview={handleReturnToOverview}
              viewMode={viewMode}
            />
          </Canvas>
        </div>
        
        {/* All controls as pure HTML outside of canvas */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {/* Top controls: Path buttons */}
          <div className="absolute top-4 left-4 flex space-x-2 pointer-events-auto">
            <button 
              className={`px-3 py-1 rounded text-sm ${showPaths ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={handleTogglePaths}
            >
              {showPaths ? 'Hide Paths' : 'Show Paths'}
            </button>
            
            <button 
              className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-sm"
              onClick={handleResetPaths}
            >
              Reset Paths
            </button>
            
            {viewMode === 'room' && (
              <button 
                className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm"
                onClick={handleReturnToOverview}
              >
                Return to Overview
              </button>
            )}
          </div>
          
          {/* Speed control slider - centered at top */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-90 px-3 py-2 rounded-full shadow-lg flex items-center space-x-2 pointer-events-auto">
            <div className="text-white text-xs font-medium">Speed:</div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={speedMultiplier}
              onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
              className="w-32"
            />
            <div className="text-white text-xs font-medium w-8 text-center">{speedMultiplier.toFixed(1)}x</div>
          </div>
          
          {/* Legend overlay - repositioned to top-right */}
          <div className="absolute top-4 right-4 bg-gray-900 bg-opacity-80 p-3 rounded-lg text-white shadow-lg max-w-xs pointer-events-auto">
            <h3 className="text-sm font-bold mb-2">Path Types</h3>
            <div className="space-y-1.5">
              {SAMPLE_PATHS.map(path => (
                <div key={path.id} className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: path.color }}></div>
                  <div className="flex justify-between w-full">
                    <span className="whitespace-nowrap">{path.name}</span>
                    <span className="text-gray-400 ml-2">{path.frequency}/day</span>
                  </div>
                </div>
              ))}
              
              <div className="flex items-center text-xs mt-1 pt-1 border-t border-gray-700">
                <div className="w-3 h-3 rounded-full mr-2 bg-blue-400 opacity-70 flex-shrink-0"></div>
                <span className="text-xs">Dwell time indicator</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (e) {
    handleError(e as Error);
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="bg-red-900 bg-opacity-50 p-6 rounded-lg max-w-lg mx-auto">
          <h2 className="text-xl font-bold mb-4">Error Loading Building Visualization</h2>
          <p className="mb-4">{error?.message || "Unknown error occurred"}</p>
          <p className="text-sm text-gray-300">Please check your console for more details.</p>
        </div>
      </div>
    );
  }
} 