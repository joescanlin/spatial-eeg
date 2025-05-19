import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((cfg) => {
  cfg.headers.Authorization = `Bearer ${localStorage.getItem('jwt') || ''}`;
  return cfg;
});

// Mock implementations for API functions
export const fetchPatients = () => {
  // Return mock data
  return Promise.resolve([
    { 
      id: 1, 
      first_name: 'John', 
      last_name: 'Doe', 
      diagnosis: 'Post-operative rehabilitation',
      dx_icd10: 'M54.5',
      sessions_count: 8, 
      last_visit: '2025-05-10' 
    },
    { 
      id: 2, 
      first_name: 'Jane', 
      last_name: 'Smith', 
      diagnosis: 'ACL reconstruction',
      dx_icd10: 'S83.5',
      sessions_count: 15, 
      last_visit: '2025-05-14' 
    },
    { 
      id: 3, 
      first_name: 'Robert', 
      last_name: 'Johnson', 
      diagnosis: 'Lower back pain',
      dx_icd10: 'M54.5',
      sessions_count: 5, 
      last_visit: '2025-05-07' 
    }
  ]);
};

export const fetchPatient = (id: string | number) => {
  // Return mock data for a specific patient
  return Promise.resolve({
    id: Number(id),
    first_name: 'John',
    last_name: 'Doe',
    diagnosis: 'Post-operative rehabilitation',
    dx_icd10: 'M54.5',
    height_cm: 178,
    weight_kg: 75,
    sessions_count: 8,
    last_visit: '2025-05-10'
  });
};

export const fetchSessions = (patientId: string | number) => {
  // Return mock sessions data
  return Promise.resolve([
    {
      id: 1,
      patient_id: Number(patientId),
      start_ts: '2025-05-15T14:30:00Z',
      end_ts: '2025-05-15T15:15:00Z'
    },
    {
      id: 2,
      patient_id: Number(patientId),
      start_ts: '2025-05-10T10:00:00Z',
      end_ts: '2025-05-10T10:45:00Z'
    },
    {
      id: 3,
      patient_id: Number(patientId),
      start_ts: '2025-05-05T16:15:00Z',
      end_ts: '2025-05-05T17:00:00Z'
    }
  ]);
};

export const fetchAggregatedMetrics = (sessionId: string | number) => {
  // Return mock metrics data
  return Promise.resolve({
    session_id: Number(sessionId),
    start_ts: sessionId === 1 ? '2025-05-15T14:30:00Z' :
             sessionId === 2 ? '2025-05-10T10:00:00Z' : '2025-05-05T16:15:00Z',
    avg_cadence_spm: 110 + Math.random() * 5,
    avg_stride_len_in: 27 + Math.random() * 2,
    avg_symmetry_idx_pct: 85 + Math.random() * 10,
    avg_sway_vel_cm_s: 1.5 + Math.random() * 1,
    total_sts_reps: 8 + Math.floor(Math.random() * 5),
    total_turn_count: 5 + Math.floor(Math.random() * 4)
  });
};

export const fetchPatientMetrics = (id: string | number) => {
  return Promise.resolve({
    patient_id: Number(id),
    avg_cadence: 110,
    avg_symmetry: 92,
    avg_stability: 85
  });
};

export const startSession = (patientId: string | number, activity: string) => {
  return Promise.resolve({
    id: Date.now(),
    patient_id: Number(patientId),
    activity,
    start_ts: new Date().toISOString()
  });
};

export const ptLogin = async (email: string, password: string): Promise<string> => {
  // Mock authentication
  if (email === 'demo@example.com' && password === 'demo123') {
    return 'mock-jwt-token';
  }
  throw new Error('Authentication failed');
};
