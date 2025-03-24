import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  Text, 
  Billboard,
  Html,
  Sphere,
  Line,
  Stars,
  useCursor
} from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, animated, config } from '@react-spring/three';
import { mockBuildingData } from './mockData';
import { Vector3 } from 'three';

// Types
interface Building {
  id: string;
  name: string;
  type: 'hospital' | 'office' | 'retail' | 'residence' | 'education';
  location: string;
  size: number;
  position: [number, number, number];
  squareFootage: number;
  performance: number;
  metrics: {
    efficiency: number;
    circulation: number;
    occupancy: number;
    energyUsage: number;
    peakTimes: string[];
    averageDwellTime: number;
  };
  designPatterns: {
    id: string;
    name: string;
    effectiveness: number;
    description: string;
  }[];
}

interface Connection {
  source: string;
  target: string;
  strength: number;
  color: string;
  active: boolean;
}

interface ActivityEvent {
  id: string;
  buildingId: string;
  message: string;
  type: 'occupancy-change' | 'maintenance-alert' | 'climate-data' | 'space-optimization' | 'traffic-flow';
  timestamp: number;
  position: THREE.Vector3;
  color: string;
}

// New interface for data stream events
interface DataStreamEvent {
  id: string;
  buildingId: string;
  buildingName: string;
  buildingType: string;
  message: string;
  type: 'occupancy-change' | 'maintenance-alert' | 'climate-data' | 'space-optimization' | 'traffic-flow';
  timestamp: number;
  location: string;
  value?: number;
  unit?: string;
  suffix?: string;
}

// Generate building connections
const generateConnections = (buildings: Building[]): Connection[] => {
  const connections: Connection[] = [];
  const buildingCount = buildings.length;
  
  // Create more connections between buildings for a richer visualization
  buildings.forEach((source, i) => {
    // Connect to 3-6 other buildings (increased from 2-4)
    const connectionCount = 3 + Math.floor(Math.random() * 4);
    
    // Target specific building types more often
    const preferSameType = Math.random() > 0.5;
    const sameTypeBuildings = buildings.filter(b => b.id !== source.id && b.type === source.type);
    
    // Create connections
    for (let c = 0; c < connectionCount; c++) {
      // Pick target building
      let targetBuilding: Building | undefined;
      
      if (preferSameType && sameTypeBuildings.length > 0 && c < 2) {
        // Choose a building of the same type for some connections
        const targetIndex = Math.floor(Math.random() * sameTypeBuildings.length);
        targetBuilding = sameTypeBuildings[targetIndex];
      } else {
        // Random building selection for other connections
        let targetIndex = Math.floor(Math.random() * buildingCount);
        // Avoid self-connections
        while (targetIndex === i) {
          targetIndex = Math.floor(Math.random() * buildingCount);
        }
        targetBuilding = buildings[targetIndex];
      }
      
      if (!targetBuilding) continue;
      
      // Determine connection strength based on metrics
      const strength = Math.random() * 0.6 + 0.3; // 0.3-0.9 (increased minimum strength)
      
      // Define connection color based on building type
      let color = '#3b82f6'; // blue default
      
      if (source.type === 'hospital') color = '#3b82f6'; // blue
      else if (source.type === 'office') color = '#10b981'; // green
      else if (source.type === 'retail') color = '#f59e0b'; // amber
      else if (source.type === 'residence') color = '#8b5cf6'; // purple
      else if (source.type === 'education') color = '#ec4899'; // pink
      
      // Make sure connection doesn't already exist
      const connectionExists = connections.some(conn => 
        (conn.source === source.id && conn.target === targetBuilding.id) ||
        (conn.source === targetBuilding.id && conn.target === source.id)
      );
      
      if (!connectionExists) {
        connections.push({
          source: source.id,
          target: targetBuilding.id,
          strength,
          color,
          active: Math.random() > 0.3 // 70% chance of being active (increased from 50%)
        });
      }
    }
  });
  
  return connections;
};

