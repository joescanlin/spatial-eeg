// EEG Raw Data (128 Hz stream)
export interface EEGData {
  t_epoch: number;
  vals: number[];        // Raw EEG values for each channel
  labels: string[];      // Channel labels: AF3, AF4, T7, T8, Pz
}

// Performance Metrics (8 Hz stream)
export interface PerformanceMetrics {
  timestamp: number;
  engagement: number;    // 0-1: Focus/engagement level
  excitement: number;    // 0-1: Excitement level
  lexical: number;       // 0-1: Language processing
  stress: number;        // 0-1: Stress/frustration level
  relaxation: number;    // 0-1: Relaxation level
  interest: number;      // 0-1: Interest level
  focus: number;         // 0-1: Focus/attention level
}

// Band Power (8 Hz stream)
export interface BandPower {
  timestamp: number;
  channels: {
    [channel: string]: {  // AF3, AF4, T7, T8, Pz
      theta: number;      // 4-8 Hz: Memory encoding, drowsiness
      alpha: number;      // 8-12 Hz: Relaxed alertness
      betaL: number;      // 12-16 Hz: Active thinking (low)
      betaH: number;      // 16-25 Hz: Active thinking (high), anxiety
      gamma: number;      // 25-45 Hz: High-level processing
    };
  };
}

// Motion Data (64 Hz stream)
export interface MotionData {
  timestamp: number;
  gyro: {
    x: number;
    y: number;
    z: number;
  };
  accel: {
    x: number;
    y: number;
    z: number;
  };
  mag: {
    x: number;
    y: number;
    z: number;
  };
}

// Contact Quality (2 Hz stream)
export interface ContactQuality {
  timestamp: number;
  quality: {
    [channel: string]: number;  // 0-4 scale (0=no signal, 4=excellent)
  };
}

// Device Info (2 Hz stream)
export interface DeviceInfo {
  timestamp: number;
  battery: number;           // Battery percentage
  signalStrength: number;    // Wireless signal strength
}

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

  // EEG Data Streams (all optional until Cortex is connected)
  eeg?: EEGData | null;                          // Raw EEG (128 Hz)
  metrics?: PerformanceMetrics | null;           // Cognitive metrics (8 Hz)
  bandPower?: BandPower | null;                  // Band power (8 Hz)
  motion?: MotionData | null;                    // Head motion (64 Hz)
  contactQuality?: ContactQuality | null;        // Sensor quality (2 Hz)
  deviceInfo?: DeviceInfo | null;                // Battery, signal (2 Hz)
}

export interface GridStats {
  frameRate: number;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'simulated';
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