import React from 'react';
import { History } from 'lucide-react';
import { AlertHistory } from '../../types/alert';
import { AlertHistoryItem } from './AlertHistoryItem';

interface AlertHistoryListProps {
  alerts: AlertHistory[];
  isLoading?: boolean;
  error?: string | null;
}

export function AlertHistoryList({ alerts, isLoading, error }: AlertHistoryListProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <History className="text-purple-500" />
        Alert History
      </h2>
      
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="text-sm text-gray-400">Loading alert history...</div>
        ) : error ? (
          <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded">
            {error}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-sm text-gray-400">No alerts yet</div>
        ) : (
          alerts.map((alert) => (
            <AlertHistoryItem key={alert.id} alert={alert} />
          ))
        )}
      </div>
    </div>
  );
}