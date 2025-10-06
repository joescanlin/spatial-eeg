import React, { useState } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { LaneBoundary } from '../types/multistation';

interface LaneConfiguratorProps {
  lanes: LaneBoundary[];
  onUpdate: (lanes: LaneBoundary[]) => void;
  gridHeight: number;
}

export default function LaneConfigurator({ lanes, onUpdate, gridHeight }: LaneConfiguratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editedLanes, setEditedLanes] = useState<LaneBoundary[]>(lanes);

  const handleLaneChange = (index: number, field: 'start' | 'end', value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, Math.min(gridHeight - 1, numValue));

    const updated = [...editedLanes];
    updated[index] = { ...updated[index], [field]: clampedValue };
    setEditedLanes(updated);
  };

  const handleSave = () => {
    onUpdate(editedLanes);
    setIsOpen(false);
  };

  const handleReset = () => {
    setEditedLanes(lanes);
  };

  const addLane = () => {
    const laneLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const newLane: LaneBoundary = {
      start: 0,
      end: 8,
      lane: laneLetters[editedLanes.length] || `Lane ${editedLanes.length + 1}`
    };
    setEditedLanes([...editedLanes, newLane]);
  };

  const removeLane = (index: number) => {
    const laneLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const updated = editedLanes.filter((_, i) => i !== index);
    // Relabel remaining lanes with letters
    updated.forEach((lane, i) => lane.lane = laneLetters[i] || `Lane ${i + 1}`);
    setEditedLanes(updated);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg transition-all z-50"
        title="Configure Lanes"
      >
        <Settings className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-400" />
            Configure Lane Boundaries
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-purple-900/20 border border-purple-700/30 rounded p-4 text-sm text-purple-200">
            <p className="font-semibold mb-2">Instructions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Set exact Y-pixel coordinates for each lane (0 = top, {gridHeight - 1} = bottom)</li>
              <li>Lanes run horizontally across the full width</li>
              <li>Use the pixel grid in the background to align boundaries</li>
              <li>Click "Save Configuration" when done</li>
            </ul>
          </div>

          {editedLanes.map((lane, index) => (
            <div key={index} className="bg-gray-800 border border-gray-700 rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-yellow-400">
                  Lane {lane.lane}
                </h3>
                <button
                  onClick={() => removeLane(index)}
                  className="text-red-400 hover:text-red-300 text-sm px-3 py-1 border border-red-700 rounded"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Start Y (top edge)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={gridHeight - 1}
                    value={lane.start}
                    onChange={(e) => handleLaneChange(index, 'start', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Pixel row: {lane.start}</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    End Y (bottom edge)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={gridHeight - 1}
                    value={lane.end}
                    onChange={(e) => handleLaneChange(index, 'end', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Pixel row: {lane.end}</p>
                </div>
              </div>

              <div className="mt-2 text-sm text-gray-400">
                Lane height: {lane.end - lane.start} pixels ({((lane.end - lane.start) * 4)} inches)
              </div>
            </div>
          ))}

          <button
            onClick={addLane}
            className="w-full py-3 border-2 border-dashed border-gray-600 hover:border-gray-500 rounded text-gray-400 hover:text-gray-300 transition-all"
          >
            + Add Lane
          </button>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded font-semibold flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save Configuration
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded font-semibold flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
