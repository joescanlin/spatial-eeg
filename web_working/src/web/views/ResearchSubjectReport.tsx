import React from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { Brain, Activity, Footprints, TrendingUp } from 'lucide-react';
import { mockResearchSubjects, generateMockResearchSessions } from '../../utils/mockResearchData';

export default function ResearchSubjectReport() {
  // Use first research subject for demo
  const subject = mockResearchSubjects[0];
  const sessions = generateMockResearchSessions(subject.id);

  // Calculate aggregate metrics across all sessions
  const aggregateEEGMetrics = sessions.map((s, idx) => ({
    trial: idx + 1,
    pattern: s.flooringPattern.substring(0, 12),
    focus: s.eeg.avgFocus,
    stress: s.eeg.avgStress,
    attention: s.eeg.avgAttention,
    cognitiveLoad: s.eeg.avgCognitiveLoad
  }));

  // Aggregate spatial metrics
  const aggregateSpatialMetrics = sessions.map((s, idx) => {
    const avgStability = s.metrics.reduce((sum, m) => sum + m.stabilityScore, 0) / s.metrics.length;
    const avgSymmetry = s.metrics.reduce((sum, m) => sum + m.symmetry, 0) / s.metrics.length;
    const avgCadence = s.metrics.reduce((sum, m) => sum + m.cadence, 0) / s.metrics.length;
    const avgBalance = s.metrics.reduce((sum, m) => sum + m.balanceScore, 0) / s.metrics.length;

    return {
      trial: idx + 1,
      pattern: s.flooringPattern.substring(0, 12),
      stability: avgStability,
      symmetry: avgSymmetry,
      cadence: avgCadence,
      balance: avgBalance * 100
    };
  });

  // EEG vs Spatial correlation data
  const correlationData = sessions.map((s, idx) => {
    const avgStability = s.metrics.reduce((sum, m) => sum + m.stabilityScore, 0) / s.metrics.length;
    return {
      focus: s.eeg.avgFocus,
      stability: avgStability,
      pattern: s.flooringPattern.substring(0, 8),
      trial: idx + 1
    };
  });

  // Flooring pattern comparison
  const patternComparison = [
    { pattern: 'Textured Grid', focus: 73, stress: 28, stability: 82 },
    { pattern: 'High-Contrast', focus: 75, stress: 26, stability: 85 },
    { pattern: 'Smooth', focus: 62, stress: 45, stability: 68 },
    { pattern: 'Directional', focus: 71, stress: 30, stability: 80 },
    { pattern: 'Organic', focus: 65, stress: 38, stability: 72 }
  ];

  // Latest trial data
  const latestTrial = sessions[sessions.length - 1];

  // Band power visualization data
  const bandPowerData = [
    { band: 'Theta', value: latestTrial.eeg.bandPowerSummary.theta.avg },
    { band: 'Alpha', value: latestTrial.eeg.bandPowerSummary.alpha.avg },
    { band: 'Beta', value: latestTrial.eeg.bandPowerSummary.beta.avg },
    { band: 'Gamma', value: latestTrial.eeg.bandPowerSummary.gamma.avg }
  ];

  return (
    <div className="bg-gray-900 text-gray-100 p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-gray-700 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Research Subject Report</h1>
              <div className="text-gray-400">
                <p>Subject: {subject.first_name} {subject.last_name} (ID: {subject.id})</p>
                <p>Age: {subject.age} | Gender: {subject.gender}</p>
                <p>Primary Flooring Condition: {subject.flooring_condition}</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-400">
              <p>Report Generated: {new Date().toLocaleDateString()}</p>
              <p>Total Trials: {sessions.length}</p>
              <p>Study Period: {new Date(sessions[0].startTime).toLocaleDateString()} - {new Date(sessions[sessions.length - 1].startTime).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Cognitive Baseline */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Cognitive Baseline
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900 p-4 rounded">
              <div className="text-sm text-gray-400">Baseline Focus</div>
              <div className="text-2xl font-bold text-blue-400">{subject.cognitive_baseline.focus}%</div>
            </div>
            <div className="bg-gray-900 p-4 rounded">
              <div className="text-sm text-gray-400">Baseline Stress</div>
              <div className="text-2xl font-bold text-orange-400">{subject.cognitive_baseline.stress}%</div>
            </div>
            <div className="bg-gray-900 p-4 rounded">
              <div className="text-sm text-gray-400">Baseline Attention</div>
              <div className="text-2xl font-bold text-green-400">{subject.cognitive_baseline.attention}%</div>
            </div>
          </div>
        </section>

        {/* EEG Metrics Across Trials */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">EEG Cognitive Metrics Across Trials</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={aggregateEEGMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="trial" stroke="#9ca3af" label={{ value: 'Trial Number', position: 'insideBottom', offset: -5 }} />
              <YAxis stroke="#9ca3af" label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
              <Legend />
              <Line type="monotone" dataKey="focus" name="Focus" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="stress" name="Stress" stroke="#f97316" strokeWidth={2} />
              <Line type="monotone" dataKey="attention" name="Attention" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="cognitiveLoad" name="Cognitive Load" stroke="#a855f7" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 text-sm text-gray-400">
            <p>Flooring patterns tested: {sessions.map(s => s.flooringPattern).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</p>
          </div>
        </section>

        {/* Spatial/Gait Metrics Across Trials */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Footprints className="w-5 h-5" />
            Spatial & Gait Metrics Across Trials
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={aggregateSpatialMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="trial" stroke="#9ca3af" label={{ value: 'Trial Number', position: 'insideBottom', offset: -5 }} />
              <YAxis yAxisId="left" stroke="#9ca3af" label={{ value: 'Score / SPM', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" label={{ value: 'Percentage (%)', angle: 90, position: 'insideRight' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="stability" name="Stability Score" stroke="#22c55e" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="symmetry" name="Symmetry (%)" stroke="#eab308" strokeWidth={2} />
              <Line yAxisId="left" type="monotone" dataKey="cadence" name="Cadence (SPM)" stroke="#06b6d4" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="balance" name="Balance (%)" stroke="#ec4899" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* EEG vs Stability Correlation */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Cognitive State vs Movement Stability Correlation
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis type="number" dataKey="focus" name="Focus Level" unit="%" stroke="#9ca3af" label={{ value: 'Focus Level (%)', position: 'insideBottom', offset: -5 }} />
              <YAxis type="number" dataKey="stability" name="Stability Score" stroke="#9ca3af" label={{ value: 'Stability Score', angle: -90, position: 'insideLeft' }} />
              <ZAxis type="number" range={[100, 400]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
              <Legend />
              <Scatter name="Trials" data={correlationData} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded">
            <p className="text-sm text-blue-200">
              <strong>Observation:</strong> Higher focus levels correlate with improved stability scores across flooring conditions,
              suggesting cognitive engagement plays a significant role in movement confidence.
            </p>
          </div>
        </section>

        {/* Flooring Pattern Comparison */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Flooring Pattern Performance Comparison</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-300">Cognitive Metrics by Pattern</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={patternComparison} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis dataKey="pattern" type="category" width={100} stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
                  <Legend />
                  <Bar dataKey="focus" name="Focus (%)" fill="#3b82f6" />
                  <Bar dataKey="stress" name="Stress (%)" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-300">Stability by Pattern</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={patternComparison} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis dataKey="pattern" type="category" width={100} stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
                  <Bar dataKey="stability" name="Stability Score" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Latest Trial Detail */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Latest Trial: {latestTrial.flooringPattern}</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-3 text-gray-300 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                EEG Band Power Distribution
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bandPowerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="band" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
                  <Bar dataKey="value" fill="#8b5cf6">
                    {bandPowerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'][index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-gray-300">Contact Quality</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-gray-900 p-2 rounded">
                  <span className="text-sm">Overall Quality</span>
                  <span className="text-sm font-bold text-green-400">{latestTrial.eeg.contactQuality.overall}%</span>
                </div>
                {Object.entries(latestTrial.eeg.contactQuality.channels).map(([channel, quality]) => (
                  <div key={channel} className="flex justify-between items-center bg-gray-900 p-2 rounded">
                    <span className="text-xs text-gray-400">{channel}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-400 h-2 rounded-full"
                          style={{ width: `${(quality / 4) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono">{quality}/4</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Research Notes */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Research Observations</h2>
          <div className="space-y-4">
            {sessions.slice(-3).reverse().map((session, idx) => (
              <div key={session.id} className="bg-gray-900 p-4 rounded border-l-4 border-blue-500">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">Trial {session.trialNumber} - {session.flooringPattern}</h3>
                  <span className="text-xs text-gray-400">{new Date(session.startTime).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-300">{session.notes}</p>
                {session.environmentalNotes && (
                  <p className="text-xs text-gray-500 mt-2">Environment: {session.environmentalNotes}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Summary & Recommendations */}
        <section className="bg-blue-900/20 border border-blue-700/30 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Research Summary & Flooring Recommendations</h2>
          <div className="space-y-3 text-sm">
            <p>
              <strong>Best Performing Patterns:</strong> High-Contrast Stripes and Textured Grid Pattern showed the most favorable outcomes,
              with elevated focus levels (73-75%) and reduced stress indicators (26-28%).
            </p>
            <p>
              <strong>Cognitive-Motor Correlation:</strong> Strong positive correlation observed between EEG focus metrics and spatial stability scores,
              suggesting flooring design significantly impacts cognitive engagement during navigation.
            </p>
            <p>
              <strong>Design Recommendation:</strong> Based on {sessions.length} trials, implement High-Contrast Stripes or Textured Grid patterns
              in high-traffic areas for geriatric populations. Avoid smooth monochrome surfaces which demonstrated elevated stress (45%) and
              reduced stability (68 vs 82-85 in optimal patterns).
            </p>
          </div>
        </section>

        {/* Footer */}
        <section className="border-t border-gray-700 pt-6 text-sm text-gray-400">
          <div className="flex justify-between items-center">
            <div>
              <p>Geriatric Flooring Research Study</p>
              <p>EEG + Smart Flooring Fusion Analysis</p>
            </div>
            <div className="text-right">
              <p>Principal Investigator: ___________________</p>
              <p>Date: ___________________</p>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        @media print {
          .bg-gray-900 { background: white !important; color: black !important; }
          .bg-gray-800 { background: #f3f4f6 !important; }
          .text-gray-100 { color: black !important; }
          .border-gray-700 { border-color: #d1d5db !important; }
        }
      `}</style>
    </div>
  );
}
