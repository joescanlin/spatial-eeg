import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { GridData } from '../../types/grid';

interface MovementTrackerProps {
  data: GridData;
}

// Constants for visualization
const MAX_TRAIL_POINTS = 30;
const TRAIL_WIDTH = 0.15;

export default function MovementTracker({ data }: MovementTrackerProps) {
  // Refs for trail points
  const trailPoints = useRef<THREE.Vector3[]>([]);
  const lastUpdateTime = useRef<number>(0);
  const lastPosition = useRef<THREE.Vector3 | null>(null);
  
  // Calculate center of pressure from grid data
  const calculateCenterOfPressure = (frame: number[][]) => {
    let totalPressure = 0;
    let weightedX = 0;
    let weightedZ = 0;
    
    for (let row = 0; row < frame.length; row++) {
      for (let col = 0; col < frame[row].length; col++) {
        const value = frame[row][col];
        if (value > 0) {
          const worldX = col - frame[0].length/2 + 0.5;
          const worldZ = row - frame.length/2 + 0.5;
          totalPressure += value;
          weightedX += worldX * value;
          weightedZ += worldZ * value;
        }
      }
    }
    
    if (totalPressure === 0) return null;
    
    const centerX = weightedX / totalPressure;
    const centerZ = weightedZ / totalPressure;
    
    return new THREE.Vector3(centerX, 0.1, centerZ); // Just above the grid
  };
  
  // Update trail on each frame
  useFrame((state) => {
    const currentTime = state.clock.getElapsedTime();
    
    // Limit update rate to reduce processing
    if (currentTime - lastUpdateTime.current < 0.1) return;
    lastUpdateTime.current = currentTime;
    
    // Calculate current center of pressure
    const centerOfPressure = calculateCenterOfPressure(data.frame);
    
    // Update trail if we have a valid position
    if (centerOfPressure) {
      // Only add to trail if position has changed significantly
      if (lastPosition.current && 
          centerOfPressure.distanceTo(lastPosition.current) > 0.2) {
        
        trailPoints.current.push(centerOfPressure.clone());
        
        // Limit trail length
        if (trailPoints.current.length > MAX_TRAIL_POINTS) {
          trailPoints.current.shift();
        }
      }
      
      // Save current position for next frame
      lastPosition.current = centerOfPressure.clone();
    }
  });
  
  return (
    <group>
      {/* Movement trail */}
      {trailPoints.current.length > 1 && (
        <Line
          points={trailPoints.current}
          color="#f59e0b"
          lineWidth={TRAIL_WIDTH}
          transparent
          opacity={0.6}
        />
      )}
    </group>
  );
} 