import React from 'react';
import { GridData } from '../types/grid';
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
    <div className="relative bg-gray-900 rounded-lg p-4 h-full w-full">
      {/* 2D Grid Visualization */}
      <div className="grid grid-cols-12 gap-1 aspect-[12/15] h-full">
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
    </div>
  );
}