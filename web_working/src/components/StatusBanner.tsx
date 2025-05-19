import React from 'react';
import { GridStats } from '../types/grid';
import { Activity, Signal, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StatusBannerProps {
  streamName: string;
  status: GridStats;
}

export function StatusBanner({ streamName, status }: StatusBannerProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 flex gap-6">
      <div className="flex items-center gap-2">
        <Signal className={status.connectionStatus === 'connected' ? 'text-green-500' : 'text-red-500'} />
        <div className="text-sm">
          <p className="text-gray-400">{streamName} Status</p>
          <p className="font-medium">{status.connectionStatus}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Activity className="text-blue-500" />
        <div className="text-sm">
          <p className="text-gray-400">Frame Rate</p>
          <p className="font-medium">{status.frameRate} fps</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Clock className="text-purple-500" />
        <div className="text-sm">
          <p className="text-gray-400">Last Update</p>
          <p className="font-medium">
            {formatDistanceToNow(new Date(status.lastUpdate), { addSuffix: true })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Activity className="text-green-500" />
        <div className="text-sm">
          <p className="text-gray-400">Active Sensors</p>
          <p className="font-medium">{status.activeSensors}</p>
        </div>
      </div>
    </div>
  );
} 