// Simplified connection flow with animated particles
function ConnectionFlow({ start, end, color }: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
}) {
  const points = useMemo(() => [start, end], [start, end]);
  const particleCount = useMemo(() => 
    Math.floor(Math.random() * 3) + 2, // 2-4 particles per connection
  []);
  
  // Create particle meshes with randomized speeds
  const particles = useMemo(() => 
    Array.from({ length: particleCount }).map(() => ({
      progress: Math.random(), // Random starting position on the line
      speed: (Math.random() * 0.3 + 0.2) * 0.01, // Random speed
      ref: React.createRef<THREE.Mesh>()
    })),
  [particleCount]);
  
  // Animate particles along the connection line
  useFrame(() => {
    particles.forEach(particle => {
      if (particle.ref.current) {
        // Update progress along the path
        particle.progress += particle.speed;
        if (particle.progress > 1) {
          particle.progress = 0;
        }
        
        // Calculate position along the line and update particle position
        const newPos = new THREE.Vector3().lerpVectors(start, end, particle.progress);
        particle.ref.current.position.copy(newPos);
      }
    });
  });
  
  return (
    <group>
      {/* Base connection line */}
      <Line
        points={points}
        color={color}
        lineWidth={1}
        opacity={0.4}
        transparent
      />
      
      {/* Moving particles */}
      {particles.map((particle, i) => (
        <mesh key={i} ref={particle.ref}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// Building node component - now using bars instead of spheres
function BuildingNode({ building, selected, onClick }: {
  building: Building;
  selected: boolean;
  onClick: () => void;
}) {
  // Generate color based on building type
  const getColor = () => {
    switch (building.type) {
      case 'hospital': return '#3b82f6'; // blue
      case 'office': return '#10b981'; // green
      case 'retail': return '#f59e0b'; // amber
      case 'residence': return '#8b5cf6'; // purple
      case 'education': return '#ec4899'; // pink
      default: return '#3b82f6';
    }
  };
  
  // Calculate bar height based on occupancy
  const getBarHeight = () => {
    // Base height is 0.3, then add height based on occupancy percentage
    const baseHeight = 0.3;
    const maxAdditionalHeight = 1.5;
    const occupancyFactor = building.metrics.occupancy / 100;
    return baseHeight + (maxAdditionalHeight * occupancyFactor);
  };
  
  const baseColor = getColor();
  const barHeight = getBarHeight();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  
  // Animation for selection and hover
  const { scale, color, emissive, emissiveIntensity } = useSpring({
    scale: selected ? 1.4 : hovered ? 1.2 : 1,
    color: selected ? '#ffffff' : baseColor,
    emissive: selected ? '#ffffff' : baseColor,
    emissiveIntensity: selected ? 0.5 : hovered ? 0.3 : 0.2,
    config: config.wobbly
  });
  
  return (
    <group 
      position={new THREE.Vector3(...building.position)}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Bar (cylinder) replacing sphere */}
      <animated.mesh 
        scale={scale} 
        rotation={[0, 0, 0]}
        position={[0, barHeight/2, 0]} // Position adjusted to place bottom of cylinder at origin
      >
        <cylinderGeometry args={[0.1, 0.1, barHeight, 8]} /> {/* cylinder with fixed radius and variable height */}
        <animated.meshStandardMaterial 
          color={color} 
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.4}
          metalness={0.8}
        />
      </animated.mesh>
      
      {/* Thin disc at base of bar for better visual effect */}
      <animated.mesh 
        scale={scale} 
        rotation={[Math.PI/2, 0, 0]}
        position={[0, 0, 0]}
      >
        <cylinderGeometry args={[0.15, 0.15, 0.05, 12]} />
        <animated.meshStandardMaterial 
          color={color} 
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.4}
          metalness={0.8}
          transparent
          opacity={0.7}
        />
      </animated.mesh>
      
      {/* Label for the building */}
      {(selected || hovered) && (
        <Billboard
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
        >
          <Text
            position={[0, barHeight + 0.2, 0]} // Position label above the bar
            fontSize={0.12}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {building.name}
          </Text>
        </Billboard>
      )}
      
      {/* Show occupancy value when hovered */}
      {hovered && !selected && (
        <Billboard
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
          position={[0, barHeight/2, 0]}
        >
          <Text
            position={[0.2, 0, 0]}
            fontSize={0.1}
            color="#ffffff"
            anchorX="left"
            anchorY="middle"
          >
            {`${building.metrics.occupancy}%`}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// Simplified activity node without Trail effect
function ActivityNode({ event }: { event: ActivityEvent }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [visible, setVisible] = useState(true);
  
  // Fade in and then fade out
  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisible(false);
    }, 5000); // Display for 5 seconds
    
    return () => clearTimeout(timeout);
  }, []);
  
  // Pulse animation
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2) * 0.2);
    }
  });
  
  if (!visible) return null;
  
  return (
    <mesh ref={meshRef} position={event.position}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshBasicMaterial color={event.color} transparent opacity={0.8} />
    </mesh>
  );
}

