import React from 'react';
import { GridData } from '../types/grid';
import { Activity } from 'lucide-react';
import clsx from 'clsx';

interface GridDisplayProps {
  data: GridData;
}

export function GridDisplay({ data }: GridDisplayProps) {
  // Helper function to get color based on sensor value
  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-700';
    if (value < 0.3) return 'bg-blue-400/50';
    if (value < 0.6) return 'bg-blue-400/75';
    return 'bg-blue-400';
  };

  return (
    <div className="relative bg-gray-900 rounded-lg p-4 h-full">
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