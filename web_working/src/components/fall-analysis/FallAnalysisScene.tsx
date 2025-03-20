import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Stats, Html } from '@react-three/drei';
import { FallEvent, FallEventFrame } from '../../services/FallEventCapture';
import HumanModel from './models/HumanModel';
import FallTrajectory from './models/FallTrajectory';
import SensorGrid from '../3d/SensorGrid';
import FallSequencePlayer from './FallSequencePlayer';
import FallEffects from '../3d/FallEffects';
import ErrorBoundary from '../ErrorBoundary';

interface FallAnalysisSceneProps {
  fallEvent: FallEvent;
  showStats?: boolean;
}

export default function FallAnalysisScene({ fallEvent, showStats = false }: FallAnalysisSceneProps) {
  // Defense against no fall event
  if (!fallEvent?.frames?.length) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-2 text-xl">Missing fall event data</p>
          <p className="text-sm text-gray-400">No frames available for visualization</p>
        </div>
      </div>
    );
  }
  
  // Defense against missing analysis
  if (!fallEvent.analysis) {
    console.warn("Fall event is missing analysis data:", fallEvent.id);
  }

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'top' | 'side'>('3d');
  const [showPressure, setShowPressure] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showHuman, setShowHuman] = useState(true);
  const [highlightImpact, setHighlightImpact] = useState(true);
  const [animateModel, setAnimateModel] = useState(true);
  const [showCenterOfGravity, setShowCenterOfGravity] = useState(false);
  const [showGhostTrail, setShowGhostTrail] = useState(false);
  const [showMeasurementGrid, setShowMeasurementGrid] = useState(false);
  
  // Current frame for playback
  const [currentFrame, setCurrentFrame] = useState<FallEventFrame | null>(null);
  const [fallDetectedInFrame, setFallDetectedInFrame] = useState(false);
  const [fallProbability, setFallProbability] = useState(0);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [isFalling, setIsFalling] = useState(false);
  
  // Buffer for previous frames to create smooth transitions
  const [previousFrames, setPreviousFrames] = useState<FallEventFrame[]>([]);
  const MAX_PREVIOUS_FRAMES = 10;
  
  // Handle frame changes from the sequence player
  const handleFrameChange = (frame: FallEventFrame) => {
    try {
      // Track previous frames for animations
      if (currentFrame) {
        setPreviousFrames(prev => {
          const newFrames = [currentFrame, ...prev];
          if (newFrames.length > MAX_PREVIOUS_FRAMES) {
            return newFrames.slice(0, MAX_PREVIOUS_FRAMES);
          }
          return newFrames;
        });
      }
      
      setCurrentFrame(frame);
      setFallProbability(frame?.fallProbability || 0);
      
      // Track frame index for animations
      const frameIndex = fallEvent.frames.findIndex(f => f.timestamp === frame.timestamp);
      setCurrentFrameIndex(frameIndex >= 0 ? frameIndex : 0);
      
      // Determine if we're in walking or falling state based on probability thresholds
      setFallDetectedInFrame(frame?.fallProbability > 0.7);
      setIsFalling(frame?.fallProbability > 0.5);
      setIsWalking(frame?.fallProbability < 0.3);
    } catch (error) {
      console.error("Error handling frame change:", error);
    }
  };
  
  // Get the frame to display - either from playback or highest pressure frame
  const getDisplayFrame = () => {
    try {
      if (currentFrame) {
        return currentFrame.frame;
      }
      return getHighestPressureFrame();
    } catch (error) {
      console.error("Error getting display frame:", error);
      return [[]]; // Return empty frame as fallback
    }
  };
  
  // Get the frame with the highest pressure (likely impact frame)
  const getHighestPressureFrame = () => {
    try {
      if (!fallEvent.frames.length) return [[]];
      
      let maxPressureFrame = fallEvent.frames[0].frame;
      let maxPressure = 0;
      
      for (const frame of fallEvent.frames) {
        if (!frame.frame || !Array.isArray(frame.frame)) continue;
        
        const totalPressure = frame.frame.reduce(
          (sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell, 0), 
          0
        );
        
        if (totalPressure > maxPressure) {
          maxPressure = totalPressure;
          maxPressureFrame = frame.frame;
        }
      }
      
      return maxPressureFrame;
    } catch (error) {
      console.error("Error finding highest pressure frame:", error);
      return [[]];
    }
  };
  
  // Calculate camera position based on view mode
  const getCameraPosition = () => {
    switch (viewMode) {
      case 'top':
        return [0, 10, 0] as [number, number, number]; // Top-down view
      case 'side': 
        return [10, 2, 0] as [number, number, number]; // Side view
      default:
        return [8, 5, 8] as [number, number, number]; // Isometric view
    }
  };
  
  // Create a consistent reset function
  const resetScene = () => {
    try {
      setCurrentFrame(null);
      setFallDetectedInFrame(false);
      setFallProbability(0);
    } catch (error) {
      console.error("Error resetting scene:", error);
    }
  };
  
  // Reset when unmounting
  useEffect(() => {
    return () => {
      resetScene();
    };
  }, []);
  
  // Calculate position along trajectory based on current frame progress
  const calculatePositionAlongTrajectory = () => {
    try {
      if (!currentFrame || !fallEvent.analysis?.trajectory || currentFrameIndex === 0) {
        // Return start point if no frame or at beginning
        return fallEvent.analysis?.trajectory?.startPoint 
          ? [
              fallEvent.analysis.trajectory.startPoint[0] * 0.16, // Scale by 0.16 (4" * 0.04)
              0, 
              fallEvent.analysis.trajectory.startPoint[2] * 0.16  // Scale by 0.16 (4" * 0.04)
            ] 
          : [0, 0, 0];
      }
      
      // Calculate progress ratio (0-1)
      const frameProgress = currentFrameIndex / fallEvent.frames.length;
      
      // Get starting and ending points
      const startPoint = fallEvent.analysis.trajectory.startPoint;
      const endPoint = fallEvent.analysis.trajectory.endPoint;
      
      if (!startPoint || !endPoint) return [0, 0, 0];
      
      // Interpolate between start and end points based on progress
      // We don't interpolate fully to the end until we reach 0.7 progress
      // to give more time for the falling animation at the fall location
      const interpolationFactor = Math.min(1, frameProgress / 0.7);
      
      // Calculate position with proper scaling (4" * 0.04 = 0.16 units per grid cell)
      return [
        (startPoint[0] + (endPoint[0] - startPoint[0]) * interpolationFactor) * 0.16,
        0, // Keep y at ground level
        (startPoint[2] + (endPoint[2] - startPoint[2]) * interpolationFactor) * 0.16
      ];
    } catch (error) {
      console.error("Error calculating position along trajectory:", error);
      return [0, 0, 0];
    }
  };
  
  return (
    <div className="w-full h-full bg-gray-900 relative flex flex-col">
      {/* Main 3D view area */}
      <div className="flex-1 relative">
        {/* Camera controls - MOVED OUTSIDE CANVAS */}
        <div className="absolute top-2 left-2 z-10 flex space-x-2">
          <button 
            onClick={() => setViewMode('3d')} 
            className={`px-2 py-1 rounded text-xs ${viewMode === '3d' ? 'bg-blue-500' : 'bg-gray-700'}`}
          >
            3D View
          </button>
          <button 
            onClick={() => setViewMode('top')} 
            className={`px-2 py-1 rounded text-xs ${viewMode === 'top' ? 'bg-blue-500' : 'bg-gray-700'}`}
          >
            Top View
          </button>
          <button 
            onClick={() => setViewMode('side')} 
            className={`px-2 py-1 rounded text-xs ${viewMode === 'side' ? 'bg-blue-500' : 'bg-gray-700'}`}
          >
            Side View
          </button>
        </div>
        
        {/* Layer toggles - MOVED OUTSIDE CANVAS */}
        <div className="absolute top-2 right-2 z-10 flex flex-col space-y-1">
          <label className="flex items-center space-x-2 text-xs text-white">
            <input 
              type="checkbox" 
              checked={showPressure} 
              onChange={(e) => setShowPressure(e.target.checked)}
              className="form-checkbox h-3 w-3"
            />
            <span>Pressure Data</span>
          </label>
          
          <label className="flex items-center space-x-2 text-xs text-white">
            <input 
              type="checkbox" 
              checked={showTrajectory} 
              onChange={(e) => setShowTrajectory(e.target.checked)}
              className="form-checkbox h-3 w-3"
            />
            <span>Trajectory</span>
          </label>
          
          <label className="flex items-center space-x-2 text-xs text-white">
            <input 
              type="checkbox" 
              checked={showHuman} 
              onChange={(e) => setShowHuman(e.target.checked)}
              className="form-checkbox h-3 w-3"
            />
            <span>Human Model</span>
          </label>
          
          <label className="flex items-center space-x-2 text-xs text-white">
            <input 
              type="checkbox" 
              checked={highlightImpact} 
              onChange={(e) => setHighlightImpact(e.target.checked)}
              className="form-checkbox h-3 w-3"
            />
            <span>Highlight Impact</span>
          </label>
          
          <label className="flex items-center space-x-2 text-xs text-white">
            <input 
              type="checkbox" 
              checked={animateModel} 
              onChange={(e) => setAnimateModel(e.target.checked)}
              className="form-checkbox h-3 w-3"
            />
            <span>Animate</span>
          </label>
          
          <label className="flex items-center space-x-2 text-xs text-white">
            <input 
              type="checkbox" 
              checked={showCenterOfGravity} 
              onChange={(e) => setShowCenterOfGravity(e.target.checked)}
              className="form-checkbox h-3 w-3"
            />
            <span>Center of Gravity</span>
          </label>
          
          <label className="flex items-center space-x-2 text-xs text-white">
            <input 
              type="checkbox" 
              checked={showGhostTrail} 
              onChange={(e) => setShowGhostTrail(e.target.checked)}
              className="form-checkbox h-3 w-3"
            />
            <span>Motion Trail</span>
          </label>
          
          <label className="flex items-center space-x-2 text-xs text-white">
            <input 
              type="checkbox" 
              checked={showMeasurementGrid} 
              onChange={(e) => setShowMeasurementGrid(e.target.checked)}
              className="form-checkbox h-3 w-3"
            />
            <span>Measurement Grid</span>
          </label>
        </div>
        
        {/* 3D Canvas */}
        <Canvas 
          ref={canvasRef}
          camera={{ 
            position: getCameraPosition(), 
            fov: 50
          }}
          shadows
          className="w-full h-full"
        >
          {/* Scene lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={0.8} 
            castShadow 
            shadow-mapSize-width={1024} 
            shadow-mapSize-height={1024}
          />
          
          {/* Environment and grid */}
          <Environment preset="city" />
          <Grid 
            infiniteGrid 
            cellSize={1}
            cellThickness={0.5}
            cellColor="#6b7280"
            sectionSize={3}
            sectionThickness={1}
            sectionColor="#4b5563"
            fadeDistance={50}
            fadeStrength={1.5}
            position={[0, -0.01, 0]}
          />
          
          {/* Measurement grid (1 foot increments) */}
          {showMeasurementGrid && (
            <group position={[0, 0.01, 0]}>
              {/* Grid lines at 1 foot increments */}
              <gridHelper args={[12, 12, '#3b82f6', '#3b82f6']} />
              
              {/* Measurement annotations - 1 foot = 12 inches = 3 sensors */}
              {Array.from({ length: 6 }).map((_, i) => (
                <group key={`measurement-${i}`}>
                  {/* X-axis markers */}
                  <mesh position={[i+1, 0.01, 0]}>
                    <boxGeometry args={[0.05, 0.05, 0.05]} />
                    <meshBasicMaterial color="#3b82f6" />
                  </mesh>
                  <mesh position={[-i-1, 0.01, 0]}>
                    <boxGeometry args={[0.05, 0.05, 0.05]} />
                    <meshBasicMaterial color="#3b82f6" />
                  </mesh>
                  
                  {/* Z-axis markers */}
                  <mesh position={[0, 0.01, i+1]}>
                    <boxGeometry args={[0.05, 0.05, 0.05]} />
                    <meshBasicMaterial color="#3b82f6" />
                  </mesh>
                  <mesh position={[0, 0.01, -i-1]}>
                    <boxGeometry args={[0.05, 0.05, 0.05]} />
                    <meshBasicMaterial color="#3b82f6" />
                  </mesh>
                </group>
              ))}
              
              {/* 4 foot marker for scale reference */}
              <group position={[4, 0.05, 0]}>
                <mesh>
                  <boxGeometry args={[0.1, 0.1, 0.1]} />
                  <meshBasicMaterial color="#ef4444" />
                </mesh>
                <mesh position={[0, 0.15, 0]}>
                  <boxGeometry args={[0.3, 0.05, 0.01]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
                {/* Text label showing "4 ft" */}
                <Html position={[0, 0.3, 0]} center>
                  <div className="bg-red-500 px-1 py-0.5 text-white text-xs rounded">4 ft</div>
                </Html>
              </group>
            </group>
          )}
          
          {/* Pressure data grid */}
          {showPressure && (
            <group position={[0, 0, 0]}>
              <SensorGrid data={getDisplayFrame()} />
            </group>
          )}
          
          {/* Fall trajectory */}
          {showTrajectory && fallEvent.analysis?.trajectory && (
            <FallTrajectory 
              trajectory={fallEvent.analysis.trajectory}
              showImpactPoints={highlightImpact}
            />
          )}
          
          {/* Human model */}
          {showHuman && fallEvent.analysis && (
            <HumanModel 
              bodyParts={fallEvent.analysis.bodyImpactSequence}
              fallDirection={fallEvent.analysis.trajectory?.direction || 'forward'}
              highlightImpact={highlightImpact && isFalling}
              position={calculatePositionAlongTrajectory() as [number, number, number]}
              rotation={[0, Math.PI, 0]}
              isWalking={isWalking && animateModel}
              isFalling={isFalling && animateModel}
              frameIndex={currentFrameIndex}
              totalFrames={fallEvent.frames.length}
              currentFrame={currentFrame}
              previousFrames={previousFrames}
              showCenterOfGravity={showCenterOfGravity}
              showGhostTrail={showGhostTrail}
            />
          )}
          
          {/* Fall effects (particles, etc) */}
          {isFalling && highlightImpact && (
            <FallEffects 
              fallDetected={fallDetectedInFrame}
              fallProbability={fallProbability}
            />
          )}
          
          {/* Camera controls */}
          <OrbitControls target={[0, 1, 0]} maxPolarAngle={Math.PI / 2 - 0.1} />
          
          {/* Stats (if enabled) */}
          {showStats && <Stats />}
        </Canvas>
      </div>
      
      {/* Playback controls at bottom */}
      <div className="p-2 bg-gray-800 border-t border-gray-700">
        <ErrorBoundary componentName="FallSequencePlayer">
          <FallSequencePlayer 
            fallEvent={fallEvent}
            onFrameChange={handleFrameChange}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
} 