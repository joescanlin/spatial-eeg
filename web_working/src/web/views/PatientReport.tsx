import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Mock data for patient report
const mockPatientData = {
  id: 1,
  first_name: 'John',
  last_name: 'Doe',
  dx_icd10: 'M54.5',
  height_cm: 175,
  weight_kg: 70,
  surgery_date: '2025-04-01',
  insurance: 'Medicare',
};

const mockSessionsData = [
  { id: 1, start_ts: '2025-05-15T14:30:00Z', end_ts: '2025-05-15T15:15:00Z', patient_id: 1, activity: 'gait' },
  { id: 2, start_ts: '2025-05-10T10:00:00Z', end_ts: '2025-05-10T10:45:00Z', patient_id: 1, activity: 'balance' },
  { id: 3, start_ts: '2025-05-05T16:15:00Z', end_ts: '2025-05-05T17:00:00Z', patient_id: 1, activity: 'sts' },
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
    total_turn_count: 8,
  },
  {
    id: 2,
    start_ts: '2025-05-10T10:00:00Z',
    avg_cadence_spm: 110.2,
    avg_stride_len_in: 27.8,
    avg_symmetry_idx_pct: 89.5,
    avg_sway_vel_cm_s: 2.1,
    total_sts_reps: 10,
    total_turn_count: 6,
  },
  {
    id: 3,
    start_ts: '2025-05-05T16:15:00Z',
    avg_cadence_spm: 108.7,
    avg_stride_len_in: 27.1,
    avg_symmetry_idx_pct: 87.2,
    avg_sway_vel_cm_s: 2.4,
    total_sts_reps: 8,
    total_turn_count: 5,
  },
];

