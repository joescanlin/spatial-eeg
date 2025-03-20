import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, a } from '@react-spring/three';
import * as THREE from 'three';

interface FallEffectsProps {
  fallDetected: boolean;
  fallProbability: number;
}

// Enhanced intensity of effects
const RIPPLE_MAX_SIZE = 15;
const RIPPLE_COUNT = 3;
const PARTICLES_COUNT = 30;

export default function FallEffects({ fallDetected, fallProbability }: FallEffectsProps) {
  // Refs for effect objects
  const alertRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Group>(null);
  const timeRef = useRef<number>(0);

  // State to track when fall started for animations
  const [fallStartTime, setFallStartTime] = useState<number | null>(null);
  const [showParticles, setShowParticles] = useState(false);
  
  // Effect for when fall is detected
  useEffect(() => {
    if (fallDetected && fallStartTime === null) {
      setFallStartTime(Date.now());
      setShowParticles(true);
      
      // Hide particles after animation completes
      const timer = setTimeout(() => {
        setShowParticles(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else if (!fallDetected && fallStartTime !== null) {
      setFallStartTime(null);
      setShowParticles(false);
    }
  }, [fallDetected, fallStartTime]);
  
  // Spring animation for alert effects
  const alertSpring = useSpring({
    scale: fallDetected ? 1 : 0,
    opacity: fallDetected ? 0.8 : 0,
    config: {
      tension: 120,
      friction: 14
    }
  });
  
  // Multiple ripple effects with different timing
  const ripples = useMemo(() => {
    return Array.from({ length: RIPPLE_COUNT }).map((_, i) => {
      const delay = i * 400; // Stagger start times
      return { 
        id: i,
        delay
      };
    });
  }, []);
  
  // Particle explosion effect for impact
  const particles = useMemo(() => {
    const particles = [];
    
    for (let i = 0; i < PARTICLES_COUNT; i++) {
      // Random position and velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 0.1 + Math.random() * 0.3;
      
      // Calculate random direction on a sphere
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      // Size and opacity variations
      const size = 0.05 + Math.random() * 0.1;
      const speed = 2 + Math.random() * 3;
      
      particles.push({
        id: i,
        position: [0, 0.1, 0] as [number, number, number],
        velocity: [x * speed, Math.abs(y) * speed * 1.5, z * speed] as [number, number, number],
        size,
        color: new THREE.Color(0xff4444)
      });
    }
    
    return particles;
  }, []);
  
  // Animation loop for continuous effects
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    timeRef.current = time;
    
    // Update impact particles
    if (showParticles && particlesRef.current) {
      const children = particlesRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const particle = children[i] as THREE.Mesh;
        // @ts-ignore - userData contains our velocity
        const velocity = particle.userData.velocity;
        
        // Apply gravity and update position
        velocity[1] -= 0.1; // Gravity
        particle.position.x += velocity[0] * 0.01;
        particle.position.y += velocity[1] * 0.01;
        particle.position.z += velocity[2] * 0.01;
        
        // Fade out particles over time
        if (particle.material instanceof THREE.Material) {
          particle.material.opacity = Math.max(0, 1 - (time - particle.userData.startTime) / 2);
          
          // Remove particles that hit the ground or fade out
          if (particle.position.y < 0 || particle.material.opacity <= 0) {
            particle.visible = false;
          }
        }
      }
    }
    
    if (!fallDetected) return;
    
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
      {/* Multiple ripple effects with different timing */}
      {ripples.map(ripple => {
        const springProps = useSpring({
          size: fallDetected ? RIPPLE_MAX_SIZE : 0,
          opacity: fallDetected ? 0.7 : 0,
          from: { size: 0, opacity: fallDetected ? 0.7 : 0 },
          delay: ripple.delay,
          config: { 
            tension: 80, 
            friction: 20 
          }
        });
        
        return (
          <a.mesh
            key={`ripple-${ripple.id}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.05, 0]} // Slightly above the ground
            renderOrder={10}
            scale-x={springProps.size}
            scale-y={springProps.size}
            scale-z={1}
          >
            <ringGeometry args={[0.5, 0.8, 36]} />
            <a.meshBasicMaterial 
              color="#ff3333"
              transparent
              opacity={springProps.opacity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </a.mesh>
        );
      })}
      
      {/* Alert indicator */}
      <a.group 
        ref={alertRef}
        scale={alertSpring.scale}
        position={[0, 4, 0]}
      >
        <mesh>
          <octahedronGeometry args={[0.5, 0]} />
          <a.meshPhongMaterial 
            color="#ff3333"
            emissive="#ff5555"
            emissiveIntensity={0.8}
            transparent
            opacity={alertSpring.opacity}
          />
        </mesh>
        
        {/* Alert text */}
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[2, 0.4, 0.1]} />
          <a.meshPhongMaterial 
            color="#ffffff"
            transparent
            opacity={alertSpring.opacity}
          />
        </mesh>
      </a.group>
      
      {/* Particle explosion for impact effect */}
      {showParticles && (
        <group ref={particlesRef}>
          {particles.map(particle => (
            <mesh
              key={`particle-${particle.id}`}
              position={particle.position}
              userData={{
                velocity: particle.velocity,
                startTime: timeRef.current
              }}
            >
              <sphereGeometry args={[particle.size, 8, 8]} />
              <meshBasicMaterial
                color={particle.color}
                transparent
                opacity={1}
              />
            </mesh>
          ))}
        </group>
      )}
      
      {/* Pre-fall warning (when probability is rising) */}
      {!fallDetected && fallProbability > 0.3 && (
        <group position={[0, 0.1, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
            <planeGeometry args={[12, 15]} />
            <meshBasicMaterial 
              color="#ff7700"
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
              color="#ff3333"
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
} 