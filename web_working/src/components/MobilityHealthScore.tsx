import React from 'react';
import { Activity } from 'lucide-react';
import clsx from 'clsx';

// Baseline metrics for comparison
const BASELINE_METRICS = {
  walkingSpeed: 3.3,    // feet/second (normal walking speed)
  strideLength: 4.5,    // feet
  balanceScore: 75,     // baseline balance score
  baselineScore: 75     // starting score
};

interface Props {
  currentMetrics: {
    walkingSpeed: number;
    strideLength: number;
    balanceScore: number;
    stepCount: number;
  };
}

export function MobilityHealthScore({ currentMetrics }: Props) {
  // Calculate score adjustments
  const speedDiff = (currentMetrics.walkingSpeed / BASELINE_METRICS.walkingSpeed - 1) * 10;
  const strideDiff = (currentMetrics.strideLength / BASELINE_METRICS.strideLength - 1) * 10;
  const balanceDiff = (currentMetrics.balanceScore / BASELINE_METRICS.balanceScore - 1) * 10;

  // Calculate overall score
  const scoreAdjustment = (speedDiff + strideDiff + balanceDiff) / 3;
  const currentScore = Math.max(0, Math.min(100, BASELINE_METRICS.baselineScore + scoreAdjustment));

  // Determine risk level and color
  const getRiskLevel = (score: number) => {
    if (score >= 80) return { level: 'Low Risk', color: 'text-green-400' };
    if (score >= 60) return { level: 'Moderate Risk', color: 'text-yellow-400' };
    return { level: 'High Risk', color: 'text-red-400' };
  };

  const { level, color } = getRiskLevel(currentScore);

  return (
    <div className={clsx(
      "rounded-lg p-3 border border-gray-700",
      "bg-gray-800/50 backdrop-blur-sm",
      "transition-colors duration-500 ease-in-out"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-5 h-5 text-purple-400" />
        <div className="flex flex-col">
          <span className="font-bold text-base">Mobility Health Score</span>
          <span className="text-xs text-gray-400">Overall Assessment</span>
        </div>
      </div>

      {/* Risk Level */}
      <div className="text-center mb-2">
        <span className="text-sm text-gray-400">Risk Level: </span>
        <span className={clsx("font-medium", color)}>{level}</span>
      </div>

      {/* Score Display */}
      <div className="flex items-center justify-center mb-3">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#374151"
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeDasharray={`${currentScore * 2.83} 283`}
              strokeDashoffset="0"
              transform="rotate(-90 50 50)"
              className={color}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold leading-none">{Math.round(currentScore)}</span>
            <span className="text-sm text-gray-400 leading-none">/ 100</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-sm text-gray-400">Walking Speed</div>
          <div className="text-base font-medium">{currentMetrics.walkingSpeed.toFixed(1)} ft/s</div>
        </div>
        <div>
          <div className="text-sm text-gray-400">Stride Length</div>
          <div className="text-base font-medium">{currentMetrics.strideLength.toFixed(1)} ft</div>
        </div>
      </div>
    </div>
  );
} 
