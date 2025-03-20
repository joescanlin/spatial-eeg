import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, SkipBack, SkipForward, 
  ChevronLeft, ChevronRight, FastForward, Clock, Flag
} from 'lucide-react';
import { 
  fallEventCapture, 
  FallEvent, 
  FallEventFrame, 
  PlaybackStatus 
} from '../../services/FallEventCapture';

interface FallSequencePlayerProps {
  fallEvent: FallEvent;
  onFrameChange?: (frame: FallEventFrame) => void;
}

const FallSequencePlayer: React.FC<FallSequencePlayerProps> = ({ 
  fallEvent, 
  onFrameChange 
}) => {
  // Validate fallEvent to prevent early crashes
  if (!fallEvent?.frames?.length) {
    return (
      <div className="rounded-lg bg-gray-800 p-3 shadow-lg">
        <div className="text-white p-2 text-center">
          No frames available for playback
        </div>
      </div>
    );
  }
  
  // Playback state
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('stopped');
  const [currentFrame, setCurrentFrame] = useState<FallEventFrame | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [totalFrames, setTotalFrames] = useState(0);
  const [timestamp, setTimestamp] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [keyFrameIndices, setKeyFrameIndices] = useState<{
    walkStart: number,
    fallStart: number, 
    impact: number
  }>({ walkStart: 0, fallStart: 0, impact: 0 });
  
  // Timeline slider ref
  const sliderRef = useRef<HTMLInputElement>(null);
  // Playback frame buffer for smoother transitions
  const frameBufferRef = useRef<FallEventFrame[]>([]);
  
  // Find key frames in the fall sequence
  useEffect(() => {
    try {
      if (!fallEvent || !fallEvent.frames.length) return;
      
      // Find first frame with any movement (walking start)
      const walkStartIndex = fallEvent.frames.findIndex((frame, index) => {
        if (index === 0) return false;
        // Check if there's any pressure data in this frame
        return hasPressureData(frame.frame);
      });
      
      // Find approximate start of fall based on probability
      const fallStartIndex = fallEvent.frames.findIndex(frame => 
        frame.fallProbability > 0.3
      );
      
      // Find impact frame (highest pressure)
      let maxPressure = 0;
      let impactIndex = 0;
      
      fallEvent.frames.forEach((frame, index) => {
        const pressure = calculateTotalPressure(frame.frame);
        if (pressure > maxPressure) {
          maxPressure = pressure;
          impactIndex = index;
        }
      });
      
      setKeyFrameIndices({
        walkStart: walkStartIndex >= 0 ? walkStartIndex : 0,
        fallStart: fallStartIndex >= 0 ? fallStartIndex : Math.floor(fallEvent.frames.length / 2),
        impact: impactIndex
      });
    } catch (error) {
      console.error("Error finding key frames:", error);
    }
  }, [fallEvent]);
  
  // Helper function to check if a frame has any pressure data
  const hasPressureData = (frame: number[][]) => {
    if (!frame || !Array.isArray(frame)) return false;
    
    for (let i = 0; i < frame.length; i++) {
      for (let j = 0; j < frame[i].length; j++) {
        if (frame[i][j] > 0) return true;
      }
    }
    
    return false;
  };
  
  // Helper function to calculate total pressure in a frame
  const calculateTotalPressure = (frame: number[][]) => {
    if (!frame || !Array.isArray(frame)) return 0;
    
    let totalPressure = 0;
    for (let i = 0; i < frame.length; i++) {
      for (let j = 0; j < frame[i].length; j++) {
        totalPressure += frame[i][j];
      }
    }
    
    return totalPressure;
  };
  
  // Set up playback on component mount
  useEffect(() => {
    try {
      if (!fallEvent || !fallEvent.frames.length) return;
      
      setTotalFrames(fallEvent.frames.length);
      frameBufferRef.current = [...fallEvent.frames];
      
      // Register for playback updates
      const unregister = fallEventCapture.registerPlaybackCallback((frame) => {
        try {
          if (frame) {
            setCurrentFrame(frame);
            const index = fallEvent.frames.findIndex(f => f.timestamp === frame.timestamp);
            setCurrentFrameIndex(index >= 0 ? index : 0);
            setTimestamp(new Date(frame.timestamp).toLocaleTimeString());
            
            // Call parent callback if provided
            if (onFrameChange) {
              onFrameChange(frame);
            }
          } else {
            setCurrentFrame(null);
            setCurrentFrameIndex(0);
          }
        } catch (error) {
          console.error("Error in playback callback:", error);
        }
      });
      
      // Show the first frame by default
      if (fallEvent.frames.length > 0) {
        setCurrentFrame(fallEvent.frames[0]);
        setTimestamp(new Date(fallEvent.frames[0].timestamp).toLocaleTimeString());
        if (onFrameChange) {
          onFrameChange(fallEvent.frames[0]);
        }
      }
      
      // Clean up on unmount
      return () => {
        try {
          unregister();
          fallEventCapture.stopPlayback();
        } catch (error) {
          console.error("Error in effect cleanup:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up playback:", error);
    }
  }, [fallEvent, onFrameChange]);
  
  // Update local state when playback settings change
  useEffect(() => {
    try {
      const status = fallEventCapture.getPlaybackStatus();
      const settings = fallEventCapture.getPlaybackSettings();
      
      setPlaybackStatus(status);
      setPlaybackSpeed(settings.speed);
      setIsLooping(settings.loop);
    } catch (error) {
      console.error("Error updating playback settings:", error);
    }
  }, [playbackStatus, currentFrameIndex]);
  
  // Handle play/pause button click
  const handlePlayPause = () => {
    try {
      if (playbackStatus === 'playing') {
        fallEventCapture.pausePlayback();
      } else if (playbackStatus === 'paused') {
        fallEventCapture.resumePlayback();
      } else {
        // Start playback from current frame
        fallEventCapture.startPlayback(fallEvent.id, {
          speed: playbackSpeed,
          loop: isLooping,
          currentFrameIndex
        });
      }
    } catch (error) {
      console.error("Error handling play/pause:", error);
    }
  };
  
  // Handle stop button click
  const handleStop = () => {
    try {
      fallEventCapture.stopPlayback();
    } catch (error) {
      console.error("Error stopping playback:", error);
    }
  };
  
  // Handle speed change
  const handleSpeedChange = (speed: number) => {
    try {
      setPlaybackSpeed(speed);
      fallEventCapture.setPlaybackSpeed(speed);
    } catch (error) {
      console.error("Error changing speed:", error);
    }
  };
  
  // Handle loop toggle
  const handleLoopToggle = () => {
    try {
      const newLoopState = !isLooping;
      setIsLooping(newLoopState);
      fallEventCapture.setLooping(newLoopState);
    } catch (error) {
      console.error("Error toggling loop:", error);
    }
  };
  
  // Handle timeline slider change
  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const index = parseInt(e.target.value, 10);
      setCurrentFrameIndex(index);
      
      // Immediately update the frame for responsive scrubbing
      if (frameBufferRef.current && frameBufferRef.current.length > index) {
        const frame = frameBufferRef.current[index];
        setCurrentFrame(frame);
        setTimestamp(new Date(frame.timestamp).toLocaleTimeString());
        
        // Call parent callback for immediate visual update
        if (onFrameChange) {
          onFrameChange(frame);
        }
      }
    } catch (error) {
      console.error("Error changing timeline:", error);
    }
  };
  
  // Handle timeline mouse down - start scrubbing
  const handleTimelineMouseDown = () => {
    setIsDragging(true);
    if (playbackStatus === 'playing') {
      fallEventCapture.pausePlayback();
    }
  };
  
  // Handle timeline mouse up - complete scrubbing
  const handleTimelineMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      fallEventCapture.seekToFrame(currentFrameIndex, fallEvent.id);
    }
  };
  
  // Handle step forward/back
  const handleStep = (direction: 'forward' | 'back') => {
    try {
      const newIndex = direction === 'forward' 
        ? Math.min(currentFrameIndex + 1, totalFrames - 1)
        : Math.max(currentFrameIndex - 1, 0);
      
      setCurrentFrameIndex(newIndex);
      fallEventCapture.seekToFrame(newIndex, fallEvent.id);
    } catch (error) {
      console.error("Error stepping:", error);
    }
  };
  
  // Jump to significant points in the fall
  const jumpToKeyFrame = (keyFrame: 'walkStart' | 'fallStart' | 'impact') => {
    try {
      const targetIndex = keyFrameIndices[keyFrame];
      setCurrentFrameIndex(targetIndex);
      fallEventCapture.seekToFrame(targetIndex, fallEvent.id);
    } catch (error) {
      console.error(`Error jumping to ${keyFrame}:`, error);
    }
  };
  
  // Jump to the moment of fall detection
  const jumpToFall = () => {
    try {
      // Find the first frame with high fall probability
      const fallIndex = fallEvent.frames.findIndex(frame => frame.fallProbability > 0.7);
      if (fallIndex !== -1) {
        const targetIndex = Math.max(0, fallIndex - 15); // Jump to 1 second before fall
        setCurrentFrameIndex(targetIndex);
        fallEventCapture.seekToFrame(targetIndex, fallEvent.id);
      }
    } catch (error) {
      console.error("Error jumping to fall:", error);
    }
  };
  
  // Generate timestamp display
  const getTimestampDisplay = () => {
    try {
      if (!currentFrame) return '--:--:--';
      
      const fallTime = new Date(fallEvent.timestamp);
      const currentTime = new Date(currentFrame.timestamp);
      const diffMs = currentTime.getTime() - fallTime.getTime();
      
      // Format as MM:SS.ms
      const totalSeconds = Math.abs(diffMs) / 1000;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60);
      const ms = Math.floor((totalSeconds % 1) * 100);
      
      const sign = diffMs < 0 ? '-' : '';
      return `${sign}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error("Error generating timestamp:", error);
      return '--:--:--';
    }
  };
  
  // Calculate probability color
  const getProbabilityColor = () => {
    try {
      if (!currentFrame) return 'bg-gray-600';
      
      const prob = currentFrame.fallProbability;
      if (prob > 0.7) return 'bg-red-500';
      if (prob > 0.4) return 'bg-orange-500';
      if (prob > 0.2) return 'bg-yellow-500';
      return 'bg-green-500';
    } catch (error) {
      console.error("Error calculating probability color:", error);
      return 'bg-gray-600';
    }
  };
  
  // Generate custom timeline markers (for key events)
  const timelineMarkers = useMemo(() => {
    if (!fallEvent.frames.length) return null;
    
    const totalWidth = 100; // percentage width
    
    return (
      <div className="absolute bottom-0 left-0 w-full h-4 pointer-events-none">
        {/* Walk Start Marker */}
        <div 
          className="absolute h-full flex flex-col items-center" 
          style={{ left: `${(keyFrameIndices.walkStart / (totalFrames - 1)) * totalWidth}%` }}
        >
          <div className="w-px h-2 bg-green-400"></div>
          <span className="text-xs text-green-400 transform -translate-x-1/2">Walk</span>
        </div>
        
        {/* Fall Start Marker */}
        <div 
          className="absolute h-full flex flex-col items-center" 
          style={{ left: `${(keyFrameIndices.fallStart / (totalFrames - 1)) * totalWidth}%` }}
        >
          <div className="w-px h-2 bg-yellow-400"></div>
          <span className="text-xs text-yellow-400 transform -translate-x-1/2">Fall</span>
        </div>
        
        {/* Impact Marker */}
        <div 
          className="absolute h-full flex flex-col items-center" 
          style={{ left: `${(keyFrameIndices.impact / (totalFrames - 1)) * totalWidth}%` }}
        >
          <div className="w-px h-2 bg-red-500"></div>
          <span className="text-xs text-red-500 transform -translate-x-1/2">Impact</span>
        </div>
        
        {/* Current position marker */}
        <div 
          className="absolute h-3 w-0.5 bg-white top-0 pointer-events-none" 
          style={{ left: `${(currentFrameIndex / (totalFrames - 1)) * totalWidth}%` }}
        ></div>
      </div>
    );
  }, [keyFrameIndices, totalFrames, currentFrameIndex, fallEvent.frames.length]);
  
  // Common style for buttons
  const buttonClass = "p-1.5 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center";
  
  // Return the main component
  return (
    <div className="rounded-lg bg-gray-800 p-3 shadow-lg">
      {/* Current frame info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${getProbabilityColor()}`}></div>
          <span className="text-white text-xs">
            {currentFrame ? `Frame ${currentFrameIndex + 1}/${totalFrames}` : '--/--'}
          </span>
        </div>
        <div className="text-white text-xs flex items-center">
          <Clock size={12} className="mr-1" />
          <span className="font-mono">{getTimestampDisplay()}</span>
        </div>
      </div>
      
      {/* Key frame jump buttons */}
      <div className="flex justify-between items-center mb-2 gap-1">
        <button 
          className="px-1.5 py-0.5 bg-green-800 hover:bg-green-700 text-white text-xs rounded flex items-center"
          onClick={() => jumpToKeyFrame('walkStart')}
        >
          <Flag size={10} className="mr-1" />
          Walk
        </button>
        <button 
          className="px-1.5 py-0.5 bg-yellow-800 hover:bg-yellow-700 text-white text-xs rounded flex items-center"
          onClick={() => jumpToKeyFrame('fallStart')}
        >
          <Flag size={10} className="mr-1" />
          Fall
        </button>
        <button 
          className="px-1.5 py-0.5 bg-red-800 hover:bg-red-700 text-white text-xs rounded flex items-center"
          onClick={() => jumpToKeyFrame('impact')}
        >
          <Flag size={10} className="mr-1" />
          Impact
        </button>
        
        <div className="flex items-center">
          <span className="text-white text-xs mr-1">Fall Prob:</span>
          <div className="h-2 w-12 bg-gray-700 rounded overflow-hidden">
            <div 
              className={`h-full ${getProbabilityColor().replace('bg-', 'bg-')}`}
              style={{ width: `${(currentFrame?.fallProbability || 0) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
  
      {/* Timeline slider */}
      <div className="relative mb-2">
        <input
          ref={sliderRef}
          type="range"
          min="0"
          max={totalFrames > 0 ? totalFrames - 1 : 0}
          value={currentFrameIndex}
          onChange={handleTimelineChange}
          onMouseDown={handleTimelineMouseDown}
          onMouseUp={handleTimelineMouseUp}
          onTouchStart={handleTimelineMouseDown}
          onTouchEnd={handleTimelineMouseUp}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700"
          style={{
            backgroundImage: `linear-gradient(to right, #1d4ed8 0%, #1d4ed8 ${(currentFrameIndex / (totalFrames - 1)) * 100}%, #374151 ${(currentFrameIndex / (totalFrames - 1)) * 100}%, #374151 100%)`
          }}
        />
        
        {/* Timeline markers overlay */}
        {timelineMarkers}
      </div>
      
      {/* Playback controls */}
      <div className="flex justify-between items-center">
        {/* Left side controls */}
        <div className="flex space-x-1">
          {/* Skip back */}
          <button
            onClick={() => handleStep('back')}
            className={buttonClass}
            title="Previous frame"
          >
            <ChevronLeft size={14} />
          </button>
          
          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            className={buttonClass}
            title={playbackStatus === 'playing' ? 'Pause' : 'Play'}
          >
            {playbackStatus === 'playing' ? (
              <Pause size={14} />
            ) : (
              <Play size={14} />
            )}
          </button>
          
          {/* Skip forward */}
          <button
            onClick={() => handleStep('forward')}
            className={buttonClass}
            title="Next frame"
          >
            <ChevronRight size={14} />
          </button>
          
          {/* Reset */}
          <button
            onClick={handleStop}
            className={buttonClass}
            title="Stop playback"
          >
            <RotateCcw size={14} />
          </button>
        </div>
        
        {/* Right side controls */}
        <div className="flex space-x-1 items-center">
          {/* Speed controls */}
          <div className="flex space-x-1">
            <button
              onClick={() => handleSpeedChange(0.5)}
              className={`${buttonClass} text-xs ${playbackSpeed === 0.5 ? 'bg-blue-700' : ''}`}
              title="0.5x Speed"
            >
              0.5x
            </button>
            <button
              onClick={() => handleSpeedChange(1)}
              className={`${buttonClass} text-xs ${playbackSpeed === 1 ? 'bg-blue-700' : ''}`}
              title="Normal Speed"
            >
              1x
            </button>
            <button
              onClick={() => handleSpeedChange(2)}
              className={`${buttonClass} text-xs ${playbackSpeed === 2 ? 'bg-blue-700' : ''}`}
              title="2x Speed"
            >
              2x
            </button>
          </div>
          
          {/* Loop toggle */}
          <button
            onClick={handleLoopToggle}
            className={`${buttonClass} ${isLooping ? 'bg-blue-700' : ''}`}
            title={isLooping ? 'Disable Loop' : 'Enable Loop'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 2l4 4-4 4" />
              <path d="M3 11v-1a4 4 0 014-4h14" />
              <path d="M7 22l-4-4 4-4" />
              <path d="M21 13v1a4 4 0 01-4 4H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FallSequencePlayer; 