import React from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell
} from 'recharts';

// Enhanced dummy data for patient report
const patient = {
  id: 1,
  first_name: 'John',
  last_name: 'Doe',
  age: 34,
  dx_icd10: 'S83.511A',
  surgery_date: '2025-04-01',
};

// Session metrics data
const metrics = [
  { session: 1, cadence: 76, stride: 21, symmetry: 28, double_support: 34, sway: 3.2 },
  { session: 2, cadence: 83, stride: 25, symmetry: 17, double_support: 33, sway: 2.4 },
  { session: 3, cadence: 92, stride: 28, symmetry: 8, double_support: 31, sway: 1.8 },
];

// Latest session data
const latest = metrics[2];

// Extended asymmetry metrics based on screenshots
const asymmetryData = {
  overall: 8.7,
  baseline: 12.4,
  improvement: 3.7,
  metrics: {
    stepLength: {
      value: 7.3,
      change: 5.6,
      left: 52.4,
      right: 48.7,
      baseline: 1.7,
      type: 'spatial'
    },
    stepTime: {
      value: 9.8,
      change: 8.9,
      left: 565.0,
      right: 512.2,
      baseline: 0.9,
      type: 'temporal'
    },
    peakPressure: {
      value: 7.9,
      change: 5.4,
      left: 72.0,
      right: 66.6,
      baseline: 2.5,
      type: 'pressure'
    },
    contactArea: {
      value: 4.8,
      change: 2.7,
      left: 133.1,
      right: 126.9,
      baseline: 2.1,
      type: 'pressure'
    },
    propulsionForce: {
      value: 9.1,
      change: 8.0,
      left: 428.8,
      right: 391.4,
      baseline: 1.1,
      type: 'kinetic'
    }
  }
};

// Left vs Right comparison data
const leftRightData = [
  { name: 'Step Length', left: 52.4, right: 48.7 },
  { name: 'Step Time', left: 565.0, right: 512.2 },
  { name: 'Peak Pressure', left: 72.0, right: 66.6 },
  { name: 'Contact Area', left: 133.1, right: 126.9 },
  { name: 'Propulsion Force', left: 428.8, right: 391.4 },
];

// Trend data across sessions
const sessionTrendData = Array(15).fill(0).map((_, idx) => {
  const randomFactor = () => Math.random() * 4 - 2;
  return {
    step: idx + 1,
    stepLength: Math.max(0, 8 + Math.sin(idx * 0.8) * 5 + randomFactor()),
    stepTime: Math.max(0, 9 + Math.sin((idx + 2) * 0.9) * 4 + randomFactor()),
    peakPressure: Math.max(0, 7.5 + Math.sin((idx + 4) * 0.7) * 4 + randomFactor()),
    propulsion: Math.max(0, 10 + Math.sin((idx + 1) * 0.6) * 4 + randomFactor()),
  };
});

// Gait parameters data
const gaitParameters = {
  walkingSpeed: { value: 0.10, baseline: 3.28, change: 96.9, status: 'Low' },
  strideLength: { value: 101.15, baseline: 115.00, change: 12.0, status: 'Normal' },
  leftStepLength: { value: 52.42, baseline: 58.00, change: 9.6, status: 'Normal' },
  rightStepLength: { value: 48.73, baseline: 57.00, change: 14.5, status: 'Normal' },
  stepWidth: { value: 11.27, baseline: 12.00, change: 6.1, status: 'Normal' },
};

// Gait cycle distribution data
const gaitCycleData = [
  { name: 'Left Stance', value: 52, color: '#4f8df6' },
  { name: 'Right Stance', value: 48, color: '#ff7a45' },
  { name: 'Swing', value: 0, color: '#d9d9d9' },
];

// Metrics trend data
const metricsTrendData = Array(15).fill(0).map((_, idx) => ({
  step: idx + 1,
  walkingSpeed: Math.random() * 0.03 + 0.08,
  strideLength: Math.random() * 10 + 95,
  baselineSpeed: 0.12,
}));

