import React, { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GridData } from '../../types/grid';
// @ts-ignore
import SensorGrid from './SensorGrid';
// @ts-ignore
import CameraController from './CameraController';
// @ts-ignore
import MovementTracker from './MovementTracker';
// @ts-ignore
import FallEffects from './FallEffects';

interface Grid3DContainerProps {
  data: GridData;
  isVisible: boolean;
}

export default function Grid3DContainer({ data, isVisible }: Grid3DContainerProps) {
  const [cameraView, setCameraView] = useState<'top-down' | 'isometric' | 'follow'>('isometric');
  const [manualControl, setManualControl] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Only render when visible to save resources
  if (!isVisible) return null;
  
  return (
    <div className="w-full h-full" ref={containerRef}>
      <Canvas
        camera={{ position: [0, 10, 10], fov: 50 }}
        shadows
      >
        {/* Ambient light for general illumination */}
        <ambientLight intensity={0.6} />
        
        {/* Directional light to cast shadows */}
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={1.0} 
          castShadow 
        />
        
        {/* Base grid component showing all sensors */}
        <SensorGrid data={data.frame} />
        
        {/* Movement tracking visualization */}
        <MovementTracker data={data} />
        
        {/* Fall effects visualization */}
        <FallEffects 
          fallDetected={data.fallDetected}
          fallProbability={data.fallProbability}
        />
        
        {/* Camera control and positioning - only when not in manual mode */}
        {!manualControl && (
          <CameraController 
            view={cameraView} 
            fallDetected={data.fallDetected} 
          />
        )}
        
        {/* User controls for camera movement */}
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          rotateSpeed={0.5} 
          minDistance={1} 
          maxDistance={50}
        />
      </Canvas>
      
      {/* Camera view control buttons */}
      <div className="absolute bottom-2 left-2 flex space-x-2">
        <button 
          onClick={() => setCameraView('top-down')} 
          className={`px-2 py-1 rounded text-xs ${cameraView === 'top-down' && !manualControl ? 'bg-blue-500' : 'bg-gray-700'}`}
          disabled={manualControl}
        >
          Top View
        </button>
        <button 
          onClick={() => setCameraView('isometric')} 
          className={`px-2 py-1 rounded text-xs ${cameraView === 'isometric' && !manualControl ? 'bg-blue-500' : 'bg-gray-700'}`}
          disabled={manualControl}
        >
          Isometric
        </button>
        <button 
          onClick={() => setCameraView('follow')} 
          className={`px-2 py-1 rounded text-xs ${cameraView === 'follow' && !manualControl ? 'bg-blue-500' : 'bg-gray-700'}`}
          disabled={manualControl}
        >
          Follow
        </button>
      </div>
      
      {/* Manual control toggle */}
      <div className="absolute bottom-2 right-2">
        <button 
          onClick={() => setManualControl(!manualControl)} 
          className={`px-2 py-1 rounded text-xs ${manualControl ? 'bg-red-500' : 'bg-gray-700'}`}
        >
          {manualControl ? 'Auto Camera: Off' : 'Auto Camera: On'}
        </button>
      </div>
    </div>
  );
} 