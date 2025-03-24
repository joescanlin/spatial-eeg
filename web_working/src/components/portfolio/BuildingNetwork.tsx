import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Text, 
  Environment,
  Html,
  Billboard,
  useGLTF,
  Sphere,
  Line,
  useCursor,
  useTexture,
  ContactShadows,
  Plane,
  MeshDistortMaterial
} from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, a, config } from '@react-spring/three';
import { mockBuildingData } from './mockData';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

// Types for our data
interface BuildingWithActivity {
  id: string;
  name: string;
  type: string;
  location: string;
  size: number;
  position: [number, number, number];
  squareFootage: number;
  performance: number;
  activity: number;
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

interface EventData {
  id: number;
  building: string;
  buildingType: string;
  message: string;
  color: string;
  time: string;
}

// Shader for the glowing effect
const glowVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowFragmentShader = `
  varying vec2 vUv;
  uniform vec3 color;
  uniform float intensity;
  
  void main() {
    float distanceFromCenter = length(vUv - vec2(0.5));
    float glow = 1.0 - distanceFromCenter;
    glow = pow(glow, 3.0) * intensity;
    gl_FragColor = vec4(color, glow);
  }
`;

// Particle system for data flow representation
interface ParticlesProps {
  count: number;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  speed: number;
  size: number;
  color: string;
}

function Particles({ count, startPosition, endPosition, speed, size, color }: ParticlesProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const direction = useMemo(() => {
    return new THREE.Vector3().subVectors(endPosition, startPosition).normalize();
  }, [startPosition, endPosition]);
  
  const length = useMemo(() => {
    return startPosition.distanceTo(endPosition);
  }, [startPosition, endPosition]);
  
  // Generate random positions along the line
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      position: new THREE.Vector3(
        startPosition.x,
        startPosition.y,
        startPosition.z
      ),
      progress: Math.random(), // Random initial position along path
      speed: speed * (0.5 + Math.random() * 0.5) // Slightly varied speeds
    }));
  }, [count, startPosition, speed]);
  
  useFrame((state, delta) => {
    if (!mesh.current) return;
    
    // Update particle positions
    particles.forEach((particle, i) => {
      // Move particle along the line
      particle.progress += delta * particle.speed;
      
      // Reset if it reaches the end
      if (particle.progress > 1) {
        particle.progress = 0;
      }
      
      // Calculate new position
      particle.position.copy(startPosition).addScaledVector(
        direction, 
        particle.progress * length
      );
      
      // Update instance
      dummy.position.copy(particle.position);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </instancedMesh>
  );
}

// Glow effect for connections
interface GlowLineProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
  width: number;
  intensity: number;
}

function GlowLine({ start, end, color, width, intensity }: GlowLineProps) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const colorObj = useMemo(() => new THREE.Color(color), [color]);
  
  return (
    <mesh>
      <planeGeometry args={[start.distanceTo(end), width]} />
      <shaderMaterial
        ref={material}
        vertexShader={glowVertexShader}
        fragmentShader={glowFragmentShader}
        uniforms={{
          color: { value: colorObj },
          intensity: { value: intensity }
        }}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// Enhanced Building Node Component
interface BuildingNodeProps {
  position: [number, number, number];
  name: string;
  type: string;
  size: number;
  performance: number;
  activity: number;
  isSelected: boolean;
  onSelect: () => void;
}

const BuildingNode: React.FC<BuildingNodeProps> = ({ 
  position, 
  name, 
  type, 
  size, 
  performance,
  activity,
  isSelected,
  onSelect
}) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  // Color based on building type
  const buildingColor = useMemo(() => {
    switch(type) {
      case 'hospital': return '#2196f3'; // blue
      case 'office': return '#00e676'; // green
      case 'retail': return '#ffb74d'; // amber
      case 'residence': return '#ba68c8'; // purple
      case 'education': return '#f06292'; // pink
      default: return '#90a4ae'; // gray
    }
  }, [type]);
  
  // Visual enhancements
  const { scale, pulseOpacity, baseColor } = useSpring({
    scale: hovered || isSelected ? 1.2 : 1,
    pulseOpacity: 0.7,
    baseColor: isSelected ? '#ffffff' : buildingColor,
    config: config.gentle
  });
  
  // Pulse animation
  useFrame(({ clock }) => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      
      // Pulse glow based on activity level
      const pulse = (Math.sin(clock.getElapsedTime() * 2) * 0.2 + 0.8) * activity;
      
      if (isSelected) {
        material.emissiveIntensity = pulse * 2;
      } else if (hovered) {
        material.emissiveIntensity = pulse * 1.5;
      } else {
        material.emissiveIntensity = pulse;
      }
    }
    
    // Animate glow sphere
    if (glowRef.current) {
      const scaleFactor = 1 + Math.sin(clock.getElapsedTime() * 1.5) * 0.1;
      glowRef.current.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }
  });
  
  useCursor(hovered);
  
  // Text floating effect
  const [textY, setTextY] = useState(0);
  useFrame(({ clock }) => {
    setTextY(Math.sin(clock.getElapsedTime()) * 0.05);
  });
  
  return (
    <group position={position}>
      {/* Building core sphere */}
      <a.mesh
        ref={meshRef}
        scale={scale}
        onClick={onSelect}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[size * 0.5, 32, 32]} />
        <a.meshStandardMaterial 
          color={baseColor} 
          roughness={0.1} 
          metalness={0.8}
          emissive={buildingColor}
          emissiveIntensity={activity}
        />
      </a.mesh>
      
      {/* Outer glow sphere */}
      <mesh ref={glowRef} scale={1.3}>
        <sphereGeometry args={[size * 0.5, 16, 16]} />
        <meshBasicMaterial 
          color={buildingColor} 
          transparent={true} 
          opacity={0.15} 
        />
      </mesh>
      
      {/* Light beam effect for selected buildings */}
      {isSelected && (
        <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.2, 10, 8, 1, true]} />
          <meshBasicMaterial 
            color={buildingColor} 
            transparent={true} 
            opacity={0.3} 
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Activity indicator rings */}
      {activity > 0.5 && (
        <a.mesh rotation-x={Math.PI * 0.5} scale={scale}>
          <ringGeometry args={[size * 0.7, size * 0.8, 32]} />
          <a.meshBasicMaterial 
            color={buildingColor} 
            transparent 
            opacity={pulseOpacity} 
            side={THREE.DoubleSide}
          />
        </a.mesh>
      )}
      
      {/* Building name with floating animation */}
      <Billboard
        position={[0, size * 0.9 + textY, 0]}
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        <Text
          fontSize={0.15}
          color={isSelected ? '#ffffff' : '#cccccc'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {name}
        </Text>
      </Billboard>
      
      {/* Performance indicator */}
      {(hovered || isSelected) && (
        <Html position={[0, size * -0.8, 0]} center distanceFactor={8}>
          <div className="bg-gray-900 bg-opacity-90 backdrop-blur-sm px-3 py-2 rounded-md text-xs border border-gray-700 shadow-xl">
            <div className="font-bold text-sm">{type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div className="flex items-center mt-1">
              <span className="mr-2">Performance:</span>
              <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full" 
                  style={{ 
                    width: `${performance}%`,
                    backgroundColor: buildingColor
                  }}
                ></div>
              </div>
              <span className="ml-1 font-mono">{performance}%</span>
            </div>
            <div className="flex items-center mt-1">
              <span className="mr-2">Activity:</span>
              <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full" 
                  style={{ 
                    width: `${activity * 100}%`,
                    backgroundColor: buildingColor
                  }}
                ></div>
              </div>
              <span className="ml-1 font-mono">{Math.round(activity * 100)}%</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// Enhanced Connection Line
interface ConnectionLineProps {
  start: [number, number, number];
  end: [number, number, number];
  strength: number;
  activity: number;
  color: string;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ 
  start, 
  end, 
  strength, 
  activity,
  color 
}) => {
  const startVec = useMemo(() => new THREE.Vector3(...start), [start]);
  const endVec = useMemo(() => new THREE.Vector3(...end), [end]);
  const points = [startVec, endVec];
  
  // Connection visual properties based on strength and activity
  const lineWidth = Math.max(1, strength * 3);
  const particleCount = Math.floor(strength * 20); // More particles for stronger connections
  const particleSpeed = activity * 0.3; // Faster particles for more active connections
  const particleSize = 0.02 + strength * 0.02;
  
  return (
    <group>
      {/* Core bright line */}
      <Line
        points={points}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={0.7}
      />
      
      {/* Glow effect */}
      <Line
        points={points}
        color={color}
        lineWidth={lineWidth * 3}
        transparent
        opacity={0.3}
        // Using type assertion to avoid TypeScript error
      />
      
      {/* Particle flow along connection */}
      <Particles
        count={particleCount}
        startPosition={startVec}
        endPosition={endVec}
        speed={particleSpeed}
        size={particleSize}
        color={color}
      />
    </group>
  );
};

// World globe component
function Globe({ radius = 7 }) {
  // Create a simple procedural texture for the globe
  const globeRef = useRef<THREE.Mesh>(null);
  
  // Rotate the globe slowly
  useFrame(({ clock }) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.0005;
    }
  });
  
  return (
    <mesh ref={globeRef} rotation={[0, 0, 0]}>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshStandardMaterial
        color="#172a45"
        emissive="#234567"
        emissiveIntensity={0.2}
        transparent
        opacity={0.6}
        wireframe={true}
      />
    </mesh>
  );
}

// Background stars
function Stars({ count = 1000 }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useEffect(() => {
    // Position stars randomly in a sphere
    if (mesh.current) {
      for (let i = 0; i < count; i++) {
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        const distance = 20 + Math.random() * 30;
        
        const x = distance * Math.sin(phi) * Math.cos(theta);
        const y = distance * Math.sin(phi) * Math.sin(theta);
        const z = distance * Math.cos(phi);
        
        dummy.position.set(x, y, z);
        dummy.scale.set(
          0.05 + Math.random() * 0.1,
          0.05 + Math.random() * 0.1,
          0.05 + Math.random() * 0.1
        );
        dummy.updateMatrix();
        mesh.current.setMatrixAt(i, dummy.matrix);
      }
      mesh.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, dummy]);
  
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
    </instancedMesh>
  );
}

// Event notification component that appears at random positions
function EventNotification({ event, index }: { event: EventData, index: number }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0]);
  
  useEffect(() => {
    // Random position on the globe
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 8; // Just outside the globe
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    
    setPosition([x, y, z]);
    
    // Show with delay based on index
    const timer = setTimeout(() => {
      setVisible(true);
    }, index * 200);
    
    return () => clearTimeout(timer);
  }, [index]);
  
  // Fade out after 4 seconds
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [visible]);
  
  if (!visible) return null;
  
  return (
    <Billboard position={position}>
      <Html center>
        <div className="px-3 py-2 rounded-md text-xs bg-opacity-90 backdrop-blur-sm shadow-lg animate-fadeIn"
             style={{ 
               backgroundColor: `rgba(20, 30, 50, 0.8)`,
               borderLeft: `3px solid ${event.color}`,
               maxWidth: '200px'
             }}>
          <div className="font-bold">{event.building}</div>
          <div className="text-gray-300 text-xs">{event.message}</div>
          <div className="text-gray-400 text-xs mt-1">{event.time}</div>
        </div>
      </Html>
    </Billboard>
  );
}

