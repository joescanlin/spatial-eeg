import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

// Mock data for patient report
const mockPatientData = {
  id: 1,
  first_name: 'John',
  last_name: 'Doe',
  dx_icd10: 'M54.5',
  height_cm: 175,
  weight_kg: 70
};

const mockSessionsData = [
  {
    id: 1,
    start_ts: '2025-05-15T14:30:00Z',
    end_ts: '2025-05-15T15:15:00Z',
    patient_id: 1
  },
  {
    id: 2,
    start_ts: '2025-05-10T10:00:00Z',
    end_ts: '2025-05-10T10:45:00Z',
    patient_id: 1
  },
  {
    id: 3,
    start_ts: '2025-05-05T16:15:00Z',
    end_ts: '2025-05-05T17:00:00Z',
    patient_id: 1
  }
];

const mockMetricsData = [
  {
    id: 1,
    start_ts: '2025-05-15T14:30:00Z',
    avg_cadence_spm: 112.5,
    avg_stride_len_in: 28.3,
    avg_symmetry_idx_pct: 92.1,
    avg_sway_vel_cm_s: 1.8,
    total_sts_reps: 12,
    total_turn_count: 8
  },
  {
    id: 2,
    start_ts: '2025-05-10T10:00:00Z',
    avg_cadence_spm: 110.2,
    avg_stride_len_in: 27.8,
    avg_symmetry_idx_pct: 89.5,
    avg_sway_vel_cm_s: 2.1,
    total_sts_reps: 10,
    total_turn_count: 6
  },
  {
    id: 3,
    start_ts: '2025-05-05T16:15:00Z',
    avg_cadence_spm: 108.7,
    avg_stride_len_in: 27.1,
    avg_symmetry_idx_pct: 87.2,
    avg_sway_vel_cm_s: 2.4,
    total_sts_reps: 8,
    total_turn_count: 5
  }
];

export default function PatientReport() {
  const { id } = useParams<{ id: string }>();
  const [dark, setDark] = useState(true);

  // For the demo, we're using mock data
  const patient = mockPatientData;
  const sessions = mockSessionsData;
  const metrics = mockMetricsData;

  return (
    <div className={dark ? 'dark min-h-screen bg-gray-900 text-white' : 'min-h-screen bg-gray-50 text-gray-900'}>
      <div className="p-4 space-y-6">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => window.history.back()} 
            className="underline text-blue-500 dark:text-blue-300"
          >
            Back
          </button>
          <button
            onClick={() => setDark(!dark)}
            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
          >
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        {patient && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{patient.first_name} {patient.last_name}</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Diagnosis</div>
                <div>{patient.dx_icd10 || '-'}</div>
              </div>
              <div>
                <div className="text-gray-400">Height</div>
                <div>{patient.height_cm ? `${patient.height_cm} cm` : '-'}</div>
              </div>
              <div>
                <div className="text-gray-400">Total Sessions</div>
                <div>{sessions.length}</div>
              </div>
              <div>
                <div className="text-gray-400">Last Visit</div>
                <div>{metrics[0]?.start_ts?.slice(0,10) || '-'}</div>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="py-2 px-2">Session</th>
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Cadence</th>
                <th className="py-2 px-2">Stride</th>
                <th className="py-2 px-2">Symmetry %</th>
                <th className="py-2 px-2">Sway Vel</th>
                <th className="py-2 px-2">STS Reps</th>
                <th className="py-2 px-2">Turns</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s: any, idx: number) => {
                const m = metrics[idx] || {};
                return (
                  <tr key={s.id} className="border-b border-gray-700/50">
                    <td className="py-2 px-2">{idx + 1}</td>
                    <td className="py-2 px-2">{m.start_ts ? m.start_ts.slice(0,10) : '-'}</td>
                    <td className="py-2 px-2">{m.avg_cadence_spm?.toFixed?.(1) ?? '-'}</td>
                    <td className="py-2 px-2">{m.avg_stride_len_in?.toFixed?.(1) ?? '-'}</td>
                    <td className="py-2 px-2">{m.avg_symmetry_idx_pct?.toFixed?.(1) ?? '-'}</td>
                    <td className="py-2 px-2">{m.avg_sway_vel_cm_s?.toFixed?.(1) ?? '-'}</td>
                    <td className="py-2 px-2">{m.total_sts_reps ?? '-'}</td>
                    <td className="py-2 px-2">{m.total_turn_count ?? '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="text-xs text-gray-400 italic">
          Demo Mode: Using mock patient data
        </div>
      </div>
    </div>
  );
} 