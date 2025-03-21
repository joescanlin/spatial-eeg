import React from 'react';
import { History } from 'lucide-react';
import { AlertHistory } from '../../types/alert';
import { AlertHistoryItem } from './AlertHistoryItem';
import { CollapsiblePanel } from '../CollapsiblePanel';

interface AlertHistoryListProps {
  alerts: AlertHistory[];
  isLoading?: boolean;
  error?: string | null;
}

export function AlertHistoryList({ alerts, isLoading, error }: AlertHistoryListProps) {
  return (
    <CollapsiblePanel
      title="Alert History"
      subtitle="Fall Detection Alerts"
      icon={<History className="text-purple-500" />}
    >
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
    </CollapsiblePanel>
  );
}