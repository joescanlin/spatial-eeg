import React, { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { BalanceMetrics } from '../types/grid';
import clsx from 'clsx';
import Chart from 'chart.js/auto';
import { CollapsiblePanel } from './CollapsiblePanel';
import GaugeCard from './GaugeCard';

interface BalanceAssessmentProps {
  metrics: BalanceMetrics;
}

export function BalanceAssessment({ metrics }: BalanceAssessmentProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Normalize metrics for radar chart (0-1 scale)
    const normalizedMetrics = {
      stabilityScore: metrics.stabilityScore,
      swayArea: Math.min(metrics.swayArea / 100, 1), // Assuming max sway area of 100
      weightDistribution: Math.abs(metrics.weightDistribution - 50) / 50, // Convert to 0-1 where 0 is perfect balance
      copMovement: Math.min(metrics.copMovement / 10, 1) // Assuming max CoP movement of 10 inches/sec
    };

    chartInstance.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: [
          'Stability',
          'Sway Area',
          'Weight Distribution',
          'CoP Movement'
        ],
        datasets: [{
          label: 'Balance Metrics',
          data: [
            normalizedMetrics.stabilityScore,
            1 - normalizedMetrics.swayArea, // Invert so higher is better
            1 - normalizedMetrics.weightDistribution, // Invert so higher is better
            1 - normalizedMetrics.copMovement // Invert so higher is better
          ],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(59, 130, 246)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 1,
            ticks: {
              display: false
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            pointLabels: {
              color: 'rgb(156, 163, 175)',
              font: {
                size: 10
            }
            },
            angleLines: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [metrics]);

  return (
    <CollapsiblePanel
      title="Balance Assessment"
      subtitle="Real-time Balance Metrics"
      icon={<Activity className="w-6 h-6 text-green-400" />}
      defaultExpanded={true}
    >
      <div className="h-[200px]">
        <canvas ref={chartRef} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <GaugeCard 
          label="Stability Score" 
          value={metrics.stabilityScore * 100} 
          max={100} 
          color="#3b82f6" 
        />
        <GaugeCard 
          label="Weight Distribution" 
          value={metrics.weightDistribution} 
          max={100} 
          color="#22c55e" 
        />
        <GaugeCard 
          label="Sway Area" 
          value={metrics.swayArea} 
          max={20} 
          color="#eab308" 
        />
        <GaugeCard 
          label="CoP Movement" 
          value={metrics.copMovement} 
          max={10} 
          color="#a855f7" 
        />
      </div>
    </CollapsiblePanel>
  );
} 