// Building details panel shown when a building is selected
function BuildingDetailsPanel({ building, onClose }: { 
  building: Building | null;
  onClose: () => void;
}) {
  if (!building) return null;
  
  // Generate occupancy data based on time of day (mock data)
  const currentHour = new Date().getHours();
  const isBusinessHours = currentHour >= 8 && currentHour <= 18;
  const occupancyRate = isBusinessHours ? 
    Math.floor(Math.random() * 30) + 60 : // 60-90% during business hours
    Math.floor(Math.random() * 40) + 10;  // 10-50% outside business hours
  
  // Calculate energy efficiency score
  const energyEfficiency = Math.min(100, Math.max(50, 100 - building.metrics.energyUsage/10));
  
  return (
    <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-95 p-5 rounded-lg text-white w-80 shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">{building.name}</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="text-sm opacity-90 mb-3 flex space-x-2">
        <span className="px-2 py-0.5 bg-gray-700 rounded">
          {building.type.charAt(0).toUpperCase() + building.type.slice(1)}
        </span>
        <span className="px-2 py-0.5 bg-gray-700 rounded">
          {building.location}
        </span>
      </div>
      
      <div className="mb-4">
        <div className="text-sm text-gray-400">Size</div>
        <div className="font-semibold">{building.squareFootage.toLocaleString()} sq ft</div>
      </div>
      
      {/* Real-time data section */}
      <div className="bg-gray-700 bg-opacity-50 p-3 rounded mb-4">
        <h4 className="text-sm font-semibold mb-2 text-blue-300">Real-Time Data</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-gray-300">Current Occupancy</div>
            <div className="font-medium text-lg">{occupancyRate}%</div>
          </div>
          <div>
            <div className="text-gray-300">Temperature</div>
            <div className="font-medium text-lg">{Math.floor(Math.random() * 6) + 68}°F</div>
          </div>
          <div>
            <div className="text-gray-300">Energy Usage</div>
            <div className="font-medium">{building.metrics.energyUsage} kWh</div>
          </div>
          <div>
            <div className="text-gray-300">Last Activity</div>
            <div className="font-medium">{Math.floor(Math.random() * 59) + 1}m ago</div>
          </div>
        </div>
      </div>
      
      <div className="space-y-3 mb-4">
        <div>
          <div className="flex justify-between text-sm">
            <span>Space Efficiency</span>
            <span className="font-medium">{building.metrics.efficiency}%</span>
          </div>
          <div className="w-full bg-gray-700 h-1.5 mt-1 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full" 
              style={{ width: `${building.metrics.efficiency}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm">
            <span>Current Occupancy</span>
            <span className="font-medium">{occupancyRate}%</span>
          </div>
          <div className="w-full bg-gray-700 h-1.5 mt-1 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full" 
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm">
            <span>Energy Efficiency</span>
            <span className="font-medium">{energyEfficiency}%</span>
          </div>
          <div className="w-full bg-gray-700 h-1.5 mt-1 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                energyEfficiency > 75 ? 'bg-green-500' : 
                energyEfficiency > 50 ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${energyEfficiency}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-sm font-semibold mb-2">Peak Usage Times</div>
        <div className="flex flex-wrap gap-1">
          {building.metrics.peakTimes.map((time, i) => (
            <span key={i} className="bg-gray-700 text-xs px-2 py-1 rounded">
              {time}
            </span>
          ))}
        </div>
      </div>
      
      <div>
        <div className="text-sm font-semibold mb-2 flex justify-between">
          <span>Design Patterns</span>
          <span className="text-blue-400 text-xs">Effectiveness</span>
        </div>
        <div className="space-y-2">
          {building.designPatterns.map(pattern => (
            <div key={pattern.id} className="bg-gray-700 bg-opacity-50 p-2 rounded text-xs">
              <div className="font-medium mb-1">{pattern.name}</div>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-600 h-1 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${pattern.effectiveness}%` }}
                  />
                </div>
                <span className="ml-2">{pattern.effectiveness}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Optimization recommendations */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="text-sm font-semibold mb-2 text-blue-300">Optimization Insights</div>
        <div className="text-xs text-gray-300">
          {building.metrics.efficiency < 80 ? 
            "Space optimization needed: Consider reconfiguring layout to improve flow efficiency" :
            "Current space design is optimal based on traffic patterns"
          }
        </div>
      </div>
    </div>
  );
}

