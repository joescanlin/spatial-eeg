import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPatient, fetchSessions, fetchAggregatedMetrics } from '../api/ptApi';

export default function PatientReport() {
  const { id } = useParams<{ id: string }>();
  const [dark, setDark] = useState(true);

  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => fetchPatient(id!),
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions', id],
    queryFn: () => fetchSessions(id!),
  });

  const { data: metrics = [], isLoading: loadingMetrics } = useQuery({
    queryKey: ['metrics', id],
    queryFn: async () => {
      const sess = await fetchSessions(id!);
      return Promise.all(sess.map((s: any) => fetchAggregatedMetrics(s.id)));
    },
    enabled: sessions.length > 0,
  });

  if (loadingPatient || loadingSessions || loadingMetrics) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className={dark ? 'dark min-h-screen bg-gray-900 text-white' : 'min-h-screen bg-gray-50 text-gray-900'}>
      <div className="p-4 space-y-6">
        <div className="flex justify-between items-center">
          <Link to="/" className="underline text-blue-500 dark:text-blue-300">Back</Link>
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
      </div>
    </div>
  );
}

