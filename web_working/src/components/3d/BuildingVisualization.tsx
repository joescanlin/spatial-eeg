import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  Text, 
  Sky, 
  Environment,
  useTexture,
  Plane
} from '@react-three/drei';
import * as THREE from 'three';
import { GridData } from '../../types/grid';

interface BuildingVisualizationProps {
  data: GridData;
}

// Point interface for walking paths
interface PathPoint {
  x: number;
  y: number;
  z: number;
  timestamp: number;
  intensity: number;
}

// Constants for building structure
const FLOOR_SIZE = 20;
const WALL_HEIGHT = 4;
const ROOM_SIZE = 6;
const CORRIDOR_WIDTH = 2;

// Simulated walking paths data
const simulateWalkingPaths = (): PathPoint[][] => {
  // Create 5 different paths with random variations
  const paths: PathPoint[][] = [];
  
  // Path 1: Conference room to office
  const path1: PathPoint[] = [];
  let x = -FLOOR_SIZE/3;
  let z = -FLOOR_SIZE/4;
  
  for (let i = 0; i < 20; i++) {
    path1.push({
      x,
      y: 0.05,
      z,
      timestamp: Date.now() - (20 - i) * 500,
      intensity: Math.random() * 0.5 + 0.5
    });
    
    if (i < 10) x += 0.5;
    else z += 0.4;
  }
  paths.push(path1);
  
  // Path 2: Kitchen to bathroom
  const path2: PathPoint[] = [];
  x = FLOOR_SIZE/3;
  z = FLOOR_SIZE/3;
  
  for (let i = 0; i < 15; i++) {
    path2.push({
      x,
      y: 0.05,
      z,
      timestamp: Date.now() - (15 - i) * 700,
      intensity: Math.random() * 0.5 + 0.5
    });
    
    if (i < 8) x -= 0.6;
    else z -= 0.5;
  }
  paths.push(path2);
  
  // Path 3: Main entrance to office area
  const path3: PathPoint[] = [];
  x = 0;
  z = FLOOR_SIZE/2 - 1;
  
  for (let i = 0; i < 25; i++) {
    path3.push({
      x,
      y: 0.05,
      z,
      timestamp: Date.now() - (25 - i) * 400,
      intensity: Math.random() * 0.5 + 0.5
    });
    
    z -= 0.4;
    if (i > 15) x += 0.3;
  }
  paths.push(path3);
  
  // Path 4: Office to break room
  const path4: PathPoint[] = [];
  x = FLOOR_SIZE/4;
  z = -FLOOR_SIZE/3;
  
  for (let i = 0; i < 18; i++) {
    path4.push({
      x,
      y: 0.05,
      z,
      timestamp: Date.now() - (18 - i) * 600,
      intensity: Math.random() * 0.5 + 0.5
    });
    
    if (i < 10) x -= 0.4;
    else z += 0.5;
  }
  paths.push(path4);
  
  // Path 5: Random wandering in common area
  const path5: PathPoint[] = [];
  x = 0;
  z = 0;
  
  for (let i = 0; i < 30; i++) {
    path5.push({
      x: x + Math.sin(i * 0.4) * 2,
      y: 0.05,
      z: z + Math.cos(i * 0.4) * 2,
      timestamp: Date.now() - (30 - i) * 300,
      intensity: Math.random() * 0.5 + 0.5
    });
  }
  paths.push(path5);
  
  return paths;
};

function Floor() {
  const texture = useTexture({
    map: 'https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/prototype/light/texture_08.png',
  });
  
  // Adjust texture repeat to create a tiled floor
  texture.map.repeat.set(10, 10);
  texture.map.wrapS = texture.map.wrapT = THREE.RepeatWrapping;
  
  return (
    <Plane 
      args={[FLOOR_SIZE, FLOOR_SIZE]} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        {...texture}
        color="#f0f0f0"
        roughness={0.8}
      />
    </Plane>
  );
}

interface WallProps {
  width?: number;
  height?: number;
  depth?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
}

