import React, { useRef, useEffect, useState } from "react";

interface EEGPanelProps {
  sample?: {
    timestamp: number;
    values: number[];
    labels: string[];
  } | null;
}

// Store history for each channel (scrolling waveform)
const channelHistory: number[][] = [];
const MAX_HISTORY = 300; // Number of points to keep (3 seconds at 100Hz)

export default function EEGPanel({ sample }: EEGPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numChannels, setNumChannels] = useState(0);

  useEffect(() => {
    if (!sample) return;

    // Initialize history arrays if needed
    const values = sample.values || [];
    if (channelHistory.length !== values.length) {
      channelHistory.length = 0;
      for (let i = 0; i < values.length; i++) {
        channelHistory.push([]);
      }
      setNumChannels(values.length);
    }

    // Add new values to history
    values.forEach((value, i) => {
      channelHistory[i].push(value);
      if (channelHistory[i].length > MAX_HISTORY) {
        channelHistory[i].shift();
      }
    });
  }, [sample]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const W = canvasRef.current.width;
    const H = canvasRef.current.height;

    // Animation loop for smooth scrolling
    const animate = () => {
      // Clear canvas with dark background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, W, H);

      if (channelHistory.length === 0 || !sample) return;

      const labels = sample.labels || [];
      const numChannels = channelHistory.length;
      const channelHeight = H / numChannels;

      // Channel colors (distinct for each channel)
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

      channelHistory.forEach((history, channelIdx) => {
        if (history.length < 2) return;

        const centerY = channelIdx * channelHeight + channelHeight / 2;

        // Draw center line for this channel
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(W, centerY);
        ctx.stroke();

        // Draw channel label
        ctx.fillStyle = '#666';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(labels[channelIdx] || `CH${channelIdx + 1}`, 5, centerY - channelHeight / 2 + 15);

        // Calculate scale for this channel
        const channelValues = history.slice(-MAX_HISTORY);
        const maxVal = Math.max(...channelValues.map(v => Math.abs(v))) || 1;
        const scale = (channelHeight * 0.4) / maxVal; // Use 40% of channel height for signal

        // Draw waveform
        ctx.strokeStyle = colors[channelIdx % colors.length];
        ctx.lineWidth = 2;
        ctx.beginPath();

        const pointSpacing = W / MAX_HISTORY;
        channelValues.forEach((value, i) => {
          const x = i * pointSpacing;
          const y = centerY - (value * scale);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.stroke();

        // Draw current value
        const currentValue = channelValues[channelValues.length - 1] || 0;
        ctx.fillStyle = colors[channelIdx % colors.length];
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(currentValue.toFixed(1), W - 5, centerY - channelHeight / 2 + 15);
      });

      // Draw timestamp
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`t: ${sample?.timestamp.toFixed(3)}`, W - 5, H - 5);
    };

    // Start animation loop
    const animationId = requestAnimationFrame(function loop() {
      animate();
      requestAnimationFrame(loop);
    });

    return () => cancelAnimationFrame(animationId);
  }, [sample, numChannels]);

  return (
    <div className="bg-gray-900 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Live EEG Waveforms</h3>
      <canvas
        ref={canvasRef}
        width={800}
        height={250}
        style={{ width: "100%", height: 250 }}
        className="bg-gray-800 rounded"
      />
      {!sample && (
        <div className="text-xs text-gray-500 mt-1">No EEG data available</div>
      )}
    </div>
  );
}