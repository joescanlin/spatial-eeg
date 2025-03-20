import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Html as DreiHtml } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { RootState } from '@react-three/fiber';
import { BodyPart, FallEventFrame } from '../../../services/FallEventCapture';

interface HumanModelProps {
  bodyParts: BodyPart[];
  fallDirection: string;
  highlightImpact?: boolean;
  scale?: number;
  // Add animation props
  position?: [number, number, number];
  rotation?: [number, number, number];
  isWalking?: boolean;
  isFalling?: boolean;
  frameIndex?: number;
  totalFrames?: number;
  // Add new props for enhanced animations
  currentFrame?: FallEventFrame | null;
  previousFrames?: FallEventFrame[];
  showCenterOfGravity?: boolean;
  showGhostTrail?: boolean;
}

// Scale constants - each grid cell is approximately 4 inches (0.33 feet)
const SENSOR_SIZE_INCHES = 4;
const INCHES_TO_UNITS = 0.04; // Scale factor to convert inches to 3D units
const DEFAULT_SCALE = 0.5; // Adjusted scale factor to better match 4" grid cells

// Human average height in inches for reference (~5'9")
const HUMAN_HEIGHT_INCHES = 69;
// Grid dimensions
const GRID_WIDTH_INCHES = 12 * SENSOR_SIZE_INCHES; // 48 inches = 4 feet
const GRID_HEIGHT_INCHES = 15 * SENSOR_SIZE_INCHES; // 60 inches = 5 feet

const BODY_COLORS = {
  head: '#f5f5f5',
  torso: '#3b82f6',
  arm: '#60a5fa',
  leg: '#3b82f6',
  default: '#93c5fd'
};

// Walking animation constants
const STEP_HEIGHT = 0.15;
const STEP_FREQUENCY = 2.5;
const ARM_SWING = 0.4;

// Trail constants
const TRAIL_POINTS = 10;
const TRAIL_OPACITY_STEP = 0.1;

