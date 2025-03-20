import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Plane } from '@react-three/drei';

interface SensorGridProps {
  data: number[][];
}

// Constants for grid dimensions and visualization
const GRID_WIDTH = 12;
const GRID_HEIGHT = 15;

// Real-world measurements
const SENSOR_INCHES = 4; // Each sensor is 4" x 4"
const INCH_TO_UNIT = 0.04; // Conversion factor from inches to 3D units
const SENSOR_SIZE = SENSOR_INCHES * INCH_TO_UNIT; // Size of each sensor pillar (properly scaled)

const MAX_PILLAR_HEIGHT = 2.0; // Increased maximum height for more dramatic effect
const MIN_PILLAR_HEIGHT = 0.01; // Minimum height (nearly invisible)
const HEIGHT_GROW_SPEED = 3.0; // How quickly pillars grow when activated
const HEIGHT_SHRINK_SPEED = 2.5; // How quickly pillars shrink when deactivated
const TRAIL_DECAY_TIME = 4.0; // How long the trail effect lasts in seconds

// Enhanced color palette for visualization
const INACTIVE_COLOR = new THREE.Color(0x1e293b); // Dark slate blue (nearly invisible)
const INITIAL_COLOR = new THREE.Color(0x3b82f6); // Medium blue
const ACTIVE_COLOR = new THREE.Color(0x60a5fa); // Bright blue
const PEAK_COLOR = new THREE.Color(0x93c5fd); // Light blue

// Ripple effect settings
interface Ripple {
  position: [number, number, number];
  startTime: number;
  size: number;
  duration: number; // in seconds
  color: THREE.Color;
}

