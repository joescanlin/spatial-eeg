import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, a } from '@react-spring/three';
import * as THREE from 'three';

interface FallEffectsProps {
  fallDetected: boolean;
  fallProbability: number;
}

export default function FallEffects({ fallDetected, fallProbability }: FallEffectsProps) {
  // Refs for effect objects
  const rippleRef = useRef<THREE.Mesh>(null);
  const alertRef = useRef<THREE.Group>(null);

  // State to track when fall started for animations
  const [fallStartTime, setFallStartTime] = useState<number | null>(null);
  
  // Effect for when fall is detected
  useEffect(() => {
    if (fallDetected && fallStartTime === null) {
      setFallStartTime(Date.now());
    } else if (!fallDetected && fallStartTime !== null) {
      setFallStartTime(null);
    }
  }, [fallDetected]);
  
  // Spring animation for alert effects
  const alertSpring = useSpring({
    scale: fallDetected ? 1 : 0,
    opacity: fallDetected ? 0.8 : 0,
    config: {
      tension: 120,
      friction: 14
    }
  });
  
  // Spring animation for ripple effect
  const rippleSpring = useSpring({
    scale: fallDetected ? 12 : 0,
    opacity: fallDetected ? 0 : 0.7, // Fade out as it expands
    config: {
      tension: 50,
      friction: 10
    }
  });
  
  // Animation loop for continuous effects
  useFrame((state) => {
    if (!fallDetected) return;
    
    const time = state.clock.getElapsedTime();
    
    // Animate ripple effect
    if (rippleRef.current) {
      // Make ripple pulsate
      rippleRef.current.scale.setScalar(
        6 + Math.sin(time * 3) * 1.5
      );
      
      // Fade ripple in and out
      if (rippleRef.current.material instanceof THREE.Material) {
        rippleRef.current.material.opacity = 0.3 + Math.sin(time * 2) * 0.2;
      }
    }
    
    // Animate alert indicator
    if (alertRef.current) {
      alertRef.current.rotation.y = time * 0.5;
      alertRef.current.position.y = 4 + Math.sin(time * 2) * 0.2;
    }
  });
  
  // Only render effects when needed
  if (!fallDetected && fallProbability < 0.3) return null;
  
  return (
    <group>
      {/* Fall ripple effect */}
      <a.mesh
        ref={rippleRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]} // Slightly above the ground
        renderOrder={10}
      >
        <ringGeometry args={[2, 2.5, 36]} />
        <a.meshBasicMaterial 
          color="#ef4444"
          transparent
          opacity={rippleSpring.opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </a.mesh>
      
      {/* Alert indicator */}
      <a.group 
        ref={alertRef}
        scale={alertSpring.scale}
        position={[0, 4, 0]}
      >
        <mesh>
          <octahedronGeometry args={[0.5, 0]} />
          <a.meshPhongMaterial 
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={0.8}
            transparent
            opacity={alertSpring.opacity}
          />
        </mesh>
        
        {/* Alert text */}
        <group position={[0, 1, 0]}>
          {/* This would be a TextGeometry in a production setup */}
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[2, 0.4, 0.1]} />
            <a.meshPhongMaterial 
              color="#ffffff"
              transparent
              opacity={alertSpring.opacity}
            />
          </mesh>
        </group>
      </a.group>
      
      {/* Pre-fall warning (when probability is rising) */}
      {!fallDetected && fallProbability > 0.3 && (
        <group position={[0, 0.1, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
            <planeGeometry args={[12, 15]} />
            <meshBasicMaterial 
              color="#f97316"
              transparent
              opacity={fallProbability * 0.3}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
      
      {/* Full fall alert overlay */}
      {fallDetected && (
        <group position={[0, 0.1, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
            <planeGeometry args={[15, 18]} />
            <meshBasicMaterial 
              color="#ef4444"
              transparent
              opacity={0.2 + Math.sin(Date.now() * 0.005) * 0.1} // Pulsating effect
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
} 