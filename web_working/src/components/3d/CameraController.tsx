import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { CameraShake } from '@react-three/drei';
import * as THREE from 'three';

interface CameraControllerProps {
  view: 'top-down' | 'isometric' | 'follow';
  fallDetected: boolean;
}

// Camera position constants
const TOP_DOWN_POSITION = new THREE.Vector3(0, 4, 0);
const TOP_DOWN_TARGET = new THREE.Vector3(0, 0, 0);

const ISOMETRIC_POSITION = new THREE.Vector3(1.5, 1.5, 1.5);
const ISOMETRIC_TARGET = new THREE.Vector3(0, 0, 0);

const FOLLOW_HEIGHT = 2.5;
const FOLLOW_DISTANCE = 2.5;

export default function CameraController({ view, fallDetected }: CameraControllerProps) {
  // Get the camera and scene from Three.js context
  const { camera, scene } = useThree();
  
  // Track the target position for smooth camera movement
  const targetPosition = useRef(new THREE.Vector3().copy(camera.position));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  
  // Calculate center of pressure for follow mode
  const calculateCenterOfPressure = () => {
    // Find any objects that might be related to the movement tracking
    const centerMarker = scene.getObjectByName('center-marker');
    if (centerMarker) {
      return centerMarker.position.clone();
    }
    
    // Find the center of the active sensors as a fallback
    let centerX = 0;
    let centerZ = 0;
    let count = 0;
    
    scene.traverse((object) => {
      // Look for mesh objects that have a position near the ground plane (sensor pillars)
      if (object.type === 'Mesh' && object.position.y < 1.5 && object.position.y > 0) {
        centerX += object.position.x;
        centerZ += object.position.z;
        count++;
      }
    });
    
    if (count > 0) {
      return new THREE.Vector3(centerX / count, 0.3, centerZ / count);
    }
    
    // Fallback to fixed position
    return new THREE.Vector3(0, 0, 0);
  };
  
  // Update camera view when view option changes
  useEffect(() => {
    switch (view) {
      case 'top-down':
        targetPosition.current = TOP_DOWN_POSITION.clone();
        targetLookAt.current = TOP_DOWN_TARGET.clone();
        break;
      case 'isometric':
        targetPosition.current = ISOMETRIC_POSITION.clone();
        targetLookAt.current = ISOMETRIC_TARGET.clone();
        break;
      case 'follow':
        // For follow mode, we'll update in the render loop
        const centerPosition = calculateCenterOfPressure();
        // Position camera behind and above the center of pressure
        targetPosition.current.set(
          centerPosition.x - FOLLOW_DISTANCE,
          FOLLOW_HEIGHT,
          centerPosition.z + FOLLOW_DISTANCE
        );
        targetLookAt.current.copy(centerPosition);
        break;
      default:
        break;
    }
  }, [view, scene]);
  
  // Update camera position and rotation on each frame
  useFrame((state, delta) => {
    // For follow mode, continuously update target position
    if (view === 'follow') {
      const centerPosition = calculateCenterOfPressure();
      // Position camera behind and above the center of pressure
      targetPosition.current.set(
        centerPosition.x - FOLLOW_DISTANCE,
        FOLLOW_HEIGHT,
        centerPosition.z + FOLLOW_DISTANCE
      );
      targetLookAt.current.copy(centerPosition);
    }
    
    // Use a very gentle lerp factor to allow manual controls to take precedence
    const lerpFactor = 0.5 * delta;
    
    // Only move position XZ, leave Y (zoom) under manual control
    const newPosition = new THREE.Vector3(
      camera.position.x + (targetPosition.current.x - camera.position.x) * lerpFactor,
      camera.position.y, // Keep Y position (zoom) as set by manual controls
      camera.position.z + (targetPosition.current.z - camera.position.z) * lerpFactor
    );
    camera.position.copy(newPosition);
    
    // Very gentle look-at adjustment
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    const targetDirection = targetLookAt.current.clone().sub(camera.position).normalize();
    
    const interpolatedDirection = new THREE.Vector3()
      .copy(currentLookAt)
      .lerp(targetDirection, lerpFactor * 0.5); // Even gentler for rotation
    
    const lookAtPosition = new THREE.Vector3()
      .copy(camera.position)
      .add(interpolatedDirection.multiplyScalar(10));
    
    camera.lookAt(lookAtPosition);
  });
  
  return (
    <>
      {/* Camera shake effect when fall is detected */}
      {fallDetected && (
        <CameraShake
          maxYaw={0.02} 
          maxPitch={0.02} 
          maxRoll={0.02} 
          yawFrequency={1.5}
          pitchFrequency={1.5}
          rollFrequency={1.5}
          intensity={0.5}
          decayRate={0.8}
        />
      )}
    </>
  );
} 