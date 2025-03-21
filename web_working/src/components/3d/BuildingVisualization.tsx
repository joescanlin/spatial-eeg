import React, { useState, useRef, useEffect, useMemo, Suspense, useCallback } from 'react';
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

// Global configuration parameters
const PATH_ANIMATION_CONFIG = {
  // Time in seconds for a complete animation cycle (higher = slower)
  CYCLE_DURATION: 86400, // 24 hours
  // Multiplier for visual progression speed (lower = slower)
  PROGRESSION_RATE: 0.01,
  // Number of frames to skip between updates (higher = slower animation)
  FRAME_SKIP: 600, // Only update every 600 frames (at 60 FPS, that's every 10 seconds)
  // Progress increment per update (smaller = slower)
  PROGRESS_INCREMENT: 0.0001 // Extremely tiny increment per update
};

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

// Path visualization component with efficient line rendering
function PathVisualization({ paths, visible, onResetRef }: { paths: Path[], visible: boolean, onResetRef: React.MutableRefObject<() => void> }) {
  if (!visible) return null;
  
  // Animation progress based on time
  const [progress, setProgress] = useState(0);
  
  // Track frame counts to skip frames
  const frameCountRef = useRef(0);
  // Number of frames to skip between updates (higher = slower animation)
  const FRAME_SKIP = PATH_ANIMATION_CONFIG.FRAME_SKIP;
  
  // Provide reset function through ref
  useEffect(() => {
    onResetRef.current = () => {
      setProgress(0);
      frameCountRef.current = 0;
      console.log('Path animation reset to beginning');
    };
    
    return () => {
      onResetRef.current = () => {};
    };
  }, [onResetRef]);
  
  // Using frame skipping to dramatically slow down the animation
  useFrame(() => {
    // Increment the frame counter
    frameCountRef.current += 1;
    
    // Only update progress after skipping many frames
    if (frameCountRef.current >= FRAME_SKIP) {
      // Extremely small increment for very slow motion
      setProgress(prevProgress => {
        const newProgress = prevProgress + PATH_ANIMATION_CONFIG.PROGRESS_INCREMENT;
        return newProgress > 1 ? 1 : newProgress;
      });
      
      // Reset frame counter
      frameCountRef.current = 0;
    }
  });
  
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
    <group>
      {paths.map((path) => {
        try {
          // Only try to render if we have at least 2 waypoints with positions
          if (!path.waypoints || path.waypoints.length < 2) {
            return null;
          }
          
          // Extract valid points with additional validation
          const points: THREE.Vector3[] = [];
          const dwellPoints: {position: THREE.Vector3, duration: number}[] = [];
          
          path.waypoints.forEach(wp => {
            if (wp && wp.position && 
                typeof wp.position.x === 'number' && 
                typeof wp.position.y === 'number' && 
                typeof wp.position.z === 'number') {
              // Create a new Vector3 to ensure it's a valid object
              const validPosition = new THREE.Vector3(
                wp.position.x,
                wp.position.y,
                wp.position.z
              );
              points.push(validPosition);
              
              // Track dwell points where people spend time
              if (wp.type === 'standing' && wp.duration) {
                dwellPoints.push({
                  position: validPosition,
                  duration: wp.duration
                });
              }
            }
          });
          
          // Only render if we have at least 2 valid points
          if (points.length < 2) {
            return null;
          }
          
          // Safe curve creation with fallback to direct lines if curve fails
          let curvePoints: THREE.Vector3[];
          try {
            // Create a smooth curve through the points
            const curve = new THREE.CatmullRomCurve3(points);
            
            // Calculate how much of the path to show based on animation progress
            // Make the visible length grow extremely gradually
            const visibleLength = Math.max(0.01, Math.min(1, progress * PATH_ANIMATION_CONFIG.PROGRESSION_RATE));
            
            // Generate fewer points for the visible portion of the curve for smoother, slower drawing
            const numPoints = Math.max(2, Math.floor(points.length * 3 * visibleLength));
            curvePoints = curve.getPoints(numPoints);
          } catch (error) {
            console.warn("Error creating curve for path, using direct line instead:", error);
            // Fallback to direct line if curve creation fails
            const visibleLength = Math.max(0.01, Math.min(1, progress * PATH_ANIMATION_CONFIG.PROGRESSION_RATE));
            const visiblePointCount = Math.max(2, Math.floor(points.length * visibleLength));
            curvePoints = points.slice(0, visiblePointCount);
          }
          
          return (
            <group key={path.id}>
              {/* Render path as a curved line with fallback */}
              <Line
                points={curvePoints}
                color={path.color}
                lineWidth={2.5}
                transparent
                opacity={0.7}
              />
              
              {/* Render smaller spheres only at key waypoints */}
              {points.filter((_, i) => i % 3 === 0 || i === points.length - 1).map((point, i) => (
                <mesh key={`${path.id}-point-${i}`} position={[point.x, point.y, point.z]}>
                  <sphereGeometry args={[0.05, 8, 8]} />
                  <meshBasicMaterial color={path.color} transparent opacity={0.8} />
                </mesh>
              ))}
              
              {/* Render dwell circles for standing points with duration */}
              {dwellPoints.map((dwellPoint, i) => renderDwellCircle(dwellPoint.position, dwellPoint.duration, path.color, i))}
            </group>
          );
        } catch (error) {
          console.error("Error rendering path:", error);
          return null;
        }
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
function RoomDetailsPanel({ room }: { room: Room }) {
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
        <button className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm flex-1">
          View Space Analysis
        </button>
        <button className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-sm">
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
function BuildingScene({ data }: { data: GridData }) {
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showPaths, setShowPaths] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'room'>('overview');
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

  // Handle model load and room extraction
  const handleModelLoaded = (extractedRooms: Room[]) => {
    try {
      setRooms(extractedRooms);
      
      if (!extractedRooms || extractedRooms.length === 0) {
        console.warn("No rooms extracted from the model");
        return;
      }
      
      // Generate more realistic paths throughout the building
      const generatedPaths = generateRealisticPaths(extractedRooms);
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
      // Generate path for each template
      pathTemplates.forEach(template => {
        // Create fewer paths per type (1-2 instead of 2-3)
        for (let i = 0; i < 1 + Math.floor(Math.random() * 2); i++) {
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
              continue; // Skip this path
            }

            // Generate a route through 2-4 rooms (fewer rooms than before)
            const visitRooms: Room[] = [startRoom];
            let currentRoom = startRoom;
            
            // Add fewer rooms to visit
            const roomsToVisit = 1 + Math.floor(Math.random() * 2);
            for (let j = 0; j < roomsToVisit; j++) {
              // Find a connected room
              if (currentRoom.connectsTo && currentRoom.connectsTo.length > 0) {
                const connectedId = currentRoom.connectsTo[Math.floor(Math.random() * currentRoom.connectsTo.length)];
                const nextRoom = rooms.find(r => r.id === connectedId);
                
                if (nextRoom && !visitRooms.includes(nextRoom)) {
                  visitRooms.push(nextRoom);
                  currentRoom = nextRoom;
                }
              }
            }
            
            // Convert room sequence to waypoints with more natural movement
            let time = currentTime;
            
            // Generate fewer, more meaningful waypoints with natural curves
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
    
    return result;
  };
  
  // Camera control for room view
  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
    setViewMode('room');
    
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
  
  // Return to overview
  const handleReturnToOverview = useCallback(() => {
    setViewMode('overview');
    setSelectedRoom(null);
    resetCamera();
  }, [resetCamera]);
  
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
        
        {/* Path visualization */}
        <PathVisualization 
          paths={paths} 
          visible={showPaths} 
          onResetRef={resetPathAnimationRef} 
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
          <RoomDetailsPanel room={selectedRoom} />
        </Html>
      )}
      
      {/* View controls */}
      <Html position={[0, 0, 0]} center>
        <div className="absolute bottom-4 left-4 flex space-x-2">
          <button 
            className={`px-3 py-1 rounded text-sm ${showPaths ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setShowPaths(!showPaths)}
          >
            {showPaths ? 'Hide Paths' : 'Show Paths'}
          </button>
          
          <button 
            className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-sm"
            onClick={() => resetPathAnimationRef.current()}
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
      </Html>
    </>
  );
}

// Main component export
export default function BuildingVisualization({ data }: BuildingVisualizationProps) {
  const [error, setError] = useState<Error | null>(null);
  const [debugMode, setDebugMode] = useState(true); // Keep debug display enabled by default

  // Error handling wrapper function
  const ErrorFallback = ({ error }: { error: Error }) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-white p-6">
      <h2 className="text-xl font-bold text-red-500 mb-4">Error Loading 3D View</h2>
      <p className="mb-4">Something went wrong while rendering the 3D building view.</p>
      <pre className="bg-gray-900 p-4 rounded max-w-full overflow-auto text-sm">
        {error.message}
      </pre>
      <button 
        className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        onClick={() => window.location.reload()}
      >
        Refresh Page
      </button>
    </div>
  );

  // If there's an error, show the error UI
  if (error) {
    return <ErrorFallback error={error} />;
  }

  try {
    return (
      <div className="w-full h-full">
        <Canvas shadows>
          <BuildingScene data={data} />
        </Canvas>
        
        {/* Legend overlay */}
        <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-80 p-4 rounded-lg text-white shadow-lg">
          <h3 className="text-lg font-semibold mb-2">Building Activity Analysis</h3>
          <p className="text-sm mb-3 text-gray-300">Visualization of movement patterns for space optimization.</p>
          
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Path Type</span>
              <span>Frequency</span>
            </div>
            {SAMPLE_PATHS.map(path => (
              <div key={path.id} className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: path.color }}
                  ></div>
                  <span className="text-sm">{path.name}</span>
                </div>
                <div className="text-xs text-gray-300">
                  {path.frequency}/day
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center mb-2 mt-4">
            <div className="mr-2 relative">
              <div className="w-6 h-6 rounded-full bg-blue-600 opacity-40"></div>
              <div className="w-4 h-4 rounded-full bg-blue-600 opacity-60 absolute top-1 left-1"></div>
            </div>
            <div className="text-xs text-gray-300">
              <span className="text-white">Dwell Circles</span> - Size indicates time spent in location
            </div>
          </div>
          
          <div className="text-xs text-gray-400 mt-2">
            <p>Insights: Click on rooms to view detailed occupancy metrics. Toggle paths to analyze traffic patterns.</p>
          </div>
        </div>
        
        {/* Debug display for animation settings */}
        {debugMode && (
          <div className="absolute bottom-16 right-4 bg-black bg-opacity-80 p-2 rounded text-white text-xs">
            <div className="font-bold mb-1">Path Animation Debug:</div>
            <div>Frame Skip: {PATH_ANIMATION_CONFIG.FRAME_SKIP} frames (~{(PATH_ANIMATION_CONFIG.FRAME_SKIP/60).toFixed(1)}s)</div>
            <div>Progress Inc: {PATH_ANIMATION_CONFIG.PROGRESS_INCREMENT}</div>
            <div>Progression Rate: {PATH_ANIMATION_CONFIG.PROGRESSION_RATE}</div>
            <div className="mt-1 font-bold">Est. Full Path Time: {((1/PATH_ANIMATION_CONFIG.PROGRESS_INCREMENT) * (PATH_ANIMATION_CONFIG.FRAME_SKIP/60) / 60).toFixed(1)} minutes</div>
            <button 
              className="mt-2 px-2 py-1 bg-blue-700 rounded text-xs"
              onClick={() => setDebugMode(false)}
            >
              Hide Debug
            </button>
          </div>
        )}
      </div>
    );
  } catch (e) {
    const error = e as Error;
    console.error("Error rendering building visualization:", error);
    setError(error);
    return <ErrorFallback error={error} />;
  }
} 