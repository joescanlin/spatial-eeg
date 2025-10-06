import React from 'react';
import { ContactQuality } from '../types/grid';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface ContactQualityIndicatorProps {
  contactQuality?: ContactQuality | null;
  compact?: boolean;
}

/**
 * Contact Quality Indicator
 *
 * Shows EEG sensor contact quality for each channel.
 * Quality scale: 0 (no signal) to 4 (excellent)
 *
 * Essential for ensuring data reliability in research settings.
 */
export default function ContactQualityIndicator({
  contactQuality,
  compact = false
}: ContactQualityIndicatorProps) {
  const channels = ['AF3', 'AF4', 'T7', 'T8', 'Pz'];

  const getQualityColor = (quality: number): string => {
    if (quality >= 4) return 'bg-green-500';
    if (quality === 3) return 'bg-yellow-500';
    if (quality === 2) return 'bg-orange-500';
    if (quality === 1) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const getQualityText = (quality: number): string => {
    if (quality >= 4) return 'Excellent';
    if (quality === 3) return 'Good';
    if (quality === 2) return 'Fair';
    if (quality === 1) return 'Poor';
    return 'No Signal';
  };

  const getQualityIcon = (quality: number) => {
    if (quality >= 3) return <CheckCircle className="w-4 h-4" />;
    if (quality >= 2) return <AlertCircle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  const allGood = contactQuality && Object.values(contactQuality.quality).every(q => q >= 3);
  const anyPoor = contactQuality && Object.values(contactQuality.quality).some(q => q < 2);

  if (!contactQuality) {
    return (
      <div className="bg-gray-900 rounded-lg p-3">
        <div className="text-sm text-gray-400">Contact Quality: No Data</div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {allGood && (
          <div className="flex items-center gap-1 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>All sensors good</span>
          </div>
        )}
        {anyPoor && (
          <div className="flex items-center gap-1 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Poor contact detected</span>
          </div>
        )}
        {!allGood && !anyPoor && (
          <div className="flex items-center gap-1 text-yellow-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Fair contact</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Sensor Contact Quality</h3>

      {/* Overall status indicator */}
      <div className="mb-3 p-2 rounded bg-gray-800">
        {allGood && (
          <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
            <CheckCircle className="w-5 h-5" />
            <span>All sensors reporting good contact</span>
          </div>
        )}
        {anyPoor && (
          <div className="flex items-center gap-2 text-red-400 text-sm font-semibold">
            <AlertCircle className="w-5 h-5" />
            <span>Poor contact detected - adjust headset</span>
          </div>
        )}
        {!allGood && !anyPoor && (
          <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold">
            <AlertCircle className="w-5 h-5" />
            <span>Fair contact - may affect data quality</span>
          </div>
        )}
      </div>

      {/* Individual channel quality */}
      <div className="space-y-2">
        {channels.map((channel) => {
          const quality = contactQuality.quality[channel] || 0;
          const qualityColor = getQualityColor(quality);
          const qualityText = getQualityText(quality);

          return (
            <div key={channel} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${qualityColor}`} />
                <span className="text-sm font-mono text-gray-300 w-12">{channel}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Quality bar */}
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded ${
                        i < quality ? qualityColor : 'bg-gray-700'
                      }`}
                    />
                  ))}
                </div>

                {/* Quality text */}
                <span className={`text-xs font-medium w-20 ${
                  quality >= 3 ? 'text-green-400' :
                  quality >= 2 ? 'text-yellow-400' :
                  quality >= 1 ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {qualityText}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <div className="mt-3 pt-3 border-t border-gray-800">
        <p className="text-xs text-gray-500">
          Tip: Wet the sensors slightly for better contact. Adjust headset position if quality is poor.
        </p>
      </div>
    </div>
  );
}