export default function PatientReport() {
  const { id } = useParams<{ id: string }>();
  const [dark, setDark] = useState(true);

  // For the demo, we're using mock data
  const patient = mockPatientData;
  const sessions = mockSessionsData;
  const metrics = mockMetricsData;

  const latest = metrics[0];

  const quickStats = useMemo(() => {
    const totalSteps = metrics.reduce((sum, m) => sum + Math.round(m.avg_cadence_spm * 45), 0);
    const cadenceBand = latest.avg_cadence_spm < 90 ? 'slow' : latest.avg_cadence_spm > 120 ? 'fast' : 'mod';
    return {
      sessions: sessions.length,
      steps: totalSteps,
      balance: (100 - latest.avg_sway_vel_cm_s * 10).toFixed(1),
      stride: latest.avg_stride_len_in.toFixed(1),
      cadenceBand,
    };
  }, [metrics, sessions, latest]);

  const note = useMemo(() => {
    if (metrics.length < 2) return 'Insufficient history to generate notes.';
    const prev = metrics[1];
    const cadenceChange = ((latest.avg_cadence_spm - prev.avg_cadence_spm) / prev.avg_cadence_spm) * 100;
    const symChange = (latest.avg_symmetry_idx_pct - prev.avg_symmetry_idx_pct);
    return `Patient demonstrated moderate improvement in cadence (${cadenceChange.toFixed(1)}%) ` +
      `and symmetry (${symChange.toFixed(1)} pts). Balance sway remains ` +
      `${latest.avg_sway_vel_cm_s.toFixed(1)} cm/s.`;
  }, [metrics, latest]);

  const therapyRecs = useMemo(() => {
    const recs: string[] = [];
    const asym = 100 - latest.avg_symmetry_idx_pct;
    if (asym > 15) {
      recs.push('Single-leg stance on unstable surface, 3×30 s each leg.');
    }
    if (latest.avg_sway_vel_cm_s * 10 > 25) {
      recs.push('Eyes-closed tandem stance, 5×20 s.');
    }
    return recs;
  }, [latest]);

  return (
    <div className={dark ? 'dark min-h-screen bg-gray-900 text-white' : 'min-h-screen bg-gray-50 text-gray-900'}>
      <div className="p-4 space-y-8 print:bg-white print:text-black">
        {/* Header */}
        <div className="flex justify-between items-center">
          <button onClick={() => window.history.back()} className="underline text-blue-500 dark:text-blue-300">Back</button>
          <button onClick={() => setDark(!dark)} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700">
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        {patient && (
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-xl font-bold">
                {patient.first_name[0]}{patient.last_name[0]}
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">{patient.first_name} {patient.last_name}</h1>
                <div className="text-sm text-gray-400">ID #{patient.id} &bull; {patient.dx_icd10}</div>
                <div className="text-sm text-gray-400">Surgery {patient.surgery_date}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded-full bg-gray-700 text-xs">{quickStats.sessions} sessions</span>
              <span className="px-2 py-1 rounded-full bg-gray-700 text-xs">{quickStats.steps} steps</span>
              <span className="px-2 py-1 rounded-full bg-gray-700 text-xs">Balance {quickStats.balance}</span>
              <span className="px-2 py-1 rounded-full bg-gray-700 text-xs">Stride {quickStats.stride}</span>
              <span className="px-2 py-1 rounded-full bg-gray-700 text-xs">Cadence {quickStats.cadenceBand}</span>
            </div>
          </div>
        )}

        {/* Session timeline */}
        <div className="space-y-2">
          <h2 className="font-bold">Session Timeline</h2>
          <div className="flex overflow-x-auto gap-2 pb-2">
            {sessions.map((s) => (
              <a key={s.id} href={`#session-${s.id}`} className="px-3 py-1 rounded-full bg-gray-700 whitespace-nowrap hover:bg-gray-600">
                {s.start_ts.slice(5,10)} – {s.activity}
              </a>
            ))}
          </div>
        </div>

        {/* Longitudinal charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Gait Progress</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metrics} margin={{ left: -20 }}>
                <XAxis dataKey="id" tick={{ fill: dark ? '#fff' : '#000' }} />
                <YAxis tick={{ fill: dark ? '#fff' : '#000' }} />
                <Tooltip />
                <ReferenceArea y1={90} y2={130} fill="#3b82f6" fillOpacity={0.1} />
                <Line type="monotone" dataKey="avg_cadence_spm" stroke="#60a5fa" />
                <Line type="monotone" dataKey="avg_stride_len_in" stroke="#fbbf24" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Symmetry & Support</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metrics} margin={{ left: -20 }}>
                <XAxis dataKey="id" tick={{ fill: dark ? '#fff' : '#000' }} />
                <YAxis tick={{ fill: dark ? '#fff' : '#000' }} />
                <Tooltip />
                <ReferenceArea y1={85} y2={100} fill="#10b981" fillOpacity={0.1} />
                <Line type="monotone" dataKey="avg_symmetry_idx_pct" stroke="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Balance Stability</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metrics} margin={{ left: -20 }}>
                <XAxis dataKey="id" tick={{ fill: dark ? '#fff' : '#000' }} />
                <YAxis tick={{ fill: dark ? '#fff' : '#000' }} />
                <Tooltip />
                <Line type="monotone" dataKey="avg_sway_vel_cm_s" stroke="#a78bfa" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latest session deep dive */}
        <div id={`session-${latest.id}`} className="space-y-4">
          <h2 className="font-bold">Latest Session</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-center h-48">Heatmap Replay</div>
            <div className="bg-gray-800 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[{
                  cadence: latest.avg_cadence_spm,
                  symmetry: latest.avg_symmetry_idx_pct,
                  sway: latest.avg_sway_vel_cm_s * 10,
                  load: 50,
                  rom: 80,
                }]}> 
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis />
                  <Radar name="Current" dataKey="cadence" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Metric</th>
                <th className="text-left">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Cadence</td><td>{latest.avg_cadence_spm.toFixed(1)} spm</td></tr>
              <tr><td>Stride</td><td>{latest.avg_stride_len_in.toFixed(1)} in</td></tr>
              <tr><td>Symmetry</td><td>{latest.avg_symmetry_idx_pct.toFixed(1)}%</td></tr>
              <tr><td>Sway Vel</td><td>{latest.avg_sway_vel_cm_s.toFixed(1)} cm/s</td></tr>
            </tbody>
          </table>
        </div>

        {/* Auto generated notes */}
        <div className="bg-gray-800 p-4 rounded-lg space-y-2">
          <h3 className="font-semibold">Auto-Generated Notes</h3>
          <p>{note}</p>
        </div>

        {/* Therapy Recommendations */}
        {therapyRecs.length > 0 && (
          <div className="bg-gray-800 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">Therapy Plan Recommendations</h3>
            <ul className="list-disc pl-5 space-y-1">
              {therapyRecs.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {/* Export */}
        <button onClick={() => window.print()} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500">Generate PDF for Payer</button>

        {/* Footer */}
        <div className="flex items-center justify-between pt-10">
          <div className="text-sm">Signed ____________________ {new Date().toLocaleDateString()}</div>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=demo" alt="QR" />
        </div>
      </div>
    </div>
  );
}
