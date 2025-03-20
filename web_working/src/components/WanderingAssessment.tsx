import React, { useEffect, useRef, useState } from 'react';
import { Map } from 'lucide-react';
import Chart from 'chart.js/auto';

interface WanderingMetrics {
  pathLength: number;
  areaCovered: number;
  directionChanges: number;
  repetitiveScore: number;
}

interface Props {
  metrics: WanderingMetrics;
}

const SENSOR_WIDTH = 4; // 4 feet
const SENSOR_HEIGHT = 5; // 5 feet
const TOTAL_AREA = SENSOR_WIDTH * SENSOR_HEIGHT; // 20 sq feet

const WanderingAssessment: React.FC<Props> = ({ metrics }) => {
  const pathGraphRef = useRef<HTMLCanvasElement>(null);
  const pathChartInstance = useRef<Chart | null>(null);
  const [pathHistory, setPathHistory] = useState<number[]>([]);
  const lastUpdateRef = useRef<number>(Date.now());

  // Update path history with new data
  useEffect(() => {
    const now = Date.now();
    // Only update every 500ms to prevent too frequent updates
    if (now - lastUpdateRef.current > 500) {
      setPathHistory(prev => {
        const newHistory = [...prev, metrics.pathLength];
        // Keep last 60 seconds of data (120 points at 500ms intervals)
        return newHistory.slice(-120);
      });
      lastUpdateRef.current = now;
    }
  }, [metrics.pathLength]);

  // Initialize and update path length chart
  useEffect(() => {
    if (!pathGraphRef.current) return;

    if (pathChartInstance.current) {
      pathChartInstance.current.destroy();
    }

    const ctx = pathGraphRef.current.getContext('2d');
    if (!ctx) return;

    // Create labels for the last 60 seconds
    const labels = Array.from({ length: pathHistory.length }, (_, i) => {
      const secondsAgo = (pathHistory.length - 1 - i) * 0.5;
      if (secondsAgo === 0) return 'Now';
      if (secondsAgo % 5 === 0) return `${secondsAgo}s`;
      return '';
    });

    pathChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Path Length',
          data: pathHistory,
          borderColor: '#3b82f6',
          tension: 0.4,
          fill: false,
          pointRadius: 0, // Hide points
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0 // Disable animations for smoother updates
        },
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: SENSOR_HEIGHT * 2, // Set max to double the sensor height for reasonable scale
            title: {
              display: true,
              text: 'Distance (ft)',
              color: '#9ca3af'
            },
            grid: {
              color: '#374151'
            },
            ticks: {
              color: '#9ca3af'
            }
          },
          x: {
            grid: {
              color: '#374151'
            },
            ticks: {
              color: '#9ca3af',
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8
            }
          }
        }
      }
    });

    return () => {
      if (pathChartInstance.current) {
        pathChartInstance.current.destroy();
      }
    };
  }, [pathHistory]);

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Map className="w-5 h-5 text-blue-500" />
        <h3 className="font-medium text-gray-100">Wandering Assessment</h3>
      </div>

      {/* Path Length Graph */}
      <div className="h-32 mb-4">
        <canvas ref={pathGraphRef} />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-400">Path Length</div>
          <div className="font-medium text-gray-100">{metrics.pathLength.toFixed(1)} ft</div>
        </div>
        <div>
          <div className="text-gray-400">Area Covered</div>
          <div className="font-medium text-gray-100">
            {metrics.areaCovered.toFixed(1)} sq ft
            <span className="text-gray-400 text-xs ml-1">
              ({((metrics.areaCovered / TOTAL_AREA) * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
        <div>
          <div className="text-gray-400">Direction Changes</div>
          <div className="font-medium text-gray-100">{metrics.directionChanges}</div>
        </div>
        <div>
          <div className="text-gray-400">Repetitive Score</div>
          <div className="font-medium text-gray-100">{(metrics.repetitiveScore * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
};

export default WanderingAssessment; 