export default function SensorGrid({ data }: SensorGridProps) {
  // Store activation timestamps to control pillar height and color
  const activationState = useRef<{
    timestamp: number;
    height: number;
    active: boolean;
    color: THREE.Color;
  }[][]>(
    Array(GRID_HEIGHT).fill(0).map(() => 
      Array(GRID_WIDTH).fill(0).map(() => ({
        timestamp: 0,
        height: 0.01,
        active: false,
        color: INACTIVE_COLOR.clone()
      }))
    )
  );
  
  // Reference to track time
  const timeRef = useRef<number>(0);
  
  // Add ripple effects state
  const [ripples, setRipples] = useState<Ripple[]>([]);
  
  // Animate sensors on each frame
  useFrame((state) => {
    const currentTime = state.clock.getElapsedTime();
    const deltaTime = currentTime - timeRef.current;
    timeRef.current = currentTime;
    
    // Used to track newly activated sensors for ripples
    const newActivations: [number, number][] = [];
    
    // Update sensor activation states
    let totalPressure = 0;
    let weightedX = 0;
    let weightedZ = 0;
    
    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < data[row].length; col++) {
        const value = data[row][col];
        const isActive = value > 0;
        const sensorState = activationState.current[row][col];
        
        // Calculate center of pressure for camera follow
        if (isActive) {
          const worldX = col - GRID_WIDTH/2 + 0.5;
          const worldZ = row - GRID_HEIGHT/2 + 0.5;
          totalPressure += value;
          weightedX += worldX * value;
          weightedZ += worldZ * value;
        }
        
        if (isActive) {
          // Track new activations for ripple effect
          if (!sensorState.active) {
            const worldX = col - GRID_WIDTH/2 + 0.5;
            const worldZ = row - GRID_HEIGHT/2 + 0.5;
            newActivations.push([worldX, worldZ]);
            
            sensorState.timestamp = currentTime;
            sensorState.active = true;
          }
          
          // Grow height up to max with smooth acceleration
          const timeSinceActivation = currentTime - sensorState.timestamp;
          const growthFactor = Math.min(1, timeSinceActivation / 1.0); // Normalize to 0-1 over 1 second
          const targetHeight = MAX_PILLAR_HEIGHT * (value > 0.5 ? 1.0 : 0.7); // Taller for higher pressure
          
          // Smooth growth with easing function
          const easedGrowth = 1 - Math.pow(1 - growthFactor, 3); // Cubic ease-out
          sensorState.height = MIN_PILLAR_HEIGHT + (targetHeight - MIN_PILLAR_HEIGHT) * easedGrowth;
          
          // Enhanced color transition: inactive -> initial -> active -> peak
          let colorT;
          
          if (timeSinceActivation < 0.5) {
            // First phase: inactive to initial (0-0.5s)
            colorT = timeSinceActivation / 0.5;
            sensorState.color.copy(INACTIVE_COLOR).lerp(INITIAL_COLOR, colorT);
          } else if (timeSinceActivation < 1.2) {
            // Second phase: initial to active (0.5-1.2s)
            colorT = (timeSinceActivation - 0.5) / 0.7;
            sensorState.color.copy(INITIAL_COLOR).lerp(ACTIVE_COLOR, colorT);
          } else {
            // Final phase: active to peak (after 1.2s)
            colorT = Math.min(1, (timeSinceActivation - 1.2) / 0.8);
            sensorState.color.copy(ACTIVE_COLOR).lerp(PEAK_COLOR, colorT);
          }
          
        } else if (sensorState.active) {
          // Deactivate and start shrinking
          sensorState.active = false;
          sensorState.timestamp = currentTime;
        } else if (sensorState.height > MIN_PILLAR_HEIGHT) {
          // Continue shrinking deactivated sensor with smooth decay
          const timeSinceDeactivation = currentTime - sensorState.timestamp;
          const decayProgress = Math.min(1, timeSinceDeactivation / TRAIL_DECAY_TIME);
          
          // Apply easing for natural decompression (fast at first, then slower)
          const easedDecay = decayProgress * decayProgress; // Quadratic ease-in
          const newHeight = MAX_PILLAR_HEIGHT * (1 - easedDecay) + MIN_PILLAR_HEIGHT * easedDecay;
          sensorState.height = Math.max(MIN_PILLAR_HEIGHT, newHeight);
          
          // Fade color back to inactive with delay (keeps color longer than height)
          if (timeSinceDeactivation > TRAIL_DECAY_TIME * 0.2) {
            const colorDecay = (timeSinceDeactivation - TRAIL_DECAY_TIME * 0.2) / (TRAIL_DECAY_TIME * 0.8);
            sensorState.color.lerp(INACTIVE_COLOR, colorDecay * deltaTime * 3);
          }
        }
      }
    }
    
    // Create ripples for newly activated sensors
    if (newActivations.length > 0) {
      setRipples(prev => [
        ...prev,
        ...newActivations.map(([x, z]) => ({
          position: [x, 0.05, z] as [number, number, number],
          startTime: currentTime,
          size: 0,
          duration: 1.0, // 1 second ripple effect
          color: new THREE.Color(0x60a5fa)
        }))
      ]);
    }
    
    // Update and clean up existing ripples
    setRipples(prev => 
      prev
        .filter(ripple => (currentTime - ripple.startTime) < ripple.duration)
        .map(ripple => ({
          ...ripple,
          size: 3 * Math.min(1, (currentTime - ripple.startTime) / ripple.duration)
        }))
    );
    
    // Update center of pressure marker if we have any pressure
    if (totalPressure > 0) {
      const centerMarker = state.scene.getObjectByName('center-marker');
      if (centerMarker) {
        const copX = weightedX / totalPressure;
        const copZ = weightedZ / totalPressure;
        centerMarker.position.set(copX, 0.3, copZ);
        centerMarker.visible = true;
      }
    } else {
      // Hide marker when no pressure
      const centerMarker = state.scene.getObjectByName('center-marker');
      if (centerMarker) {
        centerMarker.visible = false;
      }
    }
  });
  
  // Create trail effect meshes for activated sensors
  const sensorMeshes = useMemo(() => {
    const meshes = [];
    
    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        meshes.push({
          position: [
            (col - GRID_WIDTH/2 + 0.5) * SENSOR_SIZE, // Center the grid on X, properly scaled
            0, // Y will be adjusted in render
            (row - GRID_HEIGHT/2 + 0.5) * SENSOR_SIZE // Center the grid on Z, properly scaled
          ],
          key: `sensor-${row}-${col}`,
          indices: [row, col]
        });
      }
    }
    
    return meshes;
  }, []);
  
  return (
    <group>
      {/* Base grid plane */}
      <Plane 
        args={[GRID_WIDTH * SENSOR_SIZE, GRID_HEIGHT * SENSOR_SIZE]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial 
          color="#1e293b" 
          transparent 
          opacity={0.5} 
          roughness={0.8} 
          metalness={0.2}
        />
      </Plane>
      
      {/* Grid lines */}
      <primitive object={new THREE.GridHelper(
        Math.max(GRID_WIDTH, GRID_HEIGHT) * SENSOR_SIZE, 
        Math.max(GRID_WIDTH, GRID_HEIGHT), 
        '#2d3748', '#2d3748'
      )} position={[0, 0.01, 0]} />
      
      {/* Ripple effects */}
      {ripples.map((ripple, index) => {
        const progress = (performance.now() * 0.001 - ripple.startTime) / ripple.duration;
        const opacity = 1 - progress;
        
        return (
          <mesh
            key={`ripple-${index}-${ripple.startTime}`}
            position={ripple.position}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={1}
          >
            <ringGeometry args={[
              ripple.size * 0.5, 
              ripple.size * 0.6,
              16
            ]} />
            <meshBasicMaterial
              color={ripple.color}
              transparent
              opacity={opacity * 0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
      
      {/* Sensor pillars with dynamic height and color */}
      {sensorMeshes.map(({ position, key, indices }) => {
        const [row, col] = indices;
        const sensorState = activationState.current[row][col];
        const height = sensorState.height;
        const color = sensorState.color;
        const isActive = sensorState.active;
        
        // Add subtle pulse effect for active sensors
        const time = performance.now() * 0.001; // Current time in seconds
        const pulseScale = isActive ? 1.0 + Math.sin(time * 4) * 0.07 : 1.0; // Pulse between 0.93 and 1.07
        const emissiveIntensity = isActive ? 0.3 + Math.sin(time * 3) * 0.15 : 0.1; // Pulse emissive glow
        
        return (
          <mesh 
            key={key} 
            position={[position[0], height/2, position[2]]} 
            scale={[pulseScale, height, pulseScale]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[SENSOR_SIZE, 1, SENSOR_SIZE]} />
            <meshPhongMaterial 
              color={color} 
              emissive={color} 
              emissiveIntensity={emissiveIntensity}
              shininess={60}
            />
          </mesh>
        );
      })}
      
      {/* Center of pressure marker for camera follow mode */}
      <mesh position={[0, 0.3, 0]} name="center-marker" visible={false}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ff0000" opacity={0.5} transparent />
      </mesh>
    </group>
  );
} 