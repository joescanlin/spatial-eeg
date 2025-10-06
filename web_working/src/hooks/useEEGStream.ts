import { useState, useEffect } from "react";

const API_BASE_URL = "/api";

interface EEGSample {
  timestamp: number;
  values: number[];
  labels: string[];
}

interface PerformanceMetrics {
  engagement: number;
  excitement: number;
  lexical: number;
  stress: number;
  relaxation: number;
  interest: number;
  focus: number;
}

interface BandPower {
  [channel: string]: {
    theta: number;
    alpha: number;
    betaL: number;
    betaH: number;
    gamma: number;
  };
}

interface ContactQuality {
  timestamp: number;
  quality: {
    [channel: string]: number;
  };
}

interface EEGData {
  eeg: EEGSample | null;
  metrics: PerformanceMetrics | null;
  bandPower: BandPower | null;
  contactQuality: ContactQuality | null;
  motion: any | null;
}

interface EEGStatus {
  connected: boolean;
  authenticated: boolean;
  session_active: boolean;
  recording: boolean;
  streaming: boolean;
  headset_id: string | null;
}

export function useEEGStream() {
  const [eegData, setEEGData] = useState<EEGData>({
    eeg: null,
    metrics: null,
    bandPower: null,
    contactQuality: null,
    motion: null,
  });

  const [status, setStatus] = useState<EEGStatus>({
    connected: false,
    authenticated: false,
    session_active: false,
    recording: false,
    streaming: false,
    headset_id: null,
  });

  const [isPolling, setIsPolling] = useState(false);

  // Function to fetch EEG status
  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/eeg/status`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        return data;
      }
    } catch (error) {
      console.error("Failed to fetch EEG status:", error);
    }
    return null;
  };

  // Function to fetch latest EEG data
  const fetchLatestData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/eeg/data/latest`);
      if (response.ok) {
        const data = await response.json();

        // Transform the data to match our interface
        if (data.eeg && Array.isArray(data.eeg) && data.eeg.length === 2) {
          const [timestamp, values] = data.eeg;
          const labels = ['AF3', 'AF4', 'T7', 'T8', 'Pz'].slice(0, values.length);

          // Transform contact quality data to match expected format
          const contactQuality = data.contactQuality || data.contact_quality
            ? {
                timestamp: data.contactQuality?.timestamp || Date.now(),
                quality: data.contactQuality || data.contact_quality || {}
              }
            : null;

          // Transform band power data to match expected format
          const rawBandPower = data.bandPower || data.band_power;
          const bandPower = rawBandPower
            ? {
                timestamp: Date.now(),
                channels: rawBandPower
              }
            : null;

          setEEGData({
            eeg: {
              timestamp,
              values,
              labels,
            },
            metrics: data.metrics,
            bandPower,
            contactQuality,
            motion: data.motion,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch EEG data:", error);
    }
  };

  // Start/stop session
  const startSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/eeg/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Session started:', data);
        setIsPolling(true);
        return data;
      }
    } catch (error) {
      console.error("Failed to start session:", error);
    }
    return null;
  };

  const stopSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/eeg/session/stop`, {
        method: 'POST',
      });
      if (response.ok) {
        setIsPolling(false);
        return await response.json();
      }
    } catch (error) {
      console.error("Failed to stop session:", error);
    }
    return null;
  };

  // Start/stop recording
  const startRecording = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/eeg/recording/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `EEG Recording ${new Date().toISOString()}` }),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
    return null;
  };

  const stopRecording = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/eeg/recording/stop`, {
        method: 'POST',
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
    return null;
  };

  // Add marker
  const addMarker = async (label: string, value?: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/eeg/marker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, value }),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Failed to add marker:", error);
    }
    return null;
  };

  // Poll for data when session is active
  useEffect(() => {
    // Initial status check
    fetchStatus().then((statusData) => {
      if (statusData?.streaming) {
        setIsPolling(true);
      }
    });

    const statusInterval = setInterval(fetchStatus, 2000);
    return () => clearInterval(statusInterval);
  }, []);

  // Start polling when status.streaming becomes true
  useEffect(() => {
    if (status.streaming) {
      setIsPolling(true);
    } else {
      setIsPolling(false);
    }
  }, [status.streaming]);

  useEffect(() => {
    if (!isPolling || !status.streaming) return;

    console.log('📡 Starting EEG data polling...');
    const dataInterval = setInterval(fetchLatestData, 100); // Poll at 10Hz

    return () => {
      console.log('🛑 Stopping EEG data polling...');
      clearInterval(dataInterval);
    };
  }, [isPolling, status.streaming]);

  return {
    eegData,
    status,
    startSession,
    stopSession,
    startRecording,
    stopRecording,
    addMarker,
    fetchStatus,
  };
}
