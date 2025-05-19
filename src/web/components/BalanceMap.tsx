import React from 'react';

// Simple placeholder that will eventually render GridDisplay heatmap
export interface BalanceMapProps {
  frame?: any;
  className?: string;
  showTitle?: boolean;
}

export const BalanceMap: React.FC<BalanceMapProps> = ({ frame, className = '', showTitle = false }) => {
  return (
    <div
      className={
        `bg-gray-900 w-full h-full flex items-center justify-center text-gray-400 border border-dashed border-gray-600 ${className}`
      }
    >
      {showTitle && <span>Balance Map (placeholder)</span>}
    </div>
  );
};

export default BalanceMap; 