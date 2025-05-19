import { useState, useEffect, useCallback } from 'react';
import { useDataStream } from './useDataStream';
import { usePTStream } from './usePTStream';
import { availableMetrics, PTMetricDefinition } from '../components/PTMetricSelector';

// Patient interface 
interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  diagnosis: string;
  sessions_count: number;
  last_visit: string;
}

// Session metrics interface
interface SessionMetrics {
  timestamp: string;
  duration: number; // in seconds
  
  // Standard metrics
  balanceScore: number;
  stabilityIndex: number;
  weightShiftQuality: number;
  rangeOfMotion: number;
  
  // New metric: Cadence
  cadence: number;      // steps per minute
  
  // New metric: Stance Time
  leftStanceTimeMs: number;  // left foot stance time in ms
  rightStanceTimeMs: number; // right foot stance time in ms
  stanceTimeAsymmetry: number; // percentage of asymmetry
  
  // New metric: Step-Length Symmetry Index
  leftStepLength: number;    // left step length
  rightStepLength: number;   // right step length
  stepLengthSymmetry: number; // symmetry percentage (0-100%)
  
  // New metric: Gait Variability (Cadence CV)
  cadenceVariability: number; // coefficient of variation as percentage
  
  // Other metrics
  symmetry: number;
  
  // Status indicators for each metric
  metricStatus: {
    [key: string]: 'normal' | 'low' | 'high' | 'none';
  };
}

interface SessionData {
  id?: string; // Will be assigned by the backend
  patientId: number;
  startTime: string;
  endTime: string | null;
  duration: number; // in seconds
  metrics: SessionMetrics[];
  notes: string;
  selectedMetrics: string[]; // IDs of selected metrics
}

