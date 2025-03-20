import React from 'react';
import { Signal, Settings } from 'lucide-react';
import { MQTTConfig, ConnectionStatus } from '../types/connection';
import clsx from 'clsx';

interface ConnectionPanelProps {
  config: MQTTConfig;
  status: ConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  onConfigChange: (config: MQTTConfig) => void;
}

export function ConnectionPanel({ 
  config, 
  status, 
  onConnect, 
  onDisconnect, 
  onConfigChange 
}: ConnectionPanelProps) {
  const [isConfigOpen, setIsConfigOpen] = React.useState(false);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Signal className={clsx(
            status === 'connected' && 'text-green-500',
            status === 'connecting' && 'text-yellow-500',
            status === 'error' && 'text-red-500',
            status === 'disconnected' && 'text-gray-500'
          )} />
          <div>
            <h2 className="font-semibold">MQTT Connection</h2>
            <p className="text-sm text-gray-400">
              {status === 'connected' && 'Connected to broker'}
              {status === 'connecting' && 'Connecting...'}
              {status === 'error' && 'Connection failed'}
              {status === 'disconnected' && 'Not connected'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={status === 'connected' ? onDisconnect : onConnect}
            className={clsx(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              status === 'connected' 
                ? "bg-red-500 hover:bg-red-600" 
                : "bg-blue-500 hover:bg-blue-600"
            )}
          >
            {status === 'connected' ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>

      {isConfigOpen && (
        <div className="mt-4 space-y-3 border-t border-gray-700 pt-4">
          <div>
            <label className="text-sm text-gray-400">Host</label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => onConfigChange({ ...config, host: e.target.value })}
              className="mt-1 w-full bg-gray-700 rounded px-3 py-2 text-sm"
              placeholder="localhost"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Port</label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => onConfigChange({ ...config, port: parseInt(e.target.value, 10) })}
              className="mt-1 w-full bg-gray-700 rounded px-3 py-2 text-sm"
              placeholder="1883"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Username (optional)</label>
            <input
              type="text"
              value={config.username || ''}
              onChange={(e) => onConfigChange({ ...config, username: e.target.value })}
              className="mt-1 w-full bg-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Password (optional)</label>
            <input
              type="password"
              value={config.password || ''}
              onChange={(e) => onConfigChange({ ...config, password: e.target.value })}
              className="mt-1 w-full bg-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}