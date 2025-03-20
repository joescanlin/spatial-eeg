import React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { AlertHistory } from '../../types/alert';
import clsx from 'clsx';

interface AlertHistoryItemProps {
  alert: AlertHistory;
}

export function AlertHistoryItem({ alert }: AlertHistoryItemProps) {
  return (
    <div className={clsx(
      "flex items-center justify-between rounded p-3",
      alert.status === 'delivered' ? 'bg-gray-700' : 'bg-red-900/20'
    )}>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {format(new Date(alert.timestamp), 'PPp')}
        </p>
        <p className="text-sm text-gray-400">{alert.message}</p>
        {alert.error && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <AlertTriangle size={14} />
            {alert.error}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-sm">
          {alert.confidence.toFixed(1)}% confidence
        </span>
        {alert.status === 'delivered' ? (
          <Check className="text-green-500" size={18} />
        ) : (
          <X className="text-red-500" size={18} />
        )}
      </div>
    </div>
  );
}