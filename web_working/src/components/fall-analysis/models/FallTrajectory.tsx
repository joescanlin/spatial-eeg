import React, { useMemo } from 'react';
import { Line, Sphere } from '@react-three/drei';
import { FallTrajectory as FallTrajectoryType } from '../../../services/FallEventCapture';
import * as THREE from 'three';

interface FallTrajectoryProps {
  trajectory: FallTrajectoryType;
  showImpactPoints?: boolean;
}

// Scale constants for proper sizing
const SENSOR_SIZE_INCHES = 4;
const INCHES_TO_UNITS = 0.04; 
const SCALE_FACTOR = SENSOR_SIZE_INCHES * INCHES_TO_UNITS; // 0.16 units per grid cell

export default function FallTrajectory({ trajectory, showImpactPoints = true }: FallTrajectoryProps) {
  // Create a curve for the fall path
  const pathPoints = useMemo(() => {
    // Generate additional points between start and end for a smoother curve
    const points: THREE.Vector3[] = [];
    const startPoint = new THREE.Vector3(
      trajectory.startPoint[0] * SCALE_FACTOR,
      trajectory.startPoint[1] * SCALE_FACTOR,
      trajectory.startPoint[2] * SCALE_FACTOR
    );
    const endPoint = new THREE.Vector3(
      trajectory.endPoint[0] * SCALE_FACTOR,
      trajectory.endPoint[1] * SCALE_FACTOR,
      trajectory.endPoint[2] * SCALE_FACTOR
    );
    
    // Add the start point
    points.push(startPoint);
    
    // Calculate the midpoint with a higher y value to simulate the arc of falling
    const midX = (startPoint.x + endPoint.x) / 2;
    const midZ = (startPoint.z + endPoint.z) / 2;
    
    // Add points along the trajectory
    const numPoints = 10;
    for (let i = 1; i < numPoints; i++) {
      const t = i / numPoints;
      const x = startPoint.x + (endPoint.x - startPoint.x) * t;
      const z = startPoint.z + (endPoint.z - startPoint.z) * t;
      
      // Create an arc in the y direction for a realistic fall
      // Start rising slightly, then drop rapidly
      let y = 0;
      if (t < 0.3) {
        // Rise phase
        y = startPoint.y + (1.0 * t); // small rise
      } else {
        // Fall phase - quadratic drop
        const fallT = (t - 0.3) / 0.7; // normalize remaining time
        y = startPoint.y + 0.3 - (1.5 * fallT * fallT); // quadratic fall
      }
      
      points.push(new THREE.Vector3(x, Math.max(0.05, y), z));
    }
    
    // Add the end point
    points.push(endPoint);
    
    return points;
  }, [trajectory]);
  
  // Create impact point visualizations
  const impactPoints = useMemo(() => {
    if (!showImpactPoints) return null;
    
    return trajectory.impactPoints.map((point, index) => {
      // Scale the impact point coordinates 
      const scaledPoint = [
        point[0] * SCALE_FACTOR,
        point[1] * SCALE_FACTOR,
        point[2] * SCALE_FACTOR
      ] as [number, number, number];
      
      return (
        <group key={`impact-${index}`} position={scaledPoint}>
          {/* Impact marker */}
          <Sphere args={[0.15, 8, 8]}>
            <meshPhongMaterial color="#ef4444" opacity={0.7} transparent />
          </Sphere>
          
          {/* Impact ripple effect */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.2, 0.3, 16]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
          </mesh>
          
          {/* Secondary ripple */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.4, 0.5, 16]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.3} />
          </mesh>
        </group>
      );
    });
  }, [trajectory.impactPoints, showImpactPoints]);
  
  // Direction arrow at the start of the fall
  const directionArrow = useMemo(() => {
    const startPoint = new THREE.Vector3(
      trajectory.startPoint[0] * SCALE_FACTOR,
      trajectory.startPoint[1] * SCALE_FACTOR,
      trajectory.startPoint[2] * SCALE_FACTOR
    );
    const direction = trajectory.direction;
    
    // Calculate the arrow direction
    let arrowVector: THREE.Vector3;
    switch (direction) {
      case 'forward':
        arrowVector = new THREE.Vector3(0, 0, -1);
        break;
      case 'backward':
        arrowVector = new THREE.Vector3(0, 0, 1);
        break;
      case 'left':
        arrowVector = new THREE.Vector3(-1, 0, 0);
        break;
      case 'right':
        arrowVector = new THREE.Vector3(1, 0, 0);
        break;
      default:
        arrowVector = new THREE.Vector3(0, 0, 0);
    }
    
    // Create arrow points
    const arrowStart = startPoint.clone().add(new THREE.Vector3(0, 0.5, 0));
    const arrowEnd = arrowStart.clone().add(arrowVector.multiplyScalar(0.8));
    
    return (
      <group>
        {/* Arrow shaft */}
        <Line
          points={[arrowStart, arrowEnd]}
          color="#f59e0b"
          lineWidth={4}
        />
        
        {/* Arrow head */}
        <mesh position={arrowEnd.toArray()} rotation={[0, direction === 'right' ? 0 : Math.PI, 0]}>
          <coneGeometry args={[0.1, 0.3, 8]} />
          <meshPhongMaterial color="#f59e0b" />
        </mesh>
        
        {/* Label for direction */}
        <mesh position={[arrowStart.x, arrowStart.y + 0.3, arrowStart.z]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      </group>
    );
  }, [trajectory.startPoint, trajectory.direction]);
  
  return (
    <group>
      {/* Trajectory path */}
      <Line
        points={pathPoints}
        color="#3b82f6"
        lineWidth={3}
        dashed={true}
        dashSize={0.1}
        dashScale={1}
        opacity={0.8}
        transparent
      />
      
      {/* Direction indicator */}
      {directionArrow}
      
      {/* Impact points */}
      {impactPoints}
      
      {/* Velocity indicator */}
      {trajectory.velocity > 0 && (
        <group position={[
          trajectory.startPoint[0] * SCALE_FACTOR, 
          trajectory.startPoint[1] * SCALE_FACTOR + 1, 
          trajectory.startPoint[2] * SCALE_FACTOR
        ]}>
          <Sphere args={[0.1, 8, 8]}>
            <meshBasicMaterial color="#f59e0b" />
          </Sphere>
          <Line
            points={[
              [0, 0, 0],
              [0, 0, -trajectory.velocity / 3],
            ]}
            color="#f59e0b"
            lineWidth={2}
          />
        </group>
      )}
    </group>
  );
} 