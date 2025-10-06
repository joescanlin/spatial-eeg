import React from 'react';
import { BandPower } from '../types/grid';

interface BandPowerVisualizationProps {
  bandPower?: BandPower | null;
}

/**
 * Band Power Visualization
 *
 * Displays brain wave frequency bands for each EEG channel:
 * - Theta (4-8 Hz): Memory encoding, drowsiness
 * - Alpha (8-12 Hz): Relaxed alertness
 * - Beta Low (12-16 Hz): Active thinking
 * - Beta High (16-25 Hz): Concentration, anxiety
 * - Gamma (25-45 Hz): High-level cognitive processing
 *
 * Research applications:
 * - Cognitive load: High beta indicates mental effort
 * - Relaxation: High alpha indicates calm state
 * - Navigation confidence: Beta/alpha ratio
 */
export default function BandPowerVisualization({
  bandPower
}: BandPowerVisualizationProps) {
  const channels = ['AF3', 'AF4', 'T7', 'T8', 'Pz'];
  const bands = [
    { name: 'theta', label: 'Theta', color: 'bg-purple-500', description: '4-8 Hz' },
    { name: 'alpha', label: 'Alpha', color: 'bg-blue-500', description: '8-12 Hz' },
    { name: 'betaL', label: 'Beta L', color: 'bg-green-500', description: '12-16 Hz' },
    { name: 'betaH', label: 'Beta H', color: 'bg-yellow-500', description: '16-25 Hz' },
    { name: 'gamma', label: 'Gamma', color: 'bg-red-500', description: '25-45 Hz' }
  ];

  if (!bandPower) {
    return (
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Band Power</h3>
        <div className="text-xs text-gray-500">No data available</div>
      </div>
    );
  }

  // Calculate max value for normalization
  const maxValue = Math.max(
    ...channels.flatMap(channel =>
      bands.map(band =>
        (bandPower.channels[channel] as any)?.[band.name] || 0
      )
    ),
    0.1 // Avoid division by zero
  );

  // Calculate cognitive state indicators
  const getCognitiveState = () => {
    if (!bandPower.channels['Pz']) return null;

    const pz = bandPower.channels['Pz'];
    const betaTotal = (pz.betaL + pz.betaH) / 2;
    const alpha = pz.alpha;

    // Beta/Alpha ratio indicates cognitive load
    const cognitiveLoad = alpha > 0 ? betaTotal / alpha : 0;

    return {
      cognitiveLoad,
      relaxation: alpha,
      focus: betaTotal,
      drowsiness: pz.theta
    };
  };

  const cogState = getCognitiveState();

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Brain Wave Band Power</h3>

      {/* Cognitive state summary */}
      {cogState && (
        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
          <div className="text-xs font-semibold text-gray-400 mb-2">Cognitive State (Pz)</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Load: </span>
              <span className={`font-bold ${
                cogState.cognitiveLoad > 2 ? 'text-red-400' :
                cogState.cognitiveLoad > 1 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {cogState.cognitiveLoad.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Relax: </span>
              <span className={`font-bold ${
                cogState.relaxation > 0.5 ? 'text-green-400' :
                cogState.relaxation > 0.3 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {(cogState.relaxation * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Band power heatmap by channel */}
      <div className="space-y-3">
        {channels.map((channel) => {
          const channelData = bandPower.channels[channel];
          if (!channelData) return null;

          return (
            <div key={channel}>
              <div className="text-xs font-mono text-gray-400 mb-1">{channel}</div>
              <div className="grid grid-cols-5 gap-1">
                {bands.map((band) => {
                  const value = (channelData as any)[band.name] || 0;
                  const percentage = (value / maxValue) * 100;

                  return (
                    <div
                      key={band.name}
                      className="relative group"
                      title={`${band.label}: ${value.toFixed(3)}`}
                    >
                      {/* Bar */}
                      <div className="h-12 bg-gray-800 rounded overflow-hidden">
                        <div
                          className={`${band.color} transition-all duration-300`}
                          style={{
                            height: `${Math.min(percentage, 100)}%`,
                            marginTop: 'auto'
                          }}
                        />
                      </div>

                      {/* Label */}
                      <div className="text-[10px] text-center text-gray-500 mt-1">
                        {band.label.split(' ')[0]}
                      </div>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                        <div className="font-bold">{band.label}</div>
                        <div className="text-gray-400">{band.description}</div>
                        <div className="text-green-400">{value.toFixed(3)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-800">
        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
          {bands.map((band) => (
            <div key={band.name} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded ${band.color}`} />
              <span>{band.label} ({band.description})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Research interpretation */}
      <div className="mt-3 p-2 bg-gray-800/50 rounded text-xs text-gray-400">
        <div className="font-semibold mb-1">Research Notes:</div>
        <ul className="space-y-1 text-[10px]">
          <li>• High beta during navigation → Increased cognitive load</li>
          <li>• Alpha dominance → Relaxed, confident movement</li>
          <li>• Theta increase → Fatigue or memory encoding</li>
          <li>• Pz (parietal) → Spatial processing center</li>
        </ul>
      </div>
    </div>
  );
}