// Main Building Network component
interface BuildingNetworkProps {
  buildingType: string;
  selectedBuildings: string[];
  onSelectBuilding: (id: string) => void;
}

export const BuildingNetwork: React.FC<BuildingNetworkProps> = ({ 
  buildingType, 
  selectedBuildings,
  onSelectBuilding
}) => {
  const buildings = useMemo<BuildingWithActivity[]>(() => {
    // Filter buildings by type if needed
    let filtered = buildingType === 'all' 
      ? mockBuildingData 
      : mockBuildingData.filter(building => building.type === buildingType);
    
    // Add activity level to each building - simulated for now
    return filtered.map(building => ({
      ...building,
      activity: Math.random() * 0.8 + 0.2 // Random activity level between 0.2 and 1.0
    }));
  }, [buildingType]);
  
  // Calculate connections between buildings with enhanced properties
  const connections = useMemo(() => {
    const result = [];
    
    for (let i = 0; i < buildings.length; i++) {
      for (let j = i + 1; j < buildings.length; j++) {
        const building1 = buildings[i];
        const building2 = buildings[j];
        
        // Skip if neither building is selected (when there are selected buildings)
        if (selectedBuildings.length > 0 && 
            !selectedBuildings.includes(building1.id) && 
            !selectedBuildings.includes(building2.id)) {
          continue;
        }
        
        // Calculate similarity (mock data)
        const similarity = Math.random() * 0.5 + 0.2; // 0.2 to 0.7 range
        
        if (similarity > 0.3) { // Only show significant connections
          // Determine connection color based on building types
          let connectionColor;
          if (building1.type === building2.type) {
            // Same type - use that building type's color
            switch(building1.type) {
              case 'hospital': connectionColor = '#2196f3'; break;
              case 'office': connectionColor = '#00e676'; break;
              case 'retail': connectionColor = '#ffb74d'; break;
              case 'residence': connectionColor = '#ba68c8'; break;
              case 'education': connectionColor = '#f06292'; break;
              default: connectionColor = '#90a4ae';
            }
          } else {
            // Different types - use neutral color
            connectionColor = '#64b5f6'; // Light blue
          }
          
          result.push({
            start: building1.position,
            end: building2.position,
            strength: similarity,
            activity: (building1.activity + building2.activity) / 2, // Average activity
            color: connectionColor
          });
        }
      }
    }
    
    return result;
  }, [buildings, selectedBuildings]);
  
  // Mock live events for the visualization
  const [events, setEvents] = useState<EventData[]>([]);
  
  // Generate new random events periodically
  useEffect(() => {
    const eventTypes = [
      { message: "High traffic detected", color: "#f44336" },
      { message: "Occupancy at 85%", color: "#ff9800" },
      { message: "Energy usage optimized", color: "#4caf50" },
      { message: "Space utilization improved", color: "#2196f3" },
      { message: "Maintenance alert resolved", color: "#9c27b0" }
    ];
    
    const generateEvent = () => {
      if (buildings.length === 0) return null;
      
      const building = buildings[Math.floor(Math.random() * buildings.length)];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      return {
        id: Date.now(),
        building: building.name,
        buildingType: building.type,
        message: eventType.message,
        color: eventType.color,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    };
    
    // Add initial events
    setEvents([
      generateEvent(),
      generateEvent(),
      generateEvent(),
      generateEvent(),
      generateEvent()
    ].filter(Boolean) as EventData[]);
    
    // Add new events periodically
    const timer = setInterval(() => {
      const newEvent = generateEvent();
      if (newEvent) {
        setEvents(prev => [...prev.slice(-10), newEvent]); // Keep only last 10 events
      }
    }, 5000);
    
    return () => clearInterval(timer);
  }, [buildings]);
  
  const cameraControls = useRef<any>();
  
  // Total statistics for all buildings
  const totalStats = useMemo(() => {
    return {
      buildingCount: buildings.length,
      totalArea: buildings.reduce((sum: number, b: BuildingWithActivity) => sum + b.squareFootage, 0),
      avgPerformance: Math.round(
        buildings.reduce((sum: number, b: BuildingWithActivity) => sum + b.performance, 0) / Math.max(buildings.length, 1)
      ),
      highActivity: buildings.filter(b => b.activity > 0.7).length
    };
  }, [buildings]);
  
  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        {/* Environmental lighting */}
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />
        
        {/* World globe */}
        <Globe radius={7} />
        
        {/* Background stars */}
        <Stars count={1000} />
        
        {/* Connections between buildings */}
        {connections.map((connection, index) => (
          <ConnectionLine 
            key={`connection-${index}`}
            start={connection.start}
            end={connection.end}
            strength={connection.strength}
            activity={connection.activity}
            color={connection.color}
          />
        ))}
        
        {/* Building nodes */}
        {buildings.map((building: BuildingWithActivity) => (
          <BuildingNode
            key={building.id}
            position={building.position}
            name={building.name}
            type={building.type}
            size={building.size}
            performance={building.performance}
            activity={building.activity}
            isSelected={selectedBuildings.includes(building.id)}
            onSelect={() => onSelectBuilding(building.id)}
          />
        ))}
        
        {/* Event notifications */}
        {events.map((event, index) => (
          <EventNotification key={event.id} event={event} index={index} />
        ))}
        
        {/* Post-processing effects */}
        <EffectComposer>
          <Bloom 
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={0.8}
          />
          <Vignette
            offset={0.5}
            darkness={0.5}
            blendFunction={BlendFunction.NORMAL}
          />
        </EffectComposer>
        
        {/* Camera controls */}
        <OrbitControls
          ref={cameraControls}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={10}
          maxDistance={20}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
      
      {/* Side panel for building metrics */}
      <div className="absolute top-4 left-4 w-60 bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-lg border border-gray-800 shadow-xl p-3 text-white">
        <h3 className="text-lg font-bold mb-2">Portfolio Overview</h3>
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-400">Buildings</span>
          <span className="text-lg font-mono">{totalStats.buildingCount}</span>
        </div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-400">Total Area</span>
          <span className="text-lg font-mono">{(totalStats.totalArea / 1000000).toFixed(1)}M ft²</span>
        </div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-400">Avg Performance</span>
          <span className="text-lg font-mono">{totalStats.avgPerformance}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">High Activity</span>
          <span className="text-lg font-mono">{totalStats.highActivity}</span>
        </div>
      </div>
      
      {/* Live activity feed */}
      <div className="absolute top-4 right-4 w-72 bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-lg border border-gray-800 shadow-xl p-3 text-white">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">Live Activity</h3>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1"></div>
            <span className="text-xs text-gray-400">LIVE</span>
          </div>
        </div>
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {events.slice().reverse().map(event => (
            <div key={event.id} className="flex items-start p-2 rounded bg-gray-800 bg-opacity-50">
              <div 
                className="w-2 h-2 rounded-full mt-1.5 mr-2 flex-shrink-0" 
                style={{ backgroundColor: event.color }}
              ></div>
              <div>
                <div className="font-bold text-sm">{event.building}</div>
                <div className="text-gray-300 text-xs">{event.message}</div>
                <div className="text-gray-500 text-xs">{event.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Building type distribution */}
      <div className="absolute bottom-4 left-4 w-60 bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-lg border border-gray-800 shadow-xl p-3 text-white">
        <h3 className="text-sm font-bold mb-2">Building Types</h3>
        
        {['hospital', 'office', 'retail', 'residence', 'education'].map(type => {
          const count = buildings.filter(b => b.type === type).length;
          const percentage = buildings.length > 0 
            ? Math.round((count / buildings.length) * 100) 
            : 0;
          
          // Get color for this building type
          const color = 
            type === 'hospital' ? '#2196f3' : 
            type === 'office' ? '#00e676' : 
            type === 'retail' ? '#ffb74d' : 
            type === 'residence' ? '#ba68c8' : 
            '#f06292';
            
          return (
            <div key={type} className="mb-1">
              <div className="flex justify-between items-center mb-0.5">
                <div className="flex items-center">
                  <div 
                    className="w-2 h-2 rounded-full mr-1.5" 
                    style={{ backgroundColor: color }}
                  ></div>
                  <span className="text-xs">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                </div>
                <span className="text-xs">{count}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full">
                <div 
                  className="h-full rounded-full" 
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: color
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-lg border border-gray-800 shadow-xl p-3 text-white">
        <h3 className="text-sm font-bold mb-1">Connection Strength</h3>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-1 bg-blue-300 opacity-30"></div>
          <span className="text-xs">Low</span>
          <div className="w-4 h-1 bg-blue-400 opacity-60"></div>
          <span className="text-xs">Medium</span>
          <div className="w-4 h-1 bg-blue-500 opacity-100"></div>
          <span className="text-xs">High</span>
        </div>
      </div>
    </div>
  );
}; 