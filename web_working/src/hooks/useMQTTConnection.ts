import { useState, useCallback, useEffect } from 'react';
import * as mqtt from 'mqtt';
import { MQTTConfig, ConnectionStatus } from '../types/connection';

export function useMQTTConnection() {
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [config, setConfig] = useState<MQTTConfig>({
    host: '169.254.100.100',
    port: 1883
  });
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (status === 'connecting' || client) return;

    try {
      setStatus('connecting');
      setError(null);

      const url = `mqtt://${config.host}:${config.port}`;
      const mqttClient = mqtt.connect(url, {
        clientId: `web_client_${Math.random().toString(16).slice(2, 10)}`,
        username: config.username,
        password: config.password,
        keepalive: 60,
        reconnectPeriod: 5000,
      });

      mqttClient.on('connect', () => {
        setStatus('connected');
        mqttClient.subscribe([
          'controller/networkx/frame/rft',
          'analysis/path/rft/active',
          'analysis/path/rft/complete',
          'pt/metrics',
          'pt/exercise/status',
          'pt/exercise/type'
        ]);
      });

      mqttClient.on('error', (err) => {
        console.error('MQTT error:', err);
        setStatus('error');
        setError(err.message);
      });

      mqttClient.on('close', () => {
        setStatus('disconnected');
      });

      setClient(mqttClient);
    } catch (err) {
      console.error('MQTT connection error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to connect to MQTT broker');
    }
  }, [config, status, client]);

  const disconnect = useCallback(() => {
    if (client) {
      client.end();
      setClient(null);
      setStatus('disconnected');
      setError(null);
    }
  }, [client]);

  useEffect(() => {
    return () => {
      if (client) {
        client.end();
      }
    };
  }, [client]);

  return {
    config,
    status,
    error,
    setConfig,
    connect,
    disconnect,
    client
  };
}