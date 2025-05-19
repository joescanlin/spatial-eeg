import React, { useEffect } from 'react';
import { GridData } from '../types/grid';
import clsx from 'clsx';

interface GridDisplayProps {
  data: GridData;
}

export function GridDisplay({ data }: GridDisplayProps) {
  // Debug the incoming data
  useEffect(() => {
    console.log("GridDisplay rendering with data:", {
      hasFrame: Boolean(data?.frame),
      gridSize: data?.frame?.length,
      activeSensors: data?.frame?.reduce((acc, row) => 
        acc + row.reduce((sum, cell) => sum + (cell > 0 ? 1 : 0), 0), 0)
    });
  }, [data]);
  
  // Helper function to get color based on sensor value
  const getColor = (value: number) => {
    // Make even small activations more visible
    if (value === 0) return 'bg-gray-700';
    if (value < 0.1) return 'bg-blue-400/25';  // More visible for small values
    if (value < 0.3) return 'bg-blue-400/50';
    if (value < 0.6) return 'bg-blue-400/75';
    return 'bg-blue-400';
  };

  return (
    <div className="relative bg-gray-900 rounded-lg p-4 h-full w-full">
      {/* 2D Grid Visualization */}
      <div className="grid grid-cols-12 gap-1 aspect-[12/15] h-full">
        {data?.frame?.map((row, i) =>
          row.map((value, j) => (
            <div
              key={`${i}-${j}`}
              className={clsx(
                'rounded transition-colors duration-200',
                getColor(value)
              )}
              title={`Cell [${i},${j}]: ${value.toFixed(2)}`}
            />
          ))
        )}
      </div>
      
      {/* Display number of active sensors */}
      <div className="absolute top-2 right-2 bg-gray-800/50 px-2 py-1 rounded text-xs text-gray-300">
        {data?.frame?.reduce((acc, row) => 
          acc + row.reduce((sum, cell) => sum + (cell > 0 ? 1 : 0), 0), 0) || 0} active
      </div>
    </div>
  );
}