import React, { useEffect, useRef } from 'react';
import { GridData } from '../types/grid';
import { Footprints } from 'lucide-react';
import clsx from 'clsx';
import { CollapsiblePanel } from './CollapsiblePanel';

interface GaitVisualizationProps {
  data: GridData;
}

export function GaitVisualization({ data }: GaitVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copHistoryRef = useRef<{x: number, y: number}[]>([]);
  const lastUpdateRef = useRef<number>(Date.now());

  // Calculate center of pressure from grid data
  const calculateCoP = (frame: number[][]) => {
    let totalPressure = 0;
    let weightedX = 0;
    let weightedY = 0;

    frame.forEach((row, y) => {
      row.forEach((pressure, x) => {
        totalPressure += pressure;
        weightedX += x * pressure;
        weightedY += y * pressure;
      });
    });

    if (totalPressure > 0) {
      return {
        x: weightedX / totalPressure,
        y: weightedY / totalPressure
      };
    }
    return null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale factors to fit in canvas
    const scaleX = canvas.width / data.frame[0].length;
    const scaleY = canvas.height / data.frame.length;

    // Calculate current CoP
    const cop = calculateCoP(data.frame);
    
    // Update history
    const now = Date.now();
    if (cop && now - lastUpdateRef.current > 50) { // Limit updates to 20fps
      copHistoryRef.current.push(cop);
      if (copHistoryRef.current.length > 30) { // Keep last 30 points
        copHistoryRef.current.shift();
        }
      lastUpdateRef.current = now;
    }

    // Draw grid outline
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    for (let x = 0; x <= data.frame[0].length; x++) {
      ctx.beginPath();
      ctx.moveTo(x * scaleX, 0);
      ctx.lineTo(x * scaleX, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= data.frame.length; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * scaleY);
      ctx.lineTo(canvas.width, y * scaleY);
      ctx.stroke();
    }

    // Draw CoP history trail
    if (copHistoryRef.current.length > 1) {
      ctx.beginPath();
      ctx.moveTo(
        copHistoryRef.current[0].x * scaleX,
        copHistoryRef.current[0].y * scaleY
      );
      
      copHistoryRef.current.forEach((point, i) => {
        if (i === 0) return;
        ctx.lineTo(point.x * scaleX, point.y * scaleY);
    });

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw current CoP
    if (cop) {
      ctx.beginPath();
      ctx.arc(
        cop.x * scaleX,
        cop.y * scaleY,
        4,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

  }, [data.frame]);

  return (
    <CollapsiblePanel
      title="Gait Pattern"
      subtitle="Center of Pressure Movement"
      icon={<Footprints className="w-6 h-6 text-blue-400" />}
    >
      <canvas
        ref={canvasRef}
        width={200}
        height={250}
        className="w-full bg-gray-900/50 rounded-lg backdrop-blur-sm"
      />
    </CollapsiblePanel>
  );
} 
