import React from 'react';
import { Bell, Send } from 'lucide-react';
import { AlertConfig } from '../../types/alert';
import { PhoneNumberInput } from './PhoneNumberInput';
import { useSMSAlert } from '../../hooks/useSMSAlert';
import clsx from 'clsx';

interface AlertConfigPanelProps {
  config: AlertConfig;
  onUpdate: (config: AlertConfig) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function AlertConfigPanel({ config, onUpdate, isLoading: configLoading, error: configError }: AlertConfigPanelProps) {
  const { isLoading: smsLoading, error: smsError, success, sendTestSMS } = useSMSAlert();

  const handleTestSMS = () => {
    if (config.phoneNumbers[0]) {
      sendTestSMS(config.phoneNumbers[0]);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Bell className="text-yellow-500" />
        Alert Configuration
      </h2>
      
      <div className="space-y-4">
        {configLoading ? (
          <div className="text-sm text-gray-400">Loading configuration...</div>
        ) : (
          <>
            {config.phoneNumbers.map((number, index) => (
              <PhoneNumberInput
                key={index}
                value={number}
                onChange={(value) => {
                  const newNumbers = [...config.phoneNumbers];
                  newNumbers[index] = value;
                  onUpdate({ ...config, phoneNumbers: newNumbers });
                }}
              />
            ))}
            
            <div className="space-y-2">
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
                  onClick={handleTestSMS}
                  disabled={smsLoading || !config.phoneNumbers[0]}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors",
                    smsLoading ? "bg-gray-600 cursor-not-allowed" :
                    success ? "bg-green-500 hover:bg-green-600" :
                    "bg-blue-500 hover:bg-blue-600",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Send size={14} />
                  {smsLoading ? 'Sending...' : success ? 'Sent!' : 'Test SMS'}
                </button>
              </div>
              
              {(configError || smsError) && (
                <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded">
                  {configError || smsError}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}