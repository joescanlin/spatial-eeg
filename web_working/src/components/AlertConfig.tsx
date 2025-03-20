import React from 'react';
import { AlertConfig } from '../types/alert';
import { Phone, Bell, Send } from 'lucide-react';

interface AlertConfigProps {
  config: AlertConfig;
  onUpdate: (config: AlertConfig) => void;
  onTest: () => void;
}

export function AlertConfig({ config, onUpdate, onTest }: AlertConfigProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Bell className="text-yellow-500" />
        Alert Configuration
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <Phone size={16} />
            Phone Numbers
          </label>
          {config.phoneNumbers.map((number, index) => (
            <input
              key={index}
              type="tel"
              value={number}
              onChange={(e) => {
                const newNumbers = [...config.phoneNumbers];
                newNumbers[index] = e.target.value;
                onUpdate({ ...config, phoneNumbers: newNumbers });
              }}
              className="mt-1 w-full bg-gray-700 rounded px-3 py-2 text-sm"
              placeholder="+1234567890"
            />
          ))}
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => onUpdate({ ...config, enabled: e.target.checked })}
              className="rounded bg-gray-700"
            />
            <span className="text-sm">Enable Alerts</span>
          </label>
          
          <button
            onClick={onTest}
            className="flex items-center gap-2 px-3 py-1 bg-blue-500 rounded-full text-sm hover:bg-blue-600 transition-colors"
          >
            <Send size={14} />
            Test SMS
          </button>
        </div>
      </div>
    </div>
  );
}