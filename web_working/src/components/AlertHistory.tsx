import React from 'react';
import { AlertHistory } from '../types/alert';
import { History, Check, X } from 'lucide-react';
import { format } from 'date-fns';

interface AlertHistoryProps {
  alerts: AlertHistory[];
}

export function AlertHistory({ alerts }: AlertHistoryProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <History className="text-purple-500" />
        Alert History
      </h2>
      
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between bg-gray-700 rounded p-3"
          >
            <div>
              <p className="text-sm font-medium">
                {format(new Date(alert.timestamp), 'PPp')}
              </p>
              <p className="text-sm text-gray-400">{alert.phoneNumber}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm">
                {alert.confidence.toFixed(1)}% confidence
              </span>
              {alert.status === 'delivered' ? (
                <Check className="text-green-500" size={18} />
              ) : alert.status === 'failed' ? (
                <X className="text-red-500" size={18} />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}