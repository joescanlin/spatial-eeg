import React from 'react';

// Demo data used for static report rendering. Swap with API data when available.
const patient = {
  id: 1,
  first_name: 'John',
  last_name: 'Doe',
  age: 34,
  dx_icd10: 'S83.511A',
  surgery_date: '2025-04-01',
};

const metrics = [
  { session: 1, cadence: 76, stride: 21, symmetry: 28, double_support: 34, sway: 3.2 },
  { session: 2, cadence: 83, stride: 25, symmetry: 17, double_support: 33, sway: 2.4 },
  { session: 3, cadence: 92, stride: 28, symmetry: 8, double_support: 31, sway: 1.8 },
];

const latest = metrics[2];

export default function PatientReport() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 print:white-bg">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center no-print">
          <button onClick={() => window.history.back()} className="underline text-blue-400">Back</button>
          <button onClick={() => window.print()} className="px-3 py-1 rounded bg-blue-600">Generate PDF</button>
        </div>

        <header className="space-y-3">
          <h1 className="text-2xl font-bold">
            Patient Snapshot – {patient.first_name} {patient.last_name}, {patient.age} yrs, R ACL Reconstruction ({patient.dx_icd10}), Surgery {patient.surgery_date}.
          </h1>
          <div className="flex flex-wrap gap-2">
            <span className="chip">Sessions 3</span>
            <span className="chip">Total Steps Logged 14&nbsp;914</span>
            <span className="chip">Avg Cadence 82 spm</span>
            <span className="chip">Current Stride 28 in</span>
            <span className="chip">Balance Score 82/100</span>
          </div>
        </header>

        <section className="space-y-2 text-sm">
          <p>John has progressed from protected weight-bearing to independent gait over three sessions. Objective cadence rose from 76 spm (session 1) to 92 spm (session 3)—a 21 % gain consistent with mid-phase rehab targets.</p>
          <p>Stride length increased 7 in and symmetry improved from 28 % to 8 % asymmetry, indicating balanced quad activation. Static sway decreased from 3.2 cm to 1.8 cm, reducing fall risk.</p>
          <p>Double-support time remains slightly elevated (31 %), suggesting ongoing confidence deficit; load-shift drills prescribed below.</p>
        </section>

        <section>
          <h2 className="font-semibold mb-2">Progress at a Glance</h2>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <figure className="bg-gray-800 p-4 rounded-lg">
              <svg viewBox="0 0 300 120" className="w-full h-28">
                <polyline points="0,37 150,30 300,20" className="stroke-blue-400 fill-none stroke-2" />
                <polyline points="0,41 150,26 300,15" className="stroke-amber-400 fill-none stroke-2" />
              </svg>
              <figcaption className="text-xs mt-1">Cadence &amp; stride trending upward toward discharge goal (110 spm, 32 in).</figcaption>
            </figure>
            <figure className="bg-gray-800 p-4 rounded-lg">
              <svg viewBox="0 0 300 120" className="w-full h-28">
                <rect x="40" y="36" width="40" height="84" className="fill-green-500" />
                <rect x="40" y="18" width="40" height="102" className="fill-gray-500 opacity-60" />
                <rect x="130" y="69" width="40" height="51" className="fill-green-500" />
                <rect x="130" y="21" width="40" height="99" className="fill-gray-500 opacity-60" />
                <rect x="220" y="96" width="40" height="24" className="fill-green-500" />
                <rect x="220" y="27" width="40" height="93" className="fill-gray-500 opacity-60" />
              </svg>
              <figcaption className="text-xs mt-1">Symmetry nearing 5 % target; double-support slightly high.</figcaption>
            </figure>
            <figure className="bg-gray-800 p-4 rounded-lg">
              <svg viewBox="0 0 300 120" className="w-full h-28">
                <rect x="0" y="34" width="300" height="2" className="fill-purple-300" />
                <polyline points="0,10 150,38 300,58" className="stroke-purple-500 fill-none stroke-2" />
              </svg>
              <figcaption className="text-xs mt-1">Sway steadily decreasing; now below risk threshold.</figcaption>
            </figure>
          </div>
        </section>

        <section id="latest" className="space-y-4">
          <h2 className="font-semibold">Latest Session Deep-Dive</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="heatmap w-36 h-36 rounded" />
              <svg viewBox="0 0 150 150" className="cop-path">
                <path d="M75 40a30 30 0 1 0 0 60a30 30 0 1 0 0-60" stroke="#38bdf8" strokeWidth="4" fill="none" />
              </svg>
            </div>
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 150 150" className="mb-2">
                <polygon points="75,15 132.1,56.5 110.3,123.5 39.7,123.5 17.9,56.5" className="fill-none stroke-gray-600" />
                <polygon points="75,33 125.2,58.7 96.2,104.1 49.6,109.9 29.3,60.2" className="fill-blue-500 opacity-40" />
              </svg>
              <ul className="text-xs space-y-1 text-center">
                <li>Cadence 92 spm (Goal 110)</li>
                <li>Stride 28 in (Goal 32)</li>
                <li>Sway 1.8 cm (OK)</li>
                <li>Symmetry 8 % (OK)</li>
                <li>Load L/R 48 / 52 %</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-2">KPI &amp; Threshold Table</h2>
          <table className="w-full text-sm">
            <thead>
              <tr><th className="text-left">Metric</th><th className="text-left">Value</th><th className="text-left">Goal</th><th className="text-left">Status</th></tr>
            </thead>
            <tbody>
              <tr><td>Cadence CV</td><td>2.3%</td><td>&lt;4%</td><td className="status-ok">✅</td></tr>
              <tr><td>Double-Support %</td><td>31%</td><td>&lt;30%</td><td className="status-warn">⚠️</td></tr>
              <tr><td>Load L/R</td><td>48/52%</td><td>50 / 50% +- 15%</td><td className="status-ok">✅</td></tr>
              <tr><td>STS Reps (30s)</td><td>12</td><td>&ge; 12</td><td className="status-ok">✅</td></tr>
              <tr><td>Distance (6-min walk)</td><td>460 m</td><td>600 m</td><td className="status-progress">🔄</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="font-semibold mb-2">Auto-Generated Clinical Note (SOAP)</h2>
          <div className="border border-gray-600 p-3 rounded text-sm space-y-1">
            <p><strong>Subjective:</strong> Reports mild stiffness, 0/10 pain at rest, 2/10 during squats.</p>
            <p><strong>Objective:</strong> Cadence 92 spm (+9), symmetry 8 %, sway 1.8 cm, knee flex ROM 122 °.</p>
            <p><strong>Assessment:</strong> Progressing per protocol; residual balance deficit.</p>
            <p><strong>Plan:</strong> Add single-leg RLO weight-shift drill; progress cadence drills; re-test STS in 1 wk.</p>
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-2">Therapy Plan</h2>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-1 border rounded-full px-3 py-1 text-xs">
              <input type="checkbox" className="form-checkbox" /> Single-Leg Balance (BOSU) – 3 × 30 s
            </label>
            <label className="flex items-center gap-1 border rounded-full px-3 py-1 text-xs">
              <input type="checkbox" className="form-checkbox" /> Metronome Gait Drills – 100 spm × 4 min
            </label>
            <label className="flex items-center gap-1 border rounded-full px-3 py-1 text-xs">
              <input type="checkbox" className="form-checkbox" /> Forward Lunge Step-Backs – 2 × 10 each leg
            </label>
            <label className="flex items-center gap-1 border rounded-full px-3 py-1 text-xs">
              <input type="checkbox" className="form-checkbox" /> Eyes-Closed Tandem Stance – 3 × 20 s
            </label>
          </div>
        </section>

        <section className="space-y-2">
          <div className="text-sm">CPT suggestions: 97116 (Gait), 97112 (Neuromuscular), 97530 (Therapeutic Activity).<br/>ICD-10: S83.511A.</div>
          <div className="flex items-center justify-between">
            <svg viewBox="0 0 80 80" className="w-20 h-20 bg-white" aria-label="QR"><rect x="5" y="5" width="20" height="20" fill="black"/><rect x="55" y="5" width="20" height="20" fill="black"/><rect x="5" y="55" width="20" height="20" fill="black"/><rect x="30" y="30" width="10" height="10" fill="black"/><rect x="45" y="45" width="10" height="10" fill="black"/></svg>
            <div className="text-sm">Therapist __________________ Date ________</div>
          </div>
        </section>
      </div>
    </div>
  );
}