// Radar chart data for asymmetry pattern
const radarData = [
  { metric: 'Step Length', current: 75, baseline: 60 },
  { metric: 'Step Time', current: 80, baseline: 65 },
  { metric: 'Peak Pressure', current: 85, baseline: 70 },
  { metric: 'Contact Area', current: 90, baseline: 75 },
  { metric: 'Propulsion', current: 70, baseline: 55 },
];

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

        {/* Overall Asymmetry Section */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-white bg-opacity-5 p-5 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Overall Asymmetry</h2>
            <div className="text-center">
              <div className="text-5xl font-bold text-green-500 mb-2">{asymmetryData.overall}%</div>
              <div className="text-sm text-gray-400">
                From baseline: <span className="text-green-500">+{asymmetryData.improvement}%</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white bg-opacity-5 p-5 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Asymmetry Pattern</h2>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#9ca3af' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af' }} />
                <Radar name="Current" dataKey="current" stroke="#4f8df6" fill="#4f8df6" fillOpacity={0.6} />
                <Radar name="Baseline" dataKey="baseline" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.3} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Asymmetry Metrics Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Asymmetry Metrics</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            {/* Step Length Card */}
            <div className="bg-white bg-opacity-5 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Step Length</h3>
                <span className="text-xs px-2 py-0.5 bg-blue-800 text-blue-100 font-medium rounded-full">spatial</span>
              </div>
              <div className="text-3xl font-bold text-blue-500 mb-1">
                {asymmetryData.metrics.stepLength.value}% <span className="text-sm text-green-500">↑{asymmetryData.metrics.stepLength.change}%</span>
              </div>
              <div className="text-sm mb-3">
                Left: {asymmetryData.metrics.stepLength.left} cm | Right: {asymmetryData.metrics.stepLength.right} cm
              </div>
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
                <div 
                  className="absolute h-full bg-blue-500"
                  style={{ width: `${100 - asymmetryData.metrics.stepLength.value}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Baseline: {asymmetryData.metrics.stepLength.baseline}%</span>
                <span>+{asymmetryData.metrics.stepLength.change}%</span>
              </div>
            </div>
            
            {/* Step Time Card */}
            <div className="bg-white bg-opacity-5 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Step Time</h3>
                <span className="text-xs px-2 py-0.5 bg-purple-800 text-purple-100 font-medium rounded-full">temporal</span>
              </div>
              <div className="text-3xl font-bold text-purple-500 mb-1">
                {asymmetryData.metrics.stepTime.value}% <span className="text-sm text-green-500">↑{asymmetryData.metrics.stepTime.change}%</span>
              </div>
              <div className="text-sm mb-3">
                Left: {asymmetryData.metrics.stepTime.left} ms | Right: {asymmetryData.metrics.stepTime.right} ms
              </div>
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
                <div 
                  className="absolute h-full bg-purple-500"
                  style={{ width: `${100 - asymmetryData.metrics.stepTime.value}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Baseline: {asymmetryData.metrics.stepTime.baseline}%</span>
                <span>+{asymmetryData.metrics.stepTime.change}%</span>
              </div>
            </div>
            
            {/* Peak Pressure Card */}
            <div className="bg-white bg-opacity-5 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Peak Pressure</h3>
                <span className="text-xs px-2 py-0.5 bg-green-800 text-green-100 font-medium rounded-full">pressure</span>
              </div>
              <div className="text-3xl font-bold text-green-500 mb-1">
                {asymmetryData.metrics.peakPressure.value}% <span className="text-sm text-green-500">↑{asymmetryData.metrics.peakPressure.change}%</span>
              </div>
              <div className="text-sm mb-3">
                Left: {asymmetryData.metrics.peakPressure.left} N/cm² | Right: {asymmetryData.metrics.peakPressure.right} N/cm²
              </div>
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
                <div 
                  className="absolute h-full bg-green-500"
                  style={{ width: `${100 - asymmetryData.metrics.peakPressure.value}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Baseline: {asymmetryData.metrics.peakPressure.baseline}%</span>
                <span>+{asymmetryData.metrics.peakPressure.change}%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Left vs Right Comparison */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Left vs. Right Comparison</h2>
          <div className="bg-white bg-opacity-5 p-4 rounded-lg">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                layout="vertical"
                data={leftRightData}
                margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} />
                <XAxis type="number" domain={[0, 600]} tickCount={7} stroke="#9ca3af" />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }}
                />
                <Legend />
                <Bar dataKey="left" name="Left Foot" fill="#4f8df6" />
                <Bar dataKey="right" name="Right Foot" fill="#ff7a45" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Asymmetry Trend Across Session */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Asymmetry Trend Across Session</h2>
          <div className="bg-white bg-opacity-5 p-4 rounded-lg">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={sessionTrendData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="step" stroke="#9ca3af" />
                <YAxis domain={[0, 30]} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }}
                />
                <Legend />
                <Line type="monotone" dataKey="stepLength" name="Step Length" stroke="#4f8df6" dot={true} />
                <Line type="monotone" dataKey="stepTime" name="Step Time" stroke="#c084fc" dot={true} />
                <Line type="monotone" dataKey="peakPressure" name="Peak Pressure" stroke="#10b981" dot={true} />
                <Line type="monotone" dataKey="propulsion" name="Propulsion" stroke="#ff7a45" dot={true} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Gait Parameter Analysis */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Gait Parameter Analysis</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white bg-opacity-5 p-4 rounded-lg">
              <h3 className="text-md font-medium mb-3">Spatial Parameters</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-700">
                    <th className="pb-2">Metric</th>
                    <th className="pb-2">Value</th>
                    <th className="pb-2">Baseline</th>
                    <th className="pb-2">Change</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-800">
                    <td className="py-2">Walking Speed (ft/s)</td>
                    <td>{gaitParameters.walkingSpeed.value}</td>
                    <td>{gaitParameters.walkingSpeed.baseline}</td>
                    <td className="text-green-500">↓ {gaitParameters.walkingSpeed.change}% decrease</td>
                    <td className="text-red-500">{gaitParameters.walkingSpeed.status}</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-2">Stride Length (cm)</td>
                    <td>{gaitParameters.strideLength.value}</td>
                    <td>{gaitParameters.strideLength.baseline}</td>
                    <td className="text-green-500">↓ {gaitParameters.strideLength.change}% decrease</td>
                    <td className="text-green-500">{gaitParameters.strideLength.status}</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-2">Left Step Length (cm)</td>
                    <td>{gaitParameters.leftStepLength.value}</td>
                    <td>{gaitParameters.leftStepLength.baseline}</td>
                    <td className="text-green-500">↓ {gaitParameters.leftStepLength.change}% decrease</td>
                    <td className="text-green-500">{gaitParameters.leftStepLength.status}</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-2">Right Step Length (cm)</td>
                    <td>{gaitParameters.rightStepLength.value}</td>
                    <td>{gaitParameters.rightStepLength.baseline}</td>
                    <td className="text-green-500">↓ {gaitParameters.rightStepLength.change}% decrease</td>
                    <td className="text-green-500">{gaitParameters.rightStepLength.status}</td>
                  </tr>
                  <tr>
                    <td className="py-2">Step Width (cm)</td>
                    <td>{gaitParameters.stepWidth.value}</td>
                    <td>{gaitParameters.stepWidth.baseline}</td>
                    <td className="text-green-500">↓ {gaitParameters.stepWidth.change}% decrease</td>
                    <td className="text-green-500">{gaitParameters.stepWidth.status}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="bg-white bg-opacity-5 p-4 rounded-lg">
              <h3 className="text-md font-medium mb-3">Gait Cycle Distribution</h3>
              <div className="flex justify-center">
                <ResponsiveContainer width="80%" height={250}>
                  <PieChart>
                    <Pie
                      data={gaitCycleData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {gaitCycleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics Trend Across Session */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Metrics Trend Across Session</h2>
          <div className="bg-white bg-opacity-5 p-4 rounded-lg">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={metricsTrendData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="step" stroke="#9ca3af" />
                <YAxis yAxisId="left" orientation="left" stroke="#9ca3af" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 150]} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="walkingSpeed" name="Walking Speed (ft/s)" stroke="#4f8df6" dot={true} />
                <Line yAxisId="right" type="monotone" dataKey="strideLength" name="Stride Length (cm)" stroke="#ff7a45" dot={true} />
                <Line yAxisId="left" type="monotone" dataKey="baselineSpeed" name="Baseline Speed" stroke="#9ca3af" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* KPI Table */}
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

        {/* Clinical Note */}
        <section>
          <h2 className="font-semibold mb-2">Auto-Generated Clinical Note (SOAP)</h2>
          <div className="border border-gray-600 p-3 rounded text-sm space-y-1">
            <p><strong>Subjective:</strong> Reports mild stiffness, 0/10 pain at rest, 2/10 during squats.</p>
            <p><strong>Objective:</strong> Cadence 92 spm (+9), symmetry 8 %, sway 1.8 cm, knee flex ROM 122 °.</p>
            <p><strong>Assessment:</strong> Progressing per protocol; residual balance deficit.</p>
            <p><strong>Plan:</strong> Add single-leg RLO weight-shift drill; progress cadence drills; re-test STS in 1 wk.</p>
          </div>
        </section>

        {/* Therapy Plan */}
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

        {/* Footer */}
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
