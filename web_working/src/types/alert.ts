export interface AlertConfig {
  phoneNumbers: string[];
  enabled: boolean;
  confidenceThreshold: number;
  cooldownPeriod: number;
  messageTemplate: string;
}

export interface AlertHistory {
  id: string;
  timestamp: string;
  confidence: number;
  status: 'delivered' | 'failed';
  message: string;
  error?: string;
}