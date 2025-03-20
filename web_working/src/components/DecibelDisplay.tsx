import { Volume2 } from 'lucide-react';
import clsx from 'clsx';

interface DecibelDisplayProps {
  level: number;
}

export function DecibelDisplay({ level }: DecibelDisplayProps) {
  // Calculate color based on decibel level
  const getColor = () => {
    if (level < 35) return 'text-gray-400'; // Ambient noise
    if (level < 40) return 'text-blue-400'; // Light footsteps
    return 'text-blue-500';                 // Heavy footsteps
  };

  const getBgColor = () => {
    if (level < 35) return 'bg-gray-400/20'; // Ambient noise
    if (level < 40) return 'bg-blue-400/20'; // Light footsteps
    return 'bg-blue-500/20';                 // Heavy footsteps
  };

  // Calculate the width of the level indicator (30-45 dB range)
  const getWidth = () => {
    const minDb = 30;
    const maxDb = 45;
    const percentage = ((level - minDb) / (maxDb - minDb)) * 100;
    return Math.max(0, Math.min(100, percentage));
  };

  return (
    <div className={clsx(
      "rounded-lg p-6 border border-gray-700",
      getBgColor(),
      "transition-colors duration-500 ease-in-out"
    )}>
      <div className="flex items-center gap-3 mb-4">
        <Volume2 
          className={clsx(
            'w-6 h-6 transition-all duration-300',
            getColor(),
            level > 35 && 'animate-pulse'
          )} 
        />
        <div className="flex flex-col">
          <span className={clsx(
            "font-bold text-2xl transition-all duration-300",
            getColor()
          )}>
            {level.toFixed(1)} dB
          </span>
          <span className="text-sm text-gray-400">
            {level < 35 ? 'Ambient Noise' : level < 40 ? 'Light Footsteps' : 'Heavy Footsteps'}
          </span>
        </div>
      </div>
      
      <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
        <div 
          className={clsx(
            'h-full transition-all duration-300 ease-out',
            getColor(),
            'relative'
          )}
          style={{ 
            width: `${getWidth()}%`,
            boxShadow: '0 0 10px currentColor'
          }}
        >
          <div 
            className={clsx(
              "absolute inset-0",
              "animate-shimmer",
              "bg-gradient-to-r from-transparent via-white/10 to-transparent"
            )}
          />
        </div>
      </div>
      
      <div className="flex justify-between mt-2 text-sm font-medium">
        <span className="text-gray-400">30 dB</span>
        <span className="text-gray-400">45 dB</span>
      </div>
    </div>
  );
} 