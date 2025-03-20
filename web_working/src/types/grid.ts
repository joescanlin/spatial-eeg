export interface GridData {
  frame: number[][];
  timestamp: string;
  decibelLevel: number;
  gaitMetrics: GaitMetrics;
  wanderingMetrics: WanderingMetrics;
  balanceMetrics: BalanceMetrics;
  fallProbability: number;
  fallDetected: boolean;
  alertConfig: AlertConfig;
  alerts: Alert[];
}

export interface GridStats {
  frameRate: number;
  connectionStatus: 'connected' | 'disconnected';
  lastUpdate: string;
  activeSensors: number;  // number of currently active sensors
}

export interface GaitMetrics {
  speed: number;           // feet per second
  strideLength: number;    // feet
  symmetryScore: number;   // 0-1 score
  stepCount: number;       // total steps
}

export interface WanderingMetrics {
  pathLength: number;      // total distance in feet
  areaCovered: number;     // percentage of area covered
  directionChanges: number; // number of significant direction changes
  repetitiveScore: number;  // 0-1 score for repetitive patterns
}

export interface BalanceMetrics {
  stabilityScore: number;
  swayArea: number;
  weightDistribution: number;  // percentage
  copMovement: number;        // center of pressure movement in inches/second
}

export interface AlertConfig {
  enabled: boolean;
  confidenceThreshold: number;
  cooldownPeriod: number;
  messageTemplate: string;
  phoneNumbers: string[];
}

export interface Alert {
  id: string;
  timestamp: string;
  confidence: number;
  status: 'sent' | 'failed';
  message: string;
}