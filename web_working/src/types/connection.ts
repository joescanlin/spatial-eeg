export interface MQTTConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';