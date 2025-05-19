import axios from 'axios';
import { getSettings } from '../../utils/config'; // if exists

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((cfg) => {
  cfg.headers.Authorization = `Bearer ${localStorage.getItem('jwt') || ''}`;
  return cfg;
});

export const ptLogin = async (email: string, password: string): Promise<string> => {
  const { data } = await api.post('/auth/login', { email, password });
  return data.access_token;
};

export const fetchPatients = () => api.get('/patients').then((r) => r.data);
export const fetchPatientMetrics = (id: string | number) =>
  api.get(`/patients/${id}/metrics`).then((r) => r.data);
export const startSession = (patientId: string | number, activity: string) =>
  api.post('/sessions', { patient_id: patientId, activity });
export const fetchSessions = (patientId: string | number) =>
  api.get(`/patients/${patientId}/sessions`).then((r) => r.data); 