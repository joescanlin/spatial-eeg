import React from 'react';

interface Props {
  active: boolean;
  stepText: string;
  progress: number;
  onStop: () => void;
}

export function BalanceTrainingGuide({ active, stepText, progress, onStop }: Props) {
  if (!active) return null;
  return (
    <div className="bg-gray-800 p-4 rounded-lg w-64 flex flex-col gap-2">
      <div className="text-sm font-semibold">{stepText}</div>
      <div className="w-full bg-gray-700 h-2 rounded">
        <div className="bg-blue-500 h-full" style={{ width: `${progress * 100}%` }} />
      </div>
      <button
        onClick={onStop}
        className="self-end text-xs mt-2 px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
      >
        Stop
      </button>
    </div>
  );
}
