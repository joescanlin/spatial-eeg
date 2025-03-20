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
  animateModel?: boolean;
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
  showGhostTrail = false,
  animateModel = true
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

  // Get animation state based on frame index
  useEffect(() => {
    // Only update animation state if we have current frame data
    if (currentFrame) {
      // For walking, ensure smooth transitions
      if (isWalking) {
        walkCycleRef.current += 0.05; // Increment walk cycle continuously
      } else {
        // Reset walk cycle when not walking
        walkCycleRef.current = 0;
      }
      
      // Map footstep pattern based on frame data
      if (currentFrame.frame && Array.isArray(currentFrame.frame)) {
        try {
          // Use pressure data to adjust foot positions if available
          calculateFootPositionsFromPressure(currentFrame.frame);
        } catch (error) {
          console.error("Error calculating foot positions:", error);
        }
      }
    }
  }, [currentFrame, isWalking, isFalling]);
  
  // Calculate foot positions from pressure data
  const calculateFootPositionsFromPressure = (frame: number[][]) => {
    if (!frame || !Array.isArray(frame) || frame.length === 0) return;
    
    try {
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
          if (x >= frame[z].length) continue; // Skip if out of bounds
          
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
          if (x >= frame[z].length) continue; // Skip if out of bounds
          
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
  };
  
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

  // Animation frame
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Apply position directly to ensure it matches parent component state
    groupRef.current.position.set(position[0], position[1], position[2]);
    
    // Calculate walk cycle progress only if needed
    if (isWalking) {
      // For consistent scrubbing, use frameIndex to determine walk cycle phase
      // This ensures walk cycle is tied to frame position rather than just elapsed time
      walkCycleRef.current = frameIndex * 0.2; // Scale factor for appropriate cycle speed
    }
    
    // Get limb references - use both formats to ensure compatibility
    const leftLeg = groupRef.current.getObjectByName('left-leg') || 
                    groupRef.current.getObjectByName('leftLeg');
    const rightLeg = groupRef.current.getObjectByName('right-leg') || 
                     groupRef.current.getObjectByName('rightLeg');
    const leftArm = groupRef.current.getObjectByName('left-arm') || 
                    groupRef.current.getObjectByName('leftArm');
    const rightArm = groupRef.current.getObjectByName('right-arm') || 
                     groupRef.current.getObjectByName('rightArm');
    
    // Apply animations based on frame position rather than continuous time
    // This makes scrubbing work correctly
    if (animateModel) {
      if (isWalking) {
        // Walking animations
        const walkPhase = walkCycleRef.current;
        
        // Apply inverse walk cycle to legs (when one is forward, the other is back)
        if (leftLeg) {
          leftLeg.rotation.x = Math.sin(walkPhase) * 0.3;
        }
        if (rightLeg) {
          rightLeg.rotation.x = Math.sin(walkPhase + Math.PI) * 0.3;
        }
        
        // Arms swing opposite to legs
        if (leftArm) {
          leftArm.rotation.x = Math.sin(walkPhase + Math.PI) * 0.2;
        }
        if (rightArm) {
          rightArm.rotation.x = Math.sin(walkPhase) * 0.2;
        }
      } else if (isFalling) {
        // Fall animations - directly use fallProgress
        applyFallingAnimation();
      } else {
        // Apply neutral standing pose
        applyNeutralPose();
      }
    } else {
      // Reset to neutral if animations are disabled
      applyNeutralPose();
    }
  });
  
  // Apply falling animations based on frame index and fall direction
  const applyFallingAnimation = () => {
    if (!groupRef.current) return;
    
    // Calculate fall progress directly from frameIndex for consistent scrubbing
    const frameBasedProgress = Math.min(1, frameIndex / (totalFrames * 0.6));
    
    // Resolve fall direction, with backward as default
    const effectiveFallDirection = fallDirection === 'backward' ? 'backward' :
                                  fallDirection === 'forward' ? 'forward' :
                                  fallDirection === 'left' ? 'left' :
                                  fallDirection === 'right' ? 'right' : 'backward';
                                  
    // Get limb references
    const leftLeg = groupRef.current.getObjectByName('left-leg') || 
                    groupRef.current.getObjectByName('leftLeg');
    const rightLeg = groupRef.current.getObjectByName('right-leg') || 
                     groupRef.current.getObjectByName('rightLeg');
    const leftArm = groupRef.current.getObjectByName('left-arm') || 
                    groupRef.current.getObjectByName('leftArm');
    const rightArm = groupRef.current.getObjectByName('right-arm') || 
                     groupRef.current.getObjectByName('rightArm');
    
    // Apply fall rotation based on direction
    if (effectiveFallDirection === 'backward') {
      // Apply backward falling rotation to whole model
      groupRef.current.rotation.x = -Math.min(Math.PI / 2 * frameBasedProgress, Math.PI / 2);
      
      // Arms extend outward during backward fall
      if (leftArm) {
        leftArm.rotation.z = Math.min(frameBasedProgress * 0.7, 0.7);
      }
      if (rightArm) {
        rightArm.rotation.z = -Math.min(frameBasedProgress * 0.7, 0.7);
      }
    } else if (effectiveFallDirection === 'forward') {
      // Apply forward falling rotation to whole model
      groupRef.current.rotation.x = Math.min(Math.PI / 2 * frameBasedProgress, Math.PI / 2);
      
      // Arms extend forward during forward fall
      if (leftArm) {
        leftArm.rotation.z = Math.min(frameBasedProgress * 0.4, 0.4);
      }
      if (rightArm) {
        rightArm.rotation.z = -Math.min(frameBasedProgress * 0.4, 0.4);
      }
    } else if (effectiveFallDirection === 'right') {
      // Apply rightward falling rotation to whole model
      groupRef.current.rotation.z = Math.min(Math.PI / 2 * frameBasedProgress, Math.PI / 2);
    } else if (effectiveFallDirection === 'left') {
      // Apply leftward falling rotation to whole model
      groupRef.current.rotation.z = -Math.min(Math.PI / 2 * frameBasedProgress, Math.PI / 2);
    }
  };

  // Apply a neutral standing pose
  const applyNeutralPose = () => {
    if (!groupRef.current) return;
    
    // First reset custom rotations from falling
    groupRef.current.rotation.x = rotation[0];
    groupRef.current.rotation.y = rotation[1];
    groupRef.current.rotation.z = rotation[2];
    
    // Reset limbs to natural position if not walking
    if (!isWalking) {
      // Get limb references - check both naming formats
      const leftLeg = groupRef.current.getObjectByName('left-leg') || 
                      groupRef.current.getObjectByName('leftLeg');
      const rightLeg = groupRef.current.getObjectByName('right-leg') || 
                       groupRef.current.getObjectByName('rightLeg');
      const leftArm = groupRef.current.getObjectByName('left-arm') || 
                      groupRef.current.getObjectByName('leftArm');
      const rightArm = groupRef.current.getObjectByName('right-arm') || 
                       groupRef.current.getObjectByName('rightArm');
      
      // Gradually reset to neutral position
      if (leftLeg) leftLeg.rotation.x = 0;
      if (rightLeg) rightLeg.rotation.x = 0;
      if (leftArm) leftArm.rotation.x = 0;
      if (rightArm) rightArm.rotation.x = 0;
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