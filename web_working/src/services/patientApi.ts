/**
 * Patient API Service
 * Handles all patient and session-related API operations
 */

const API_BASE_URL = '/api';

export interface Patient {
  id: number;
  clinic_id: number;
  first_name: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  age?: number;
  height_cm?: number;
  dx_icd10?: string;
  diagnosis?: string; // Computed field for backward compatibility
  notes?: string;
  created_at?: string;
  updated_at?: string;
  sessions_count: number;
  last_visit?: string;
}

export interface PatientCreateData {
  clinic_id: number;
  first_name: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  height_cm?: number;
  dx_icd10?: string;
  notes?: string;
}

export interface Session {
  id: number;
  patient_id: number;
  activity: 'gait' | 'balance' | 'stsit' | 'mixed';
  start_ts: string;
  end_ts?: string;
  session_notes?: string;
  selected_metrics?: string[];
  ai_summary?: string;
  duration_seconds?: number;
  metric_count?: number;
  avg_cadence?: number;
  avg_symmetry?: number;
}

export interface SessionCreateData {
  patient_id: number;
  activity: 'gait' | 'balance' | 'stsit' | 'mixed';
  session_notes?: string;
  selected_metrics?: string[];
}

export interface SessionUpdateData {
  end_ts?: string;
  session_notes?: string;
  selected_metrics?: string[];
  ai_summary?: string;
}

export interface MetricData {
  session_id: number;
  ts: string;
  cadence_spm?: number;
  stride_len_in?: number;
  cadence_cv_pct?: number;
  symmetry_idx_pct?: number;
  dbl_support_pct?: number;
  left_stance_time_ms?: number;
  right_stance_time_ms?: number;
  stance_time_asymmetry_pct?: number;
  left_step_length_cm?: number;
  right_step_length_cm?: number;
  step_length_symmetry_pct?: number;
  gait_variability_cv_pct?: number;
  sway_path_cm?: number;
  sway_vel_cm_s?: number;
  sway_area_cm2?: number;
  cop_area_cm2?: number;
  stability_score?: number;
  weight_shift_quality?: number;
  left_pct?: number;
  right_pct?: number;
  ant_pct?: number;
  post_pct?: number;
  active_area_pct?: number;
  turn_count?: number;
  avg_turn_angle_deg?: number;
  sts_reps?: number;
  sts_avg_time_s?: number;
  exercise_completion_pct?: number;
  range_of_motion_deg?: number;
  metric_status?: Record<string, string>;
}

class PatientApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'PatientApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorDetails = null;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
        errorDetails = errorData;
      } catch {
        // If we can't parse error response, use default message
      }
      
      throw new PatientApiError(errorMessage, response.status, errorDetails);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof PatientApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new PatientApiError(
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }
}

export const patientApi = {
  // Patient Management
  async getPatients(clinicId?: number): Promise<Patient[]> {
    const params = new URLSearchParams();
    if (clinicId) {
      params.append('clinic_id', clinicId.toString());
    }
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<Patient[]>(`/patients${query}`);
  },

  async getPatient(patientId: number): Promise<Patient> {
    return apiRequest<Patient>(`/patients/${patientId}`);
  },

  async createPatient(patientData: PatientCreateData): Promise<Patient> {
    return apiRequest<Patient>('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  },

  async updatePatient(patientId: number, patientData: Partial<PatientCreateData>): Promise<Patient> {
    return apiRequest<Patient>(`/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify(patientData),
    });
  },

  async deletePatient(patientId: number): Promise<void> {
    return apiRequest<void>(`/patients/${patientId}`, {
      method: 'DELETE',
    });
  },

  // Session Management
  async createSession(sessionData: SessionCreateData): Promise<Session> {
    return apiRequest<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },

  async getSession(sessionId: number): Promise<Session> {
    return apiRequest<Session>(`/sessions/${sessionId}`);
  },

  async updateSession(sessionId: number, sessionData: SessionUpdateData): Promise<Session> {
    return apiRequest<Session>(`/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData),
    });
  },

  async endSession(sessionId: number, sessionData: SessionUpdateData): Promise<Session> {
    return apiRequest<Session>(`/sessions/${sessionId}/stop`, {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },

  async getPatientSessions(patientId: number): Promise<Session[]> {
    return apiRequest<Session[]>(`/sessions?patient_id=${patientId}`);
  },

  async getActiveSessions(): Promise<Session[]> {
    return apiRequest<Session[]>('/sessions?active_only=true');
  },

  // Metrics Management
  async createMetric(metricData: MetricData): Promise<MetricData> {
    return apiRequest<MetricData>('/metrics', {
      method: 'POST',
      body: JSON.stringify(metricData),
    });
  },

  async createMetricsBulk(sessionId: number, metrics: Partial<MetricData>[]): Promise<MetricData[]> {
    // Transform metrics to include session_id and timestamp
    const metricsWithSessionId = metrics.map(metric => ({
      ...metric,
      session_id: sessionId,
      ts: metric.ts || new Date().toISOString(),
    }));

    return apiRequest<MetricData[]>(`/sessions/${sessionId}/metrics`, {
      method: 'POST',
      body: JSON.stringify(metricsWithSessionId),
    });
  },

  async getSessionMetrics(sessionId: number, limit: number = 100): Promise<MetricData[]> {
    return apiRequest<MetricData[]>(`/metrics/session/${sessionId}?limit=${limit}`);
  },

  async getLatestSessionMetric(sessionId: number): Promise<MetricData | null> {
    return apiRequest<MetricData | null>(`/metrics/session/${sessionId}/latest`);
  },

  async getAggregatedMetrics(sessionId: number): Promise<any> {
    return apiRequest(`/metrics/session/${sessionId}/aggregated`);
  },

  // Utility functions
  async isBackendAvailable(): Promise<boolean> {
    try {
      await apiRequest('/status');
      return true;
    } catch {
      return false;
    }
  },

  // Enhanced workflow methods
  async startPatientSession(
    patientId: number,
    activity: 'gait' | 'balance' | 'stsit' | 'mixed',
    selectedMetrics: string[] = [],
    notes: string = ''
  ): Promise<Session> {
    const sessionData: SessionCreateData = {
      patient_id: patientId,
      activity,
      selected_metrics: selectedMetrics,
      session_notes: notes,
    };

    return this.createSession(sessionData);
  },

  async completePatientSession(
    sessionId: number,
    finalNotes: string = '',
    aiSummary?: string
  ): Promise<Session> {
    const sessionData: SessionUpdateData = {
      end_ts: new Date().toISOString(),
      session_notes: finalNotes,
      ai_summary: aiSummary,
    };

    return this.endSession(sessionId, sessionData);
  },

  async saveSessionMetrics(
    sessionId: number,
    metricsArray: Partial<MetricData>[]
  ): Promise<MetricData[]> {
    // Batch metrics in groups of 50 to avoid large payloads
    const batchSize = 50;
    const results: MetricData[] = [];

    for (let i = 0; i < metricsArray.length; i += batchSize) {
      const batch = metricsArray.slice(i, i + batchSize);
      const batchResults = await this.createMetricsBulk(sessionId, batch);
      results.push(...batchResults);
    }

    return results;
  },
};

export { PatientApiError };