export default function HumanModel({ 
  bodyParts,
  fallDirection,
  highlightImpact = false,
  scale = DEFAULT_SCALE,
  // Default animation props
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isWalking = false,
  isFalling = false,
  frameIndex = 0,
  totalFrames = 30,
  // New props with defaults
  currentFrame = null,
  previousFrames = [],
  showCenterOfGravity = false,
  showGhostTrail = false
}: HumanModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const walkCycleRef = useRef(0);
  const [footPositions, setFootPositions] = useState<{left: THREE.Vector3, right: THREE.Vector3}>({
    left: new THREE.Vector3(0, 0, 0),
    right: new THREE.Vector3(0, 0, 0)
  });
  const [stepPhase, setStepPhase] = useState<'left' | 'right'>('right');
  const [centerOfPressure, setCenterOfPressure] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [trailPositions, setTrailPositions] = useState<THREE.Vector3[]>([]);
  
  // Get color for a specific body part
  const getBodyPartColor = (name: string): string => {
    const baseName = name.replace(/left |right /, '');
    
    if (baseName.includes('head') || baseName.includes('face')) {
      return BODY_COLORS.head;
    } else if (baseName.includes('torso') || baseName.includes('chest') || baseName.includes('back')) {
      return BODY_COLORS.torso;
    } else if (baseName.includes('arm') || baseName.includes('hand') || baseName.includes('shoulder')) {
      return BODY_COLORS.arm;
    } else if (baseName.includes('leg') || baseName.includes('knee') || baseName.includes('foot')) {
      return BODY_COLORS.leg;
    } else {
      return BODY_COLORS.default;
    }
  };

  // Calculate fall progress (0 = start, 1 = completely fallen)
  const fallProgress = useMemo(() => {
    if (!isFalling) return 0;
    // Map frame index to fall progress (0-1)
    return Math.min(1, frameIndex / (totalFrames * 0.6));
  }, [isFalling, frameIndex, totalFrames]);

  // Calculate foot positions from pressure data
  useEffect(() => {
    if (!currentFrame?.frame || !Array.isArray(currentFrame.frame)) return;
    
    try {
      const frame = currentFrame.frame;
      const height = frame.length;
      const width = frame[0].length;
      
      // Find left and right foot based on pressure distribution
      let leftFootX = 0, leftFootZ = 0, leftFootWeight = 0;
      let rightFootX = 0, rightFootZ = 0, rightFootWeight = 0;
      let totalPressure = 0;
      let centerX = 0, centerZ = 0;
      
      // Scan the left side (columns 0 to width/2)
      for (let z = 0; z < height; z++) {
        for (let x = 0; x < Math.floor(width/2); x++) {
          const pressure = frame[z][x];
          if (pressure > 0) {
            leftFootX += x * pressure;
            leftFootZ += z * pressure;
            leftFootWeight += pressure;
            
            centerX += x * pressure;
            centerZ += z * pressure;
            totalPressure += pressure;
          }
        }
      }
      
      // Scan the right side (columns width/2 to width)
      for (let z = 0; z < height; z++) {
        for (let x = Math.floor(width/2); x < width; x++) {
          const pressure = frame[z][x];
          if (pressure > 0) {
            rightFootX += x * pressure;
            rightFootZ += z * pressure;
            rightFootWeight += pressure;
            
            centerX += x * pressure;
            centerZ += z * pressure;
            totalPressure += pressure;
          }
        }
      }
      
      // Calculate average positions
      if (leftFootWeight > 0) {
        leftFootX /= leftFootWeight;
        leftFootZ /= leftFootWeight;
      }
      
      if (rightFootWeight > 0) {
        rightFootX /= rightFootWeight;
        rightFootZ /= rightFootWeight;
      }
      
      // Calculate center of pressure
      if (totalPressure > 0) {
        centerX /= totalPressure;
        centerZ /= totalPressure;
        setCenterOfPressure(new THREE.Vector3(
          centerX * SENSOR_SIZE_INCHES * INCHES_TO_UNITS - (GRID_WIDTH_INCHES/2) * INCHES_TO_UNITS,
          0,
          centerZ * SENSOR_SIZE_INCHES * INCHES_TO_UNITS - (GRID_HEIGHT_INCHES/2) * INCHES_TO_UNITS
        ));
      }
      
      // Convert to 3D coordinates
      const leftPos = new THREE.Vector3(
        leftFootX * SENSOR_SIZE_INCHES * INCHES_TO_UNITS - (GRID_WIDTH_INCHES/2) * INCHES_TO_UNITS,
        0,
        leftFootZ * SENSOR_SIZE_INCHES * INCHES_TO_UNITS - (GRID_HEIGHT_INCHES/2) * INCHES_TO_UNITS
      );
      
      const rightPos = new THREE.Vector3(
        rightFootX * SENSOR_SIZE_INCHES * INCHES_TO_UNITS - (GRID_WIDTH_INCHES/2) * INCHES_TO_UNITS,
        0,
        rightFootZ * SENSOR_SIZE_INCHES * INCHES_TO_UNITS - (GRID_HEIGHT_INCHES/2) * INCHES_TO_UNITS
      );
      
      // Only update if we have valid data (some pressure detected)
      if (leftFootWeight > 0 || rightFootWeight > 0) {
        setFootPositions({
          left: leftPos,
          right: rightPos
        });
        
        // Determine which foot is moving (less pressure)
        if (leftFootWeight < rightFootWeight && leftFootWeight > 0) {
          setStepPhase('left');
        } else if (rightFootWeight < leftFootWeight && rightFootWeight > 0) {
          setStepPhase('right');
        }
        
        // Update trail positions if needed
        if (showGhostTrail && groupRef.current) {
          updateTrailPositions();
        }
      }
    } catch (error) {
      console.error("Error calculating foot positions:", error);
    }
  }, [currentFrame, showGhostTrail]);
  
  // Update trail positions
  const updateTrailPositions = () => {
    if (!groupRef.current) return;
    
    const currentPosition = new THREE.Vector3().copy(groupRef.current.position);
    
    // Add current position to trail
    setTrailPositions(prev => {
      const newPositions = [currentPosition, ...prev.slice(0, TRAIL_POINTS - 1)];
      return newPositions;
    });
  };

  // Generate model rotation based on fall direction and progress
  const getModelRotation = () => {
    const [rotX, rotY, rotZ] = rotation;
    
    if (isFalling) {
      switch (fallDirection) {
        case 'forward':
          return new THREE.Euler(
            rotX + Math.PI/2 * fallProgress, 
            rotY, 
            rotZ
          );
        case 'backward':
          return new THREE.Euler(
            rotX - Math.PI/2 * fallProgress, 
            rotY, 
            rotZ
          );
        case 'left':
          return new THREE.Euler(
            rotX, 
            rotY, 
            rotZ - Math.PI/2 * fallProgress
          );
        case 'right':
          return new THREE.Euler(
            rotX, 
            rotY, 
            rotZ + Math.PI/2 * fallProgress
          );
        default:
          return new THREE.Euler(rotX, rotY, rotZ);
      }
    }
    
    return new THREE.Euler(rotX, rotY, rotZ);
  };

  // Animation frame update
  useFrame((state: RootState) => {
    if (!groupRef.current) return;
    
    // Update position
    if (position) {
      groupRef.current.position.set(position[0], position[1], position[2]);
    }
    
    // Handle real walking animation based on pressure data
    if (isWalking && !isFalling && currentFrame) {
      // Use actual data-driven animation if we have valid foot positions
      const leftLeg = groupRef.current.getObjectByName('leftLeg');
      const rightLeg = groupRef.current.getObjectByName('rightLeg');
      const leftArm = groupRef.current.getObjectByName('leftArm');
      const rightArm = groupRef.current.getObjectByName('rightArm');
      
      if (leftLeg && rightLeg && leftArm && rightArm) {
        if (stepPhase === 'left') {
          // Left foot is moving
          leftLeg.rotation.x = Math.sin(state.clock.elapsedTime * STEP_FREQUENCY) * 0.4;
          rightLeg.rotation.x = -Math.sin(state.clock.elapsedTime * STEP_FREQUENCY) * 0.2;
          // Arms move opposite to legs for natural walking
          leftArm.rotation.x = -Math.sin(state.clock.elapsedTime * STEP_FREQUENCY) * ARM_SWING;
          rightArm.rotation.x = Math.sin(state.clock.elapsedTime * STEP_FREQUENCY) * ARM_SWING * 0.5;
        } else {
          // Right foot is moving
          rightLeg.rotation.x = Math.sin(state.clock.elapsedTime * STEP_FREQUENCY) * 0.4;
          leftLeg.rotation.x = -Math.sin(state.clock.elapsedTime * STEP_FREQUENCY) * 0.2;
          // Arms move opposite to legs
          rightArm.rotation.x = -Math.sin(state.clock.elapsedTime * STEP_FREQUENCY) * ARM_SWING;
          leftArm.rotation.x = Math.sin(state.clock.elapsedTime * STEP_FREQUENCY) * ARM_SWING * 0.5;
        }
      }
    } else if (isWalking && !isFalling) {
      // Fallback to default walking animation if no pressure data
      walkCycleRef.current += state.clock.elapsedTime * STEP_FREQUENCY;
      
      const rightLeg = groupRef.current.getObjectByName('rightLeg');
      const leftLeg = groupRef.current.getObjectByName('leftLeg');
      const rightArm = groupRef.current.getObjectByName('rightArm');
      const leftArm = groupRef.current.getObjectByName('leftArm');
      
      if (rightLeg && leftLeg) {
        rightLeg.rotation.x = Math.sin(walkCycleRef.current) * 0.4;
        leftLeg.rotation.x = -Math.sin(walkCycleRef.current) * 0.4;
      }
      
      if (rightArm && leftArm) {
        rightArm.rotation.x = -Math.sin(walkCycleRef.current) * ARM_SWING;
        leftArm.rotation.x = Math.sin(walkCycleRef.current) * ARM_SWING;
      }
    }
    
    // Apply fall rotation
    if (isFalling) {
      const targetRotation = getModelRotation();
      groupRef.current.rotation.copy(targetRotation);
      
      // If falling, adjust limbs based on direction
      adjustLimbsForFall(groupRef.current, fallDirection, fallProgress);
    }
  });
  
  // Adjust limbs based on fall direction and progress
  const adjustLimbsForFall = (
    group: THREE.Group, 
    direction: string, 
    progress: number
  ) => {
    const rightArm = group.getObjectByName('rightArm');
    const leftArm = group.getObjectByName('leftArm');
    const rightLeg = group.getObjectByName('rightLeg');
    const leftLeg = group.getObjectByName('leftLeg');
    
    if (!rightArm || !leftArm || !rightLeg || !leftLeg) return;
    
    switch (direction) {
      case 'forward':
        // Arms extend forward during fall
        rightArm.rotation.x = -Math.PI/3 * progress;
        leftArm.rotation.x = -Math.PI/3 * progress;
        // Legs bend slightly
        rightLeg.rotation.x = Math.PI/6 * progress;
        leftLeg.rotation.x = Math.PI/6 * progress;
        break;
        
      case 'backward':
        // Arms go up and back
        rightArm.rotation.x = Math.PI/2 * progress;
        leftArm.rotation.x = Math.PI/2 * progress;
        // Legs bend forward
        rightLeg.rotation.x = -Math.PI/4 * progress;
        leftLeg.rotation.x = -Math.PI/4 * progress;
        break;
        
      case 'left':
        // Arms go out to the side
        rightArm.rotation.z = -Math.PI/4 * progress;
        leftArm.rotation.z = -Math.PI/2 * progress;
        // Legs bend slightly
        rightLeg.rotation.z = -Math.PI/6 * progress;
        leftLeg.rotation.z = -Math.PI/3 * progress;
        break;
        
      case 'right':
        // Arms go out to the side
        rightArm.rotation.z = Math.PI/2 * progress;
        leftArm.rotation.z = Math.PI/4 * progress;
        // Legs bend slightly
        rightLeg.rotation.z = Math.PI/3 * progress;
        leftLeg.rotation.z = Math.PI/6 * progress;
        break;
    }
  };

  // Create articulated human model
  const humanModel = useMemo(() => {
    return (
      <group scale={[scale, scale, scale]}>
        {/* Head */}
        <mesh position={[0, 1.65, 0]} name="head">
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshPhongMaterial color={BODY_COLORS.head} shininess={30} />
        </mesh>
        
        {/* Neck */}
        <mesh position={[0, 1.55, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
          <meshPhongMaterial color={BODY_COLORS.torso} shininess={30} />
        </mesh>
        
        {/* Torso */}
        <mesh position={[0, 1.2, 0]} name="torso">
          <capsuleGeometry args={[0.2, 0.6, 8, 16]} />
          <meshPhongMaterial color={BODY_COLORS.torso} shininess={30} />
        </mesh>
        
        {/* Right Arm Group */}
        <group position={[0.22, 1.45, 0]} name="rightArm">
          {/* Upper Arm */}
          <mesh position={[0.1, -0.15, 0]} rotation={[0, 0, Math.PI/8]}>
            <capsuleGeometry args={[0.06, 0.3, 8, 8]} />
            <meshPhongMaterial color={BODY_COLORS.arm} shininess={30} />
          </mesh>
          
          {/* Elbow */}
          <mesh position={[0.2, -0.3, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshPhongMaterial color={BODY_COLORS.arm} shininess={30} />
          </mesh>
          
          {/* Forearm */}
          <mesh position={[0.3, -0.4, 0]} rotation={[0, 0, Math.PI/8]}>
            <capsuleGeometry args={[0.05, 0.25, 8, 8]} />
            <meshPhongMaterial color={BODY_COLORS.arm} shininess={30} />
          </mesh>
          
          {/* Hand */}
          <mesh position={[0.4, -0.5, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshPhongMaterial color={BODY_COLORS.arm} shininess={30} />
          </mesh>
        </group>
        
        {/* Left Arm Group */}
        <group position={[-0.22, 1.45, 0]} name="leftArm">
          {/* Upper Arm */}
          <mesh position={[-0.1, -0.15, 0]} rotation={[0, 0, -Math.PI/8]}>
            <capsuleGeometry args={[0.06, 0.3, 8, 8]} />
            <meshPhongMaterial color={BODY_COLORS.arm} shininess={30} />
          </mesh>
          
          {/* Elbow */}
          <mesh position={[-0.2, -0.3, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshPhongMaterial color={BODY_COLORS.arm} shininess={30} />
          </mesh>
          
          {/* Forearm */}
          <mesh position={[-0.3, -0.4, 0]} rotation={[0, 0, -Math.PI/8]}>
            <capsuleGeometry args={[0.05, 0.25, 8, 8]} />
            <meshPhongMaterial color={BODY_COLORS.arm} shininess={30} />
          </mesh>
          
          {/* Hand */}
          <mesh position={[-0.4, -0.5, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshPhongMaterial color={BODY_COLORS.arm} shininess={30} />
          </mesh>
        </group>
        
        {/* Hip */}
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[0.3, 0.1, 0.2]} />
          <meshPhongMaterial color={BODY_COLORS.torso} shininess={30} />
        </mesh>
        
        {/* Right Leg Group */}
        <group position={[0.1, 0.8, 0]} name="rightLeg">
          {/* Upper Leg */}
          <mesh position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.07, 0.4, 8, 8]} />
            <meshPhongMaterial color={BODY_COLORS.leg} shininess={30} />
          </mesh>
          
          {/* Knee */}
          <mesh position={[0, -0.45, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshPhongMaterial color={BODY_COLORS.leg} shininess={30} />
          </mesh>
          
          {/* Lower Leg */}
          <mesh position={[0, -0.7, 0]}>
            <capsuleGeometry args={[0.065, 0.4, 8, 8]} />
            <meshPhongMaterial color={BODY_COLORS.leg} shininess={30} />
          </mesh>
          
          {/* Foot */}
          <mesh position={[0, -0.95, 0.05]} rotation={[Math.PI/16, 0, 0]} name="rightFoot">
            <boxGeometry args={[0.1, 0.05, 0.2]} />
            <meshPhongMaterial color={BODY_COLORS.leg} shininess={30} />
          </mesh>
        </group>
        
        {/* Left Leg Group */}
        <group position={[-0.1, 0.8, 0]} name="leftLeg">
          {/* Upper Leg */}
          <mesh position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.07, 0.4, 8, 8]} />
            <meshPhongMaterial color={BODY_COLORS.leg} shininess={30} />
          </mesh>
          
          {/* Knee */}
          <mesh position={[0, -0.45, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshPhongMaterial color={BODY_COLORS.leg} shininess={30} />
          </mesh>
          
          {/* Lower Leg */}
          <mesh position={[0, -0.7, 0]}>
            <capsuleGeometry args={[0.065, 0.4, 8, 8]} />
            <meshPhongMaterial color={BODY_COLORS.leg} shininess={30} />
          </mesh>
          
          {/* Foot */}
          <mesh position={[0, -0.95, 0.05]} rotation={[Math.PI/16, 0, 0]} name="leftFoot">
            <boxGeometry args={[0.1, 0.05, 0.2]} />
            <meshPhongMaterial color={BODY_COLORS.leg} shininess={30} />
          </mesh>
        </group>
      </group>
    );
  }, [scale]);

  // Render ghost trail
  const ghostTrail = useMemo(() => {
    if (!showGhostTrail || trailPositions.length === 0) return null;
    
    return trailPositions.map((pos, index) => (
      <group key={`ghost-${index}`} position={pos.toArray()} scale={[scale * (1 - index * 0.05), scale * (1 - index * 0.05), scale * (1 - index * 0.05)]}>
        <mesh>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial 
            color={BODY_COLORS.head} 
            transparent={true} 
            opacity={Math.max(0.05, 0.6 - index * TRAIL_OPACITY_STEP)} 
          />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <capsuleGeometry args={[0.2, 0.6, 8, 8]} />
          <meshBasicMaterial 
            color={BODY_COLORS.torso} 
            transparent={true} 
            opacity={Math.max(0.05, 0.5 - index * TRAIL_OPACITY_STEP)} 
          />
        </mesh>
      </group>
    ));
  }, [trailPositions, scale, showGhostTrail]);

  // Center of gravity visualization
  const centerOfGravityMarker = useMemo(() => {
    if (!showCenterOfGravity) return null;
    
    return (
      <group position={centerOfPressure.toArray()}>
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[0.1, 0.12, 16]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.7} />
        </mesh>
      </group>
    );
  }, [centerOfPressure, showCenterOfGravity]);

  // Highlight impact points
  const impactPoints = useMemo(() => {
    if (!highlightImpact || !bodyParts.length) return null;
    
    return bodyParts
      .filter(part => part.impact !== undefined && part.impact > 0.3)
      .map((part, index) => (
        <group key={`impact-${index}`} position={part.position}>
          <mesh>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="#ff0000" transparent opacity={0.7} />
          </mesh>
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.1, 0.15, 16]} />
            <meshBasicMaterial color="#ff0000" transparent opacity={0.5} />
          </mesh>
          <DreiHtml position={[0, 0.2, 0]} center style={{ pointerEvents: 'none' }}>
            <div className="bg-red-500 text-white px-1 py-0.5 text-xs rounded whitespace-nowrap">
              {part.name} ({(part.impact! * 100).toFixed(0)}%)
            </div>
          </DreiHtml>
        </group>
      ));
  }, [bodyParts, highlightImpact]);

  // Final render
  return (
    <group ref={groupRef}>
      {/* Main human model */}
      {humanModel}
      
      {/* Impact points */}
      {impactPoints}
      
      {/* Ghost trail for motion tracking */}
      {ghostTrail}
      
      {/* Center of gravity marker */}
      {centerOfGravityMarker}
    </group>
  );
} 