// Orbital rings component - enhanced for GitHub-style appearance
function OrbitalRings() {
  const ringsRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (ringsRef.current) {
      ringsRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.1) * 0.2;
      ringsRef.current.rotation.z = Math.cos(clock.getElapsedTime() * 0.05) * 0.1;
    }
  });
  
  // Create more rings with varying sizes and colors
  const ringData = [
    { radius: 8.05, thickness: 0.01, opacity: 0.3, color: '#1f2937' },
    { radius: 8.2, thickness: 0.015, opacity: 0.25, color: '#3b82f6' },
    { radius: 8.4, thickness: 0.01, opacity: 0.15, color: '#1f2937' },
    { radius: 8.7, thickness: 0.01, opacity: 0.2, color: '#1f2937' },
    { radius: 9.0, thickness: 0.02, opacity: 0.1, color: '#1f2937' }
  ];
  
  return (
    <group ref={ringsRef}>
      {ringData.map((ring, i) => (
        <mesh key={i} rotation={[Math.PI/2, 0, 0]}>
          <ringGeometry args={[ring.radius, ring.radius + ring.thickness, 128]} />
          <meshBasicMaterial 
            color={ring.color} 
            transparent 
            opacity={ring.opacity} 
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// Real-time data stream component
function DataStream({ events }: { events: DataStreamEvent[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events]);
  
  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };
  
  // Get type-based color
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'occupancy-change': return 'text-blue-400';
      case 'maintenance-alert': return 'text-red-400';
      case 'climate-data': return 'text-green-400';
      case 'space-optimization': return 'text-purple-400';
      case 'traffic-flow': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };
  
  // Get building type color
  const getBuildingTypeColor = (type: string): string => {
    switch (type) {
      case 'hospital': return 'text-blue-400';
      case 'office': return 'text-green-400';
      case 'retail': return 'text-yellow-400';
      case 'residence': return 'text-purple-400';
      case 'education': return 'text-pink-400';
      default: return 'text-gray-400';
    }
  };
  
  return (
    <div className="absolute top-4 right-4 bottom-24 w-80 bg-gray-900 bg-opacity-90 rounded-lg overflow-hidden border border-gray-800">
      <div className="p-3 bg-gray-800 bg-opacity-80 font-medium flex justify-between items-center border-b border-gray-700">
        <span className="text-white">Data Stream</span>
        <span className="text-xs px-2 py-0.5 bg-blue-900 text-blue-300 rounded-full">Real-Time</span>
      </div>
      
      <div 
        ref={containerRef}
        className="overflow-y-auto h-full text-xs"
        style={{ maxHeight: 'calc(100% - 3rem)' }}
      >
        {events.map(event => (
          <div key={event.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors duration-150 group">
            <div className="px-3 py-2">
              <div className="flex items-center text-xs text-gray-400 mb-1">
                <span className="mr-2 font-mono">{formatTime(event.timestamp)}</span>
                <span className={`${getBuildingTypeColor(event.buildingType)} mr-1 opacity-80`}>●</span>
                <span className="text-white font-medium mr-1">{event.buildingName}</span>
                <span className="ml-1 opacity-60 group-hover:opacity-100">in {event.location}</span>
              </div>
              
              <div className="flex items-start">
                <span className={`${getTypeColor(event.type)} mr-2 mt-0.5 text-xs`}>■</span>
                <div>
                  <span className="text-gray-200 font-medium">{event.message}</span>
                  {event.value !== undefined && (
                    <span className={`ml-1 ${getTypeColor(event.type)} font-medium`}>
                      {event.value}{event.unit || ''}
                    </span>
                  )}
                  {event.suffix && (
                    <span className="text-gray-400 ml-1">
                      {event.suffix}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
    </div>
  );
}

// Main globe scene component
function GlobeScene() {
  const [buildings] = useState(() => mockBuildingData);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [dataStreamEvents, setDataStreamEvents] = useState<DataStreamEvent[]>([]);
  const [stats, setStats] = useState({
    totalBuildings: buildings.length,
    activeOccupants: Math.floor(Math.random() * 5000) + 3000,
    spaceUtilization: Math.floor(Math.random() * 20000) + 80000,
    energyUsage: Math.floor(Math.random() * 1000) + 2000,
    movementPatterns: {
      primary: Math.floor(Math.random() * 50000) + 100000,
      secondary: Math.floor(Math.random() * 10000) + 15000
    }
  });
  
  // Initialize connections
  useEffect(() => {
    try {
      const newConnections = generateConnections(buildings);
      setConnections(newConnections);
    } catch (error) {
      console.error("Error generating connections:", error);
    }
  }, [buildings]);
  
  // Create periodic activity events - architectural events
  useEffect(() => {
    const types = ['occupancy-change', 'maintenance-alert', 'climate-data', 'space-optimization', 'traffic-flow'];
    const messages = [
      'Occupancy surge',
      'Maintenance needed',
      'Temperature optimal',
      'Space underutilized',
      'High traffic detected'
    ];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    
    // Generate new event periodically
    const generateEvent = () => {
      try {
        const buildingIndex = Math.floor(Math.random() * buildings.length);
        const building = buildings[buildingIndex];
        const typeIndex = Math.floor(Math.random() * types.length);
        
        const newEvent: ActivityEvent = {
          id: `event-${Date.now()}-${Math.random()}`,
          buildingId: building.id,
          message: `${messages[typeIndex]} in ${building.name}`,
          type: types[typeIndex] as any,
          timestamp: Date.now(),
          position: new Vector3(...building.position),
          color: colors[typeIndex]
        };
        
        setActivityEvents(prev => [...prev, newEvent]);
        
        // Remove old events
        setActivityEvents(prev => prev.filter(e => 
          Date.now() - e.timestamp < 5000 // Keep events for 5 seconds
        ));
      } catch (error) {
        console.error("Error generating activity event:", error);
      }
    };
    
    const interval = setInterval(generateEvent, 5000); // Slower interval for performance
    return () => clearInterval(interval);
  }, [buildings]);
  
  // Generate data stream events
  useEffect(() => {
    // More detailed event templates with specific building relevance
    const eventTemplates = [
      { 
        type: 'occupancy-change', 
        messages: [
          "Occupancy increased to", 
          "Occupancy decreased to", 
          "Peak occupancy detected at",
          "Low occupancy detected at",
          "Occupancy threshold exceeded at",
          "Occupancy holding steady at",
          "Occupancy fluctuating around"
        ],
        suffixes: [
          "in main area",
          "in second floor",
          "in east wing",
          "in conference zone",
          "in lobby area",
          "throughout building",
          "in core zones"
        ]
      },
      { 
        type: 'maintenance-alert', 
        messages: [
          "HVAC system needs maintenance in", 
          "Lighting system alert detected in", 
          "Elevator service needed for",
          "Security system alert in",
          "Plumbing issue detected in",
          "Electrical system maintenance for",
          "Air handling unit alert in",
          "Fire system check required for"
        ],
        suffixes: [
          "zone B",
          "north sector",
          "floors 2-4",
          "all public areas",
          "restricted zones",
          "service corridors"
        ]
      },
      { 
        type: 'climate-data', 
        messages: [
          "Temperature reading at", 
          "Humidity level measured at", 
          "CO2 levels detected at", 
          "Air quality index currently",
          "VOC levels measured at",
          "Particulate matter (PM2.5) at",
          "Thermal comfort index at",
          "Heating efficiency at"
        ],
        suffixes: [
          "within optimal range",
          "slightly above threshold",
          "below recommended level",
          "meeting sustainability targets",
          "requiring adjustment",
          "trending upward"
        ]
      },
      { 
        type: 'space-optimization', 
        messages: [
          "Space utilization measured at", 
          "Conference room usage at", 
          "Workspace density reached",
          "Storage capacity currently at",
          "Hot desk usage trending at",
          "Collaborative space usage at",
          "Circulation area efficiency at",
          "Functional density ratio at"
        ],
        suffixes: [
          "suggests reconfiguration opportunity",
          "indicates optimal usage",
          "below expected threshold",
          "exceeding design capacity",
          "meeting projected metrics",
          "with potential for improvement"
        ]
      },
      { 
        type: 'traffic-flow', 
        messages: [
          "Lobby traffic measured at", 
          "Corridor congestion detected at", 
          "Entrance flow rate currently",
          "Exit pathway throughput at",
          "Vertical circulation load at",
          "Intersection node traffic at",
          "Pathway density measured at",
          "Critical junction flow at"
        ],
        suffixes: [
          "during peak hours",
          "under normal conditions",
          "with minimal congestion",
          "exceeding comfort threshold",
          "affecting adjacent zones",
          "creating bottleneck effect"
        ]
      }
    ];
    
    // Building-specific areas based on type
    const buildingAreas = {
      'hospital': ['Emergency Dept', 'Patient Wing', 'Radiology', 'Surgical Suite', 'ICU', 'Pharmacy', 'Reception'],
      'office': ['Main Floor', 'Executive Level', 'Open Office', 'Meeting Suites', 'Cafeteria', 'Lobby', 'Workspace'],
      'retail': ['Sales Floor', 'Stockroom', 'Food Court', 'Customer Service', 'Checkout Area', 'Display Zone', 'Entrance'],
      'residence': ['Apartment Block', 'Common Areas', 'Recreation Zone', 'Entrance Hall', 'Living Quarters', 'Utility Areas', 'Garden'],
      'education': ['Classroom Wing', 'Administration', 'Library', 'Student Center', 'Laboratory', 'Lecture Hall', 'Cafeteria']
    };
    
    // Unit types appropriate for different events
    const unitTypes = {
      'temperature': '°F',
      'humidity': '%',
      'co2': 'ppm',
      'occupancy': '%',
      'traffic': ' people/min',
      'utilization': '%',
      'efficiency': '%',
      'energy': ' kWh',
      'air': ' AQI',
      'flow': ' l/min',
      'density': ' p/m²'
    };
    
    // Generate a new event every few seconds
    const generateDataStreamEvent = () => {
      try {
        // Pick random building
        const building = buildings[Math.floor(Math.random() * buildings.length)];
        
        // Pick random event type
        const eventTypeIndex = Math.floor(Math.random() * eventTemplates.length);
        const eventTemplate = eventTemplates[eventTypeIndex];
        const eventType = eventTemplate.type as DataStreamEvent['type'];
        
        // Pick random message
        const messageIndex = Math.floor(Math.random() * eventTemplate.messages.length);
        const messageBase = eventTemplate.messages[messageIndex];
        
        // Maybe add a suffix (70% chance)
        const includeSuffix = Math.random() < 0.7;
        const suffix = includeSuffix ? 
          eventTemplate.suffixes[Math.floor(Math.random() * eventTemplate.suffixes.length)] : '';
        
        // Determine if we need a value
        const needsValue = messageBase.includes("at") || 
                          messageBase.includes("to") || 
                          messageBase.includes("reached") || 
                          messageBase.includes("measured") || 
                          messageBase.includes("detected") || 
                          messageBase.includes("currently");
        
        // Building-specific area
        const areas = buildingAreas[building.type] || buildingAreas['office'];
        const area = areas[Math.floor(Math.random() * areas.length)];
        
        // Build complete message
        let message = messageBase;
        if (area && Math.random() > 0.5) {
          message += ` ${area}`;
        }
        
        // Value and unit
        let value, unit;
        if (needsValue) {
          switch (eventType) {
            case 'occupancy-change':
              value = Math.floor(Math.random() * 80) + 20;
              unit = unitTypes.occupancy;
              break;
            case 'climate-data':
              if (messageBase.includes("Temperature")) {
                value = Math.floor(Math.random() * 8) + 68;
                unit = unitTypes.temperature;
              } else if (messageBase.includes("Humidity")) {
                value = Math.floor(Math.random() * 30) + 30;
                unit = unitTypes.humidity;
              } else if (messageBase.includes("CO2")) {
                value = Math.floor(Math.random() * 300) + 400;
                unit = unitTypes.co2;
              } else if (messageBase.includes("Particulate")) {
                value = Math.floor(Math.random() * 30) + 5;
                unit = ' μg/m³';
              } else {
                value = Math.floor(Math.random() * 30) + 70;
                unit = unitTypes.air;
              }
              break;
            case 'space-optimization':
              value = Math.floor(Math.random() * 50) + 50;
              unit = unitTypes.utilization;
              if (messageBase.includes("density")) {
                value = Math.random() * 0.9 + 0.3;
                value = Math.round(value * 100) / 100; // Round to 2 decimal places
                unit = unitTypes.density;
              }
              break;
            case 'traffic-flow':
              value = Math.floor(Math.random() * 30) + 5;
              unit = unitTypes.traffic;
              if (messageBase.includes("density")) {
                value = Math.random() * 2 + 0.5;
                value = Math.round(value * 100) / 100; // Round to 2 decimal places
                unit = unitTypes.density;
              }
              break;
            case 'maintenance-alert':
              // Only some maintenance alerts need values
              if (messageBase.includes("efficiency") || messageBase.includes("level")) {
                value = Math.floor(Math.random() * 100);
                unit = '%';
              }
              break;
            default:
              value = Math.floor(Math.random() * 100);
              unit = '%';
          }
        }
        
        // Create new event
        const newEvent: DataStreamEvent = {
          id: `stream-${Date.now()}-${Math.random()}`,
          buildingId: building.id,
          buildingName: building.name,
          buildingType: building.type,
          message: message,
          type: eventType,
          timestamp: Date.now(),
          location: building.location,
          value: value,
          unit: unit
        };
        
        // Add suffix after the value/unit if needed
        if (suffix && suffix.length > 0) {
          newEvent.message = `${message} ${value !== undefined ? '' : suffix}`;
          if (value !== undefined) {
            newEvent.suffix = suffix;
          }
        }
        
        // Add to events queue, keeping last 30
        setDataStreamEvents(prev => [...prev.slice(-29), newEvent]);
      } catch (error) {
        console.error("Error generating data stream event:", error);
      }
    };
    
    // Generate initial data
    for (let i = 0; i < 15; i++) {
      // Generate events with timestamps slightly in the past
      setTimeout(generateDataStreamEvent, 10);
    }
    
    // Set up interval for new events (variable timing for more realism)
    const generateWithRandomDelay = () => {
      const delay = Math.random() * 2000 + 1000; // 1-3 seconds
      setTimeout(() => {
        generateDataStreamEvent();
        generateWithRandomDelay(); // Schedule next event
      }, delay);
    };
    
    // Start the first random delay
    generateWithRandomDelay();
    
    // Clean up
    return () => {
      // The recursive setTimeout pattern is automatically cleaned up
      // when the component unmounts because no new timeouts are scheduled
    };
  }, [buildings]);
  
  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      try {
        setStats(prev => ({
          ...prev,
          activeOccupants: prev.activeOccupants + Math.floor(Math.random() * 40) - 10, // Fluctuating occupancy
          spaceUtilization: prev.spaceUtilization + Math.floor(Math.random() * 500) - 200,
          energyUsage: prev.energyUsage + Math.floor(Math.random() * 50) - 20,
          movementPatterns: {
            primary: prev.movementPatterns.primary + Math.floor(Math.random() * 2000) - 500,
            secondary: prev.movementPatterns.secondary + Math.floor(Math.random() * 1000) - 300
          }
        }));
      } catch (error) {
        console.error("Error updating stats:", error);
      }
    };
    
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);
  
  // Handle building selection
  const handleBuildingClick = (building: Building) => {
    setSelectedBuilding(prev => prev?.id === building.id ? null : building);
  };
  
  return (
    <>
      {/* Globe and environment */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.4} />
      <pointLight position={[-10, -10, -10]} intensity={0.2} />
      
      {/* Central sphere - adjusted to look more like GitHub globe */}
      <Sphere args={[8, 64, 64]} position={[0, 0, 0]}>
        <meshStandardMaterial 
          color="#0d1117" 
          emissive="#0d1117"
          roughness={0.9} 
          metalness={0.1}
          opacity={0.95}
          transparent
        />
      </Sphere>
      
      {/* Add subtle glow to the globe */}
      <Sphere args={[8.05, 32, 32]} position={[0, 0, 0]}>
        <meshBasicMaterial 
          color="#1f6feb"
          transparent
          opacity={0.03}
        />
      </Sphere>
      
      {/* Orbital rings */}
      <OrbitalRings />
      
      {/* Stars background */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Building nodes */}
      {buildings.map(building => (
        <BuildingNode 
          key={building.id} 
          building={building} 
          selected={selectedBuilding?.id === building.id}
          onClick={() => handleBuildingClick(building)}
        />
      ))}
      
      {/* Connections between buildings */}
      {connections.filter(c => c.active).map((connection, i) => {
        const source = buildings.find(b => b.id === connection.source);
        const target = buildings.find(b => b.id === connection.target);
        
        if (!source || !target) return null;
        
        return (
          <ConnectionFlow 
            key={`connection-${i}`}
            start={new THREE.Vector3(...source.position)}
            end={new THREE.Vector3(...target.position)}
            color={connection.color}
          />
        );
      })}
      
      {/* Activity events */}
      {activityEvents.map(event => (
        <ActivityNode key={event.id} event={event} />
      ))}
      
      {/* Controls */}
      <OrbitControls 
        enableZoom={true}
        enablePan={false}
        enableRotate={true}
        autoRotate={!selectedBuilding}
        autoRotateSpeed={0.4}
        minDistance={12}
        maxDistance={25}
      />
      
      {/* Building details panel */}
      <Html fullscreen>
        {/* Stats display */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {/* Top-left: Active Occupants - moved lower when a building is selected */}
          <div className={`absolute ${selectedBuilding ? 'top-96' : 'top-4'} left-4 bg-gray-900 bg-opacity-70 p-4 rounded-lg transition-all duration-300`}>
            <div className="text-gray-400 text-sm">Active Occupants</div>
            <div className="text-blue-400 text-4xl font-mono">{stats.activeOccupants.toLocaleString()}</div>
            <div className="text-gray-500 text-xs">Today So Far</div>
          </div>
          
          {/* Top-center: Space Utilization */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 bg-opacity-70 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Space Utilization</div>
            <div className="text-blue-400 text-4xl font-mono">{stats.spaceUtilization.toLocaleString()} ft²</div>
            <div className="text-gray-500 text-xs">Today So Far</div>
          </div>
          
          {/* Bottom-left: Movement Patterns */}
          <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-70 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Movement Patterns</div>
            <div className="font-mono">
              <span className="text-green-500 text-3xl">+{stats.movementPatterns.primary.toLocaleString()}</span>
              <span className="text-orange-500 text-3xl ml-2">+{stats.movementPatterns.secondary.toLocaleString()}</span>
            </div>
            <div className="text-gray-500 text-xs">Primary & Secondary Paths</div>
          </div>
          
          {/* Bottom-right: Building count */}
          <div className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-70 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Buildings</div>
            <div className="text-blue-400 text-4xl font-mono">{stats.totalBuildings}</div>
            <div className="text-gray-500 text-xs">In Portfolio</div>
          </div>
          
          {/* Data Stream Panel */}
          <div className="pointer-events-auto">
            <DataStream events={dataStreamEvents} />
          </div>
        </div>
        
        {/* Building details panel */}
        {selectedBuilding && (
          <BuildingDetailsPanel 
            building={selectedBuilding} 
            onClose={() => setSelectedBuilding(null)}
          />
        )}
      </Html>
    </>
  );
}

// Loading component
function Loader() {
  return (
    <Html center>
      <div className="bg-gray-900 p-6 rounded-lg text-blue-400 text-center">
        <div className="text-xl mb-2">Loading Building Network</div>
        <div className="w-32 h-1 bg-gray-800 mx-auto overflow-hidden">
          <div className="h-full bg-blue-500 w-1/2 animate-pulse"></div>
        </div>
      </div>
    </Html>
  );
}

// Main component export
const GlobeVisualization: React.FC = () => {
  // Add error handling
  const [hasError, setHasError] = useState(false);
  
  // Handle errors in the 3D context
  const handleError = (error: any) => {
    console.error("Error in GlobeVisualization:", error);
    setHasError(true);
  };
  
  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="bg-red-900 bg-opacity-50 p-6 rounded-lg text-white text-center">
          <div className="text-xl mb-2">Failed to load 3D visualization</div>
          <div className="text-sm mb-4">
            There was an error rendering the 3D visualization. This could be due to WebGL 
            compatibility issues or missing browser features.
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full">
      <Canvas 
        shadows 
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [0, 0, 20], fov: 50 }}
        onCreated={() => console.log("Canvas created successfully")}
        onError={handleError}
      >
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', 20, 40]} />
        
        <Suspense fallback={<Loader />}>
          <GlobeScene />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default GlobeVisualization; 