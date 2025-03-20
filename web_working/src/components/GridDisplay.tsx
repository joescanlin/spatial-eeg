import React, { useState } from 'react';
import { GridData } from '../types/grid';
import { Activity, Box } from 'lucide-react';
import clsx from 'clsx';
import Grid3DContainer from './3d/Grid3DContainer';

interface GridDisplayProps {
  data: GridData;
}

export function GridDisplay({ data }: GridDisplayProps) {
  // Add state for 3D visualization toggle
  const [show3D, setShow3D] = useState(false);
  
  // Helper function to get color based on sensor value
  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-700';
    if (value < 0.3) return 'bg-blue-400/50';
    if (value < 0.6) return 'bg-blue-400/75';
    return 'bg-blue-400';
  };

  return (
    <div className="relative bg-gray-900 rounded-lg p-4 h-full">
      {/* Toggle button for 2D/3D visualization */}
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={() => setShow3D(!show3D)}
          className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded text-xs',
            show3D ? 'bg-blue-500' : 'bg-gray-700'
          )}
        >
          <Box size={12} />
          <span>{show3D ? '3D' : '2D'}</span>
        </button>
      </div>
      
      {/* 2D Grid Visualization */}
      {!show3D && (
        <div className="grid grid-cols-12 gap-1 aspect-[12/15]">
          {data.frame.map((row, i) =>
            row.map((value, j) => (
              <div
                key={`${i}-${j}`}
                className={clsx(
                  'rounded transition-colors duration-200',
                  getColor(value)
                )}
              />
            ))
          )}
        </div>
      )}
      
      {/* 3D Visualization */}
      <div className={clsx(
        'absolute inset-0 transition-opacity duration-300',
        show3D ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        <Grid3DContainer data={data} isVisible={show3D} />
      </div>
      
      {/* Fall detection overlay */}
      {data.fallDetected && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 backdrop-blur-sm">
          <div className="bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2">
            <Activity className="animate-pulse" />
            <span className="font-semibold">Fall Detected!</span>
            <span className="text-sm opacity-75">
              ({(data.fallProbability * 100).toFixed(0)}% confidence)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}