export function usePTSession() {
  // Get data from other hooks
  const { gridData } = useDataStream();
  const { ptMetrics } = usePTStream();
  
  // Session state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0); // in seconds
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track heel strikes for cadence computation
  const [heelStrikeCount, setHeelStrikeCount] = useState(0);
  const [lastHeelStrikeTime, setLastHeelStrikeTime] = useState<number | null>(null);
  const [cadenceValue, setCadenceValue] = useState(0);
  
  // Track foot contact for stance time computation
  const [leftFootContact, setLeftFootContact] = useState<boolean>(false);
  const [rightFootContact, setRightFootContact] = useState<boolean>(false);
  const [leftFootContactStart, setLeftFootContactStart] = useState<number | null>(null);
  const [rightFootContactStart, setRightFootContactStart] = useState<number | null>(null);
  const [leftStanceTimeMs, setLeftStanceTimeMs] = useState<number>(0);
  const [rightStanceTimeMs, setRightStanceTimeMs] = useState<number>(0);
  const [stanceTimeAsymmetry, setStanceTimeAsymmetry] = useState<number>(0);
  
  // Track step length for symmetry computation
  const [leftStepLength, setLeftStepLength] = useState<number>(0);
  const [rightStepLength, setRightStepLength] = useState<number>(0);
  const [stepLengthSymmetry, setStepLengthSymmetry] = useState<number>(0);
  
  // Track cadence values for variability computation
  const [cadenceValues, setCadenceValues] = useState<number[]>([]);
  const [cadenceVariability, setCadenceVariability] = useState<number>(0);
  
  // Track selected metrics
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(
    availableMetrics.filter(metric => metric.defaultEnabled).map(metric => metric.id)
  );
  
  // Toggle a metric selection
  const toggleMetric = useCallback((metricId: string) => {
    if (isSessionActive) return; // Don't allow changes during session
    
    setSelectedMetrics(prev => {
      if (prev.includes(metricId)) {
        return prev.filter(id => id !== metricId);
      } else {
        return [...prev, metricId];
      }
    });
  }, [isSessionActive]);
  
  // Get metric definition by ID
  const getMetricById = useCallback((metricId: string): PTMetricDefinition | undefined => {
    return availableMetrics.find(metric => metric.id === metricId);
  }, []);
  
  // Determine metric status based on thresholds
  const getMetricStatus = useCallback((metricId: string, value: number): 'normal' | 'low' | 'high' | 'none' => {
    const metric = getMetricById(metricId);
    if (!metric) return 'none';
    
    const { thresholds } = metric;
    
    if (thresholds.low && value < thresholds.low) {
      return 'low';
    }
    
    if (thresholds.high && value > thresholds.high) {
      return 'high';
    }
    
    return 'normal';
  }, [getMetricById]);
  
  // Interval for updating session duration
  useEffect(() => {
    let interval: number | null = null;
    
    if (isSessionActive && sessionStart) {
      interval = window.setInterval(() => {
        const now = new Date();
        const durationInSeconds = Math.floor((now.getTime() - sessionStart.getTime()) / 1000);
        setSessionDuration(durationInSeconds);
      }, 1000);
    }
    
    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [isSessionActive, sessionStart]);
  
  // Effect for detecting heel strikes and calculating cadence
  useEffect(() => {
    if (!isSessionActive || !selectedMetrics.includes('cadence')) return;
    
    // This threshold would be calibrated based on actual sensor data
    const PRESSURE_THRESHOLD = 0.2; // Lower threshold to detect more heel strikes
    
    // Get the current frame data
    const currentFrame = gridData.frame;
    const now = Date.now();
    
    // In a real implementation, we would analyze the frame data
    // to detect heel strikes based on pressure patterns
    
    // For demonstration, let's improve heel strikes detection
    // by checking if any values in the bottom third of the grid exceed the threshold
    const bottomThird = currentFrame.slice(Math.floor(currentFrame.length * 2/3));
    const hasHeelStrike = bottomThird.some(row => 
      row.some(cell => cell > PRESSURE_THRESHOLD)
    );
    
    // To avoid multiple detections of the same heel strike,
    // we require a minimum time between strikes (e.g., 200ms)
    if (hasHeelStrike && (!lastHeelStrikeTime || now - lastHeelStrikeTime > 200)) {
      setHeelStrikeCount(prev => prev + 1);
      setLastHeelStrikeTime(now);
      
      // Calculate cadence: steps per minute = (step count / time in minutes)
      if (sessionDuration > 0) {
        const stepsPerMinute = Math.round((heelStrikeCount / (sessionDuration / 60)));
        setCadenceValue(stepsPerMinute);
      }
    }
  }, [gridData, isSessionActive, selectedMetrics, lastHeelStrikeTime, heelStrikeCount, sessionDuration]);
  
  // Effect for detecting foot contact and calculating stance time
  useEffect(() => {
    if (!isSessionActive || !selectedMetrics.includes('stanceTime')) return;
    
    // Get the current frame data
    const currentFrame = gridData.frame;
    const now = Date.now();
    
    // In a real implementation, we would use more sophisticated detection
    // of left and right foot contact. For this simulation, we'll simplify:
    
    // Assume left foot is detected in left half of the grid
    const leftHalf = currentFrame.map(row => row.slice(0, Math.floor(row.length / 2)));
    const leftPressure = leftHalf.flat().reduce((sum, value) => sum + value, 0);
    const isLeftFootContact = leftPressure > 0.5; // Lower threshold for better detection
    
    // Assume right foot is detected in right half of the grid 
    const rightHalf = currentFrame.map(row => row.slice(Math.floor(row.length / 2)));
    const rightPressure = rightHalf.flat().reduce((sum, value) => sum + value, 0);
    const isRightFootContact = rightPressure > 0.5; // Lower threshold for better detection
    
    // Track left foot stance time
    if (isLeftFootContact && !leftFootContact) {
      // Left foot just made contact
      setLeftFootContact(true);
      setLeftFootContactStart(now);
    } else if (!isLeftFootContact && leftFootContact && leftFootContactStart) {
      // Left foot just lifted off
      const contactDuration = now - leftFootContactStart;
      setLeftStanceTimeMs(contactDuration);
      setLeftFootContact(false);
      setLeftFootContactStart(null);
    }
    
    // Track right foot stance time
    if (isRightFootContact && !rightFootContact) {
      // Right foot just made contact
      setRightFootContact(true);
      setRightFootContactStart(now);
    } else if (!isRightFootContact && rightFootContact && rightFootContactStart) {
      // Right foot just lifted off
      const contactDuration = now - rightFootContactStart;
      setRightStanceTimeMs(contactDuration);
      setRightFootContact(false);
      setRightFootContactStart(null);
    }
    
    // Calculate asymmetry percentage if both feet have recorded stance times
    if (leftStanceTimeMs > 0 && rightStanceTimeMs > 0) {
      const longerTime = Math.max(leftStanceTimeMs, rightStanceTimeMs);
      const shorterTime = Math.min(leftStanceTimeMs, rightStanceTimeMs);
      const asymmetryPercent = ((longerTime - shorterTime) / shorterTime) * 100;
      setStanceTimeAsymmetry(asymmetryPercent);
    }
  }, [gridData, isSessionActive, selectedMetrics, leftFootContact, rightFootContact, leftFootContactStart, rightFootContactStart]);
  
  // Effect for detecting step length and calculating step length symmetry
  useEffect(() => {
    if (!isSessionActive || !selectedMetrics.includes('stepLengthSymmetry')) return;
    
    // Get the current frame data
    const currentFrame = gridData.frame;
    
    // In a real implementation, we would use more sophisticated detection
    // of step length based on consecutive foot positions during gait.
    // For this simulation, we'll create a simplified approach:
    
    // Simulate detection of step lengths based on grid data
    // This is a simplified example; in reality, would require more sophisticated algorithms
    const simulatedLeftStep = 25 + (Math.random() * 5);  // Left step length in centimeters (simulated)
    const simulatedRightStep = 25 + (Math.random() * 5); // Right step length in centimeters (simulated)
    
    // In an actual implementation, would track position data over time
    // then calculate step length based on detected positions
    
    // Update step length values more frequently to show real-time changes
    if (Math.random() > 0.3) { // Increased probability of updates (was 0.7)
      setLeftStepLength(simulatedLeftStep);
      setRightStepLength(simulatedRightStep);
      
      // Calculate symmetry index: 
      // |Left - Right| / ((Left + Right)/2) * 100%
      // A perfectly symmetrical gait would be 0%
      // Higher values indicate increasing asymmetry
      const avgStepLength = (simulatedLeftStep + simulatedRightStep) / 2;
      const asymmetryValue = Math.abs(simulatedLeftStep - simulatedRightStep) / avgStepLength * 100;
      
      // Convert to symmetry value (100% - asymmetry%)
      // 100% means perfect symmetry, 0% means complete asymmetry
      const symmetryValue = Math.max(0, 100 - asymmetryValue);
      setStepLengthSymmetry(symmetryValue);
    }
  }, [gridData, isSessionActive, selectedMetrics]);
  
  // Effect for calculating cadence variability
  useEffect(() => {
    if (!isSessionActive || !selectedMetrics.includes('gaitVariability')) return;
    
    // Add current cadence value to our tracking array
    // We only want to add new values when they change significantly
    if (cadenceValue > 0) {
      setCadenceValues(prev => {
        const newValues = [...prev, cadenceValue];
        // Keep a reasonable number of values (e.g., last 20)
        if (newValues.length > 20) {
          return newValues.slice(newValues.length - 20);
        }
        return newValues;
      });
    }
    
    // Calculate CV if we have enough data points (at least 5)
    if (cadenceValues.length >= 5) {
      // Calculate mean
      const mean = cadenceValues.reduce((sum, val) => sum + val, 0) / cadenceValues.length;
      
      // Calculate standard deviation
      const squaredDiffs = cadenceValues.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / cadenceValues.length;
      const stdDev = Math.sqrt(variance);
      
      // Calculate coefficient of variation (CV) as a percentage
      const cv = (stdDev / mean) * 100;
      setCadenceVariability(cv);
    }
  }, [isSessionActive, selectedMetrics, cadenceValue, cadenceValues]);
  
  // Collect metrics at regular intervals during active session
  useEffect(() => {
    let interval: number | null = null;
    let bufferMetrics: SessionMetrics[] = [];
    
    if (isSessionActive && sessionId) {
      console.log("Session is active! Starting metrics collection, sessionId:", sessionId);
      
      // Collect metrics more frequently (every 1 second instead of 5)
      interval = window.setInterval(() => {
        console.log("Collecting metrics for active session...", {
          cadence: cadenceValue,
          stanceTime: stanceTimeAsymmetry,
          stepLengthSymmetry,
          duration: sessionDuration,
          metricsCount: sessionMetrics.length
        });
        
        // Get the current cadence value based on heel strikes
        const currentCadence = cadenceValue || 105 + Math.random() * 10; // Fall back to random data if no real data
        
        // Create the metrics object with all possible metrics
        const newMetric: SessionMetrics = {
          timestamp: new Date().toISOString(),
          duration: sessionDuration,
          
          // Standard metrics from PT stream
          balanceScore: ptMetrics.balanceScore,
          stabilityIndex: ptMetrics.stabilityIndex,
          weightShiftQuality: ptMetrics.weightShiftQuality,
          rangeOfMotion: ptMetrics.rangeOfMotion,
          
          // New metric: cadence (from our heel strike detection)
          cadence: currentCadence,
          
          // New metric: stance time (from foot contact detection)
          leftStanceTimeMs: leftStanceTimeMs || 550 + Math.random() * 50,
          rightStanceTimeMs: rightStanceTimeMs || 550 + Math.random() * 50,
          stanceTimeAsymmetry: stanceTimeAsymmetry || 5 + Math.random() * 5,
          
          // New metric: step-length symmetry index
          leftStepLength: leftStepLength || 25 + Math.random() * 5,
          rightStepLength: rightStepLength || 25 + Math.random() * 5,
          stepLengthSymmetry: stepLengthSymmetry || 90 + Math.random() * 5,
          
          // New metric: Gait Variability (Cadence CV)
          cadenceVariability: cadenceVariability || 2 + Math.random() * 2,
          
          // Other metrics
          symmetry: gridData.gaitMetrics.symmetryScore * 100, // Convert to percentage
          
          // Status indicators
          metricStatus: {
            cadence: getMetricStatus('cadence', currentCadence),
            stanceTime: stanceTimeAsymmetry > 10 ? 'high' : 'normal',
            stepLengthSymmetry: stepLengthSymmetry < 85 ? 'high' : 'normal', // Asymmetry > 15% (symmetry < 85%) triggers high flag
            gaitVariability: cadenceVariability > 4 ? 'high' : 'normal', // CV > 4% is risky in older adults
            // Add other metrics status as they are implemented
            balanceScore: 'normal',
            stabilityIndex: 'normal',
            weightShiftQuality: 'normal',
            rangeOfMotion: 'normal',
            symmetry: 'normal'
          }
        };
        
        // Add to local state
        setSessionMetrics(prev => {
          const newMetrics = [...prev, newMetric];
          console.log(`Adding new metric to session. Total metrics: ${newMetrics.length}`);
          return newMetrics;
        });
        
        // Add to buffer for API upload
        bufferMetrics.push(newMetric);
        
        // If we have enough metrics in the buffer, send them to the API
        if (bufferMetrics.length >= 5) {
          // Send metrics to API
          sendMetricsToAPI(sessionId, [...bufferMetrics])
            .then(() => {
              // Clear buffer after successful send
              console.log("Successfully sent metrics batch to API");
              bufferMetrics = [];
            })
            .catch(err => {
              console.error('Failed to send metrics to API:', err);
              // Keep metrics in buffer to try again
            });
        }
      }, 1000); // Every 1 second instead of 5
    } else {
      console.log("Session is not active or missing sessionId", { isSessionActive, sessionId });
    }
    
    return () => {
      if (interval !== null) {
        clearInterval(interval);
        console.log("Cleared metrics collection interval");
      }
      
      // If there are any metrics left in the buffer when unmounting, send them
      if (sessionId && bufferMetrics.length > 0) {
        sendMetricsToAPI(sessionId, bufferMetrics).catch(err => {
          console.error('Failed to send final metrics batch to API:', err);
        });
      }
    };
  }, [
    isSessionActive, 
    sessionDuration, 
    ptMetrics, 
    gridData, 
    sessionId, 
    cadenceValue, 
    leftStanceTimeMs,
    rightStanceTimeMs,
    stanceTimeAsymmetry,
    leftStepLength,
    rightStepLength,
    stepLengthSymmetry,
    cadenceVariability,
    getMetricStatus
  ]);
  
  // Helper function to send metrics to API
  const sendMetricsToAPI = async (id: string, metrics: SessionMetrics[]) => {
    try {
      const response = await fetch(`/api/pt-sessions/${id}/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metrics)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error sending metrics to API:', error);
      throw error;
    }
  };
  
  // Select patient handler
  const selectPatient = useCallback((patient: Patient | null) => {
    if (!isSessionActive) {
      setSelectedPatient(patient);
    }
  }, [isSessionActive]);
  
  // Open modal to select a patient
  const openPatientSelection = useCallback(() => {
    if (!isSessionActive) {
      setIsModalOpen(true);
    }
  }, [isSessionActive]);
  
  // Close patient selection modal
  const closePatientSelection = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  
  // Start session
  const startSession = useCallback(async () => {
    if (selectedPatient && !isSessionActive) {
      setIsLoading(true);
      setError(null);
      
      try {
        const startTime = new Date();
        
        // Create session in API
        const response = await fetch('/api/pt-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            patientId: selectedPatient.id,
            startTime: startTime.toISOString(),
            selectedMetrics: selectedMetrics
          })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Set session data
        setSessionId(data.id);
        setSessionStart(startTime);
        setIsSessionActive(true);
        setSessionMetrics([]);
        setSessionNotes('');
        setHeelStrikeCount(0);
        setLastHeelStrikeTime(null);
        setCadenceValue(0);
        setLeftFootContact(false);
        setRightFootContact(false);
        setLeftFootContactStart(null);
        setRightFootContactStart(null);
        setLeftStanceTimeMs(0);
        setRightStanceTimeMs(0);
        setStanceTimeAsymmetry(0);
        setLeftStepLength(0);
        setRightStepLength(0);
        setStepLengthSymmetry(0);
        setCadenceValues([]);
        setCadenceVariability(0);
        
        console.log(`Starting PT session with patient ${selectedPatient.first_name} ${selectedPatient.last_name}`);
      } catch (error) {
        console.error('Error starting session:', error);
        setError('Failed to start session. Please try again.');
        return;
      } finally {
        setIsLoading(false);
      }
    }
  }, [selectedPatient, isSessionActive, selectedMetrics]);
  
  // End session
  const endSession = useCallback(async () => {
    if (isSessionActive && selectedPatient && sessionStart && sessionId) {
      setIsLoading(true);
      setError(null);
      
      try {
        const endTime = new Date();
        const durationInSeconds = Math.floor((endTime.getTime() - sessionStart.getTime()) / 1000);
        
        // Create session data object
        const sessionData: SessionData = {
          patientId: selectedPatient.id,
          startTime: sessionStart.toISOString(),
          endTime: endTime.toISOString(),
          duration: durationInSeconds,
          metrics: sessionMetrics,
          notes: sessionNotes,
          selectedMetrics: selectedMetrics
        };
        
        console.log("Saving session data:", sessionData);
        
        // Update session in API
        const response = await fetch(`/api/pt-sessions/${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            endTime: endTime.toISOString(),
            duration: durationInSeconds,
            notes: sessionNotes,
            selectedMetrics: selectedMetrics,
            metrics: sessionMetrics // Explicitly include metrics in API call
          })
        });
        
        if (!response.ok) {
          console.warn('API error, falling back to local storage:', response.statusText);
          
          // Store session in localStorage as a fallback for demo purposes
          try {
            // Get existing sessions
            const existingSessions = JSON.parse(localStorage.getItem('pt-sessions') || '[]');
            
            // Add new session
            existingSessions.push({
              ...sessionData,
              id: sessionId,
              savedAt: new Date().toISOString()
            });
            
            // Save back to localStorage
            localStorage.setItem('pt-sessions', JSON.stringify(existingSessions));
            console.log('Session saved to localStorage as fallback');
          } catch (storageError) {
            console.error('Error saving to localStorage:', storageError);
          }
        } else {
          const responseData = await response.json();
          console.log('Session saved successfully:', responseData);
          
          // Also update local storage for demo purposes
          try {
            const existingSessions = JSON.parse(localStorage.getItem('pt-sessions') || '[]');
            
            // Create a complete session object with metrics
            const completeSession = {
              ...sessionData,
              id: sessionId,
              savedAt: new Date().toISOString(),
              metrics: [...sessionMetrics] // Ensure metrics are included and cloned
            };
            
            console.log('Saving complete session to localStorage with metrics count:', 
                        Array.isArray(completeSession.metrics) ? completeSession.metrics.length : 0);
            
            // Add to existing sessions
            existingSessions.push(completeSession);
            localStorage.setItem('pt-sessions', JSON.stringify(existingSessions));
            
            console.log('Session with metrics saved to localStorage');
          } catch (storageError) {
            console.error('Error updating localStorage:', storageError);
          }
        }
        
        // Reset session state
        setIsSessionActive(false);
        setSessionStart(null);
        setSessionDuration(0);
        setSessionId(null);
        setHeelStrikeCount(0);
        setLastHeelStrikeTime(null);
        setLeftFootContact(false);
        setRightFootContact(false);
        setLeftFootContactStart(null);
        setRightFootContactStart(null);
        setLeftStanceTimeMs(0);
        setRightStanceTimeMs(0);
        setStanceTimeAsymmetry(0);
        setLeftStepLength(0);
        setRightStepLength(0);
        setStepLengthSymmetry(0);
        setCadenceValues([]);
        setCadenceVariability(0);
        
        // Update patient's session count and last visit (would be handled by the backend)
        setSelectedPatient(prev => {
          if (!prev) return null;
          return {
            ...prev,
            sessions_count: prev.sessions_count + 1,
            last_visit: new Date().toISOString().split('T')[0] // YYYY-MM-DD
          };
        });
        
        // Track successful completion for analytics
        console.log('Session ended and saved successfully');
        
        // Show success alert
        window.alert("Session completed and saved successfully. You can view this session in the patient's history.");
        
      } catch (error) {
        console.error('Error ending session:', error);
        setError('Failed to end session. Your data has been saved locally.');
        
        // Try to save to localStorage as a fallback
        try {
          const sessionData = {
            id: sessionId,
            patientId: selectedPatient.id,
            startTime: sessionStart.toISOString(),
            endTime: new Date().toISOString(),
            duration: sessionDuration,
            metrics: [...sessionMetrics], // Make sure to clone the array
            notes: sessionNotes,
            selectedMetrics: selectedMetrics,
            savedAt: new Date().toISOString(),
            isLocalOnly: true
          };
          
          // Log for debugging
          console.log('Saving session with metrics count:', sessionMetrics.length);
          
          // Get existing sessions
          const existingSessions = JSON.parse(localStorage.getItem('pt-sessions') || '[]');
          existingSessions.push(sessionData);
          localStorage.setItem('pt-sessions', JSON.stringify(existingSessions));
          console.log('Session saved to localStorage as fallback after error');
          
          // Show warning alert
          window.alert("Couldn't connect to server. Session has been saved locally.");
        } catch (storageError) {
          console.error('Error saving to localStorage:', storageError);
        }
      } finally {
        setIsLoading(false);
      }
    }
  }, [isSessionActive, selectedPatient, sessionStart, sessionId, sessionMetrics, sessionNotes, selectedMetrics, sessionDuration]);
  
  // Update session notes
  const updateSessionNotes = useCallback((notes: string) => {
    setSessionNotes(notes);
  }, []);
  
  // Get stance time data for display
  const getStanceTimeData = useCallback(() => {
    return {
      leftFootMs: leftStanceTimeMs,
      rightFootMs: rightStanceTimeMs,
      asymmetryPercent: stanceTimeAsymmetry
    };
  }, [leftStanceTimeMs, rightStanceTimeMs, stanceTimeAsymmetry]);
  
  // Get step length symmetry data for display
  const getStepLengthSymmetryData = useCallback(() => {
    return {
      leftStepLength: leftStepLength,
      rightStepLength: rightStepLength,
      symmetryPercent: stepLengthSymmetry,
      asymmetryPercent: Math.max(0, 100 - stepLengthSymmetry)
    };
  }, [leftStepLength, rightStepLength, stepLengthSymmetry]);
  
  // Get cadence variability data for display
  const getCadenceVariabilityData = useCallback(() => {
    return {
      coefficientOfVariation: cadenceVariability,
      dataPoints: cadenceValues.length,
      isReliable: cadenceValues.length >= 5,
      mean: cadenceValues.length > 0 ? 
        cadenceValues.reduce((sum, val) => sum + val, 0) / cadenceValues.length : 0
    };
  }, [cadenceVariability, cadenceValues]);
  
  return {
    selectedPatient,
    isSessionActive,
    sessionDuration,
    sessionNotes,
    sessionMetrics,
    selectedMetrics,
    isModalOpen,
    isLoading,
    error,
    selectPatient,
    openPatientSelection,
    closePatientSelection,
    startSession,
    endSession,
    updateSessionNotes,
    toggleMetric,
    availableMetrics,
    stanceTimeData: getStanceTimeData(),
    stepLengthSymmetryData: getStepLengthSymmetryData(),
    cadenceVariabilityData: getCadenceVariabilityData()
  };
} 