function Wall({ 
  width = 1, 
  height = WALL_HEIGHT, 
  depth = 0.1, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  color = "#e0e0e0"
}: WallProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

interface RoomProps {
  position?: [number, number, number];
  size?: number;
  name?: string;
  color?: string;
}

function Room({ 
  position = [0, 0, 0], 
  size = ROOM_SIZE, 
  name = "",
  color = "#e0e0e0"
}: RoomProps) {
  const halfSize = size / 2;
  
  return (
    <group position={position}>
      {/* Room label */}
      <Text
        position={[0, 0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.4}
        color="#333"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
      
      {/* Walls */}
      <Wall 
        width={size} 
        position={[0, WALL_HEIGHT / 2, -halfSize]} 
      />
      <Wall 
        width={size} 
        position={[0, WALL_HEIGHT / 2, halfSize]} 
      />
      <Wall 
        width={size} 
        position={[-halfSize, WALL_HEIGHT / 2, 0]} 
        rotation={[0, Math.PI / 2, 0]}
      />
      <Wall 
        width={size} 
        position={[halfSize, WALL_HEIGHT / 2, 0]} 
        rotation={[0, Math.PI / 2, 0]}
      />
      
      {/* Color tinted floor for the room */}
      <Plane 
        args={[size - 0.1, size - 0.1]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0.01, 0]}
      >
        <meshStandardMaterial color={color} roughness={0.8} transparent opacity={0.3} />
      </Plane>
    </group>
  );
}

interface WalkingPathProps {
  path: PathPoint[];
  color?: string;
}

function WalkingPath({ path, color = "#3b82f6" }: WalkingPathProps) {
  const points = path.map(p => new THREE.Vector3(p.x, p.y, p.z));
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  
  return (
    <group>
      {/* Line representing the path */}
      <primitive object={new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color }))} />
      
      {/* Points along the path */}
      {path.map((point, index) => (
        <mesh key={index} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.1 * point.intensity, 8, 8]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

function BuildingStructure() {
  return (
    <group>
      {/* Main floor */}
      <Floor />
      
      {/* Outer walls */}
      <Wall width={FLOOR_SIZE} position={[0, WALL_HEIGHT / 2, -FLOOR_SIZE / 2]} />
      <Wall width={FLOOR_SIZE} position={[0, WALL_HEIGHT / 2, FLOOR_SIZE / 2]} />
      <Wall width={FLOOR_SIZE} position={[-FLOOR_SIZE / 2, WALL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} />
      <Wall width={FLOOR_SIZE} position={[FLOOR_SIZE / 2, WALL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} />
      
      {/* Rooms */}
      <Room 
        position={[-FLOOR_SIZE / 4, 0, -FLOOR_SIZE / 4]} 
        name="Conference Room"
        color="#90cdf4"
      />
      <Room 
        position={[FLOOR_SIZE / 4, 0, -FLOOR_SIZE / 4]} 
        name="Office Area"
        color="#c6f6d5"
      />
      <Room 
        position={[-FLOOR_SIZE / 4, 0, FLOOR_SIZE / 4]} 
        name="Break Room"
        color="#fbd38d"
      />
      <Room 
        position={[FLOOR_SIZE / 4, 0, FLOOR_SIZE / 4]} 
        name="Kitchen"
        color="#fed7d7"
      />
      
      {/* Entrance */}
      <Wall 
        width={FLOOR_SIZE / 4} 
        position={[-FLOOR_SIZE / 8 - 2, WALL_HEIGHT / 2, FLOOR_SIZE / 2]} 
      />
      <Wall 
        width={FLOOR_SIZE / 4} 
        position={[FLOOR_SIZE / 8 + 2, WALL_HEIGHT / 2, FLOOR_SIZE / 2]} 
      />
      
      {/* Bathrooms */}
      <Room 
        position={[0, 0, 0]} 
        size={ROOM_SIZE / 2}
        name="Bathroom"
        color="#e9d8fd"
      />
    </group>
  );
}

interface BuildingSceneProps {
  walkingPaths: PathPoint[][];
}

function BuildingScene({ walkingPaths }: BuildingSceneProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[10, 10, 10]} 
        intensity={0.8} 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      
      <BuildingStructure />
      
      {/* Walking Paths */}
      {walkingPaths.map((path, index) => (
        <WalkingPath 
          key={index} 
          path={path} 
          color={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} 
        />
      ))}
      
      {/* Sky and Environment */}
      <Sky sunPosition={[100, 10, 100]} />
      <Environment preset="city" />
      
      {/* Camera Controls */}
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05} 
        minDistance={5} 
        maxDistance={50}
        maxPolarAngle={Math.PI / 2 - 0.1} // Prevent camera from going below ground
      />
    </>
  );
}

export default function BuildingVisualization({ data }: BuildingVisualizationProps) {
  const [walkingPaths, setWalkingPaths] = useState<PathPoint[][]>(simulateWalkingPaths());
  
  // Update walking paths periodically to create animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setWalkingPaths(paths => {
        return paths.map(path => {
          // Add a new point to the path
          if (path.length > 0) {
            const lastPoint = path[path.length - 1];
            const newX = lastPoint.x + (Math.random() - 0.5) * 0.5;
            const newZ = lastPoint.z + (Math.random() - 0.5) * 0.5;
            
            // Keep points within the building
            const boundedX = Math.max(-FLOOR_SIZE/2 + 1, Math.min(FLOOR_SIZE/2 - 1, newX));
            const boundedZ = Math.max(-FLOOR_SIZE/2 + 1, Math.min(FLOOR_SIZE/2 - 1, newZ));
            
            const newPoint: PathPoint = {
              x: boundedX,
              y: 0.05,
              z: boundedZ,
              timestamp: Date.now(),
              intensity: Math.random() * 0.5 + 0.5
            };
            
            return [...path.slice(-20), newPoint]; // Keep only the last 20 points
          }
          return path;
        });
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 left-4 z-10 bg-gray-900/70 p-3 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Building Activity View</h2>
        <p className="text-sm text-gray-300 mb-4">
          Visualizing walking paths and activity patterns across the building
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs">Conference Room Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs">Kitchen Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs">Main Entrance Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs">Office Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-xs">Common Area Activity</span>
          </div>
        </div>
      </div>
      
      <Canvas
        shadows
        camera={{ position: [15, 15, 15], fov: 50 }}
        gl={{ antialias: true }}
      >
        <BuildingScene walkingPaths={walkingPaths} />
      </Canvas>
    </div>
  );
} 