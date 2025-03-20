import { MQTTConfig } from '../types/connection';

export async function checkMQTTStatus(): Promise<{ connected: boolean; error?: string }> {
  try {
    const response = await fetch('/api/mqtt/status');
    if (!response.ok) {
      throw new Error('Failed to fetch MQTT status');
    }
    const data = await response.json();
    return {
      connected: data.connected,
      error: data.error
    };
  } catch (error) {
    console.error('Failed to check MQTT status:', error);
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Failed to check MQTT status'
    };
  }
}

export async function connectMQTT(config: MQTTConfig): Promise<void> {
  const response = await fetch('/api/mqtt/connect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Failed to connect to MQTT broker' }));
    throw new Error(data.error || 'Failed to connect to MQTT broker');
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
}

export async function disconnectMQTT(): Promise<void> {
  const response = await fetch('/api/mqtt/disconnect', {
    method: 'POST',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Failed to disconnect from MQTT broker' }));
    throw new Error(data.error || 'Failed to disconnect from MQTT broker');
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
}