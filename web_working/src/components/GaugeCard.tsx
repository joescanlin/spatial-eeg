import React from 'react';

interface GaugeCardProps {
  label: string;
  value: number;
  max: number;
  color?: string;
}

const GaugeCard: React.FC<GaugeCardProps> = ({ 
  label, 
  value, 
  max, 
  color = '#3b82f6' // default blue color
}) => {
  // Calculate percentage for the gauge/bar
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  // Calculate stroke-dasharray values for the SVG circle
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-gray-800 rounded-lg p-4 w-full">
      <div className="text-gray-300 text-sm mb-2">{label}</div>
      
      {/* Large Screens - Radial Gauge */}
      <div className="hidden sm:flex justify-center items-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle 
              cx="50" 
              cy="50" 
              r={radius} 
              fill="transparent" 
              stroke="#1f2937" 
              strokeWidth="8"
            />
            
            {/* Foreground Circle (gauge) */}
            <circle 
              cx="50" 
              cy="50" 
              r={radius} 
              fill="transparent" 
              stroke={color} 
              strokeWidth="8" 
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90, 50, 50)" // Start from the top
            />
            
            {/* Centered Value */}
            <text 
              x="50" 
              y="50" 
              dominantBaseline="middle" 
              textAnchor="middle" 
              className="text-2xl font-bold fill-white"
            >
              {Math.round(value)}
            </text>
            
            {/* Max value label */}
            <text 
              x="50" 
              y="65" 
              dominantBaseline="middle" 
              textAnchor="middle" 
              className="text-xs fill-gray-400"
            >
              / {max}
            </text>
          </svg>
        </div>
      </div>
      
      {/* Small Screens - Horizontal Bar */}
      <div className="sm:hidden w-full">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-xl font-bold">{Math.round(value)}</span>
          <span className="text-gray-400 text-sm">/ {max}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className="h-full rounded-full" 
            style={{ 
              width: `${percentage}%`,
              backgroundColor: color
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default GaugeCard; 