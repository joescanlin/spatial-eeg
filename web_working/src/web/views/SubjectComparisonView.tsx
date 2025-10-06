import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  findSimilarSubjects,
  getAggregatedMetrics,
  getCohortInsights,
  SubjectData,
  SessionMetrics
} from '../../utils/researchComparisonData';
import { DEMO_SUBJECTS } from '../../utils/dummyResearchData';
import { Users, Filter, Activity, TrendingUp, Brain, BarChart2, Package, Award } from 'lucide-react';

export default function SubjectComparisonView() {
  // Use demo data for now (can be replaced with fetchAllSubjects() in production)
  const allSubjects = useMemo(() => DEMO_SUBJECTS, []);

  // State management
  const [selectedSubject, setSelectedSubject] = useState<SubjectData | null>(null);
  const [filters, setFilters] = useState({
    ageRange: 5,
    matchGender: true,
    matchFlooringPattern: false,
    minSessions: 1
  });
  const [similarSubjects, setSimilarSubjects] = useState<SubjectData[]>([]);
  const [activeMetric, setActiveMetric] = useState<'spatial' | 'cognitive'>('spatial');

  // Select a random subject on initial load
  useEffect(() => {
    if (allSubjects.length > 0) {
      const randomSubject = allSubjects[Math.floor(Math.random() * allSubjects.length)];
      setSelectedSubject(randomSubject);
    }
  }, [allSubjects]);

  // Update similar subjects when selection or filters change
  useEffect(() => {
    if (selectedSubject && allSubjects.length > 0) {
      const similar = findSimilarSubjects(
        selectedSubject.demographics,
        allSubjects,
        filters
      );
      setSimilarSubjects(similar);
    }
  }, [selectedSubject, allSubjects, filters]);

  // Get aggregated cohort data
  const cohortData = useMemo(() => {
    if (similarSubjects.length === 0) return { byTrial: {} };
    return getAggregatedMetrics(similarSubjects);
  }, [similarSubjects]);

  // Get insights
  const insights = useMemo(() => {
    if (!selectedSubject || similarSubjects.length === 0) {
      return { trends: [], correlations: [], outliers: [] };
    }
    return getCohortInsights(selectedSubject, similarSubjects);
  }, [selectedSubject, similarSubjects]);

  // Prepare timeline data for charts
  const timelineData = useMemo(() => {
    if (!selectedSubject) return [];

    const trials = new Set<number>();
    selectedSubject.sessions.forEach(s => trials.add(s.trial_number));
    Object.keys(cohortData.byTrial).forEach(t => trials.add(parseInt(t)));

    return Array.from(trials).sort((a, b) => a - b).map(trial => {
      const subjectSession = selectedSubject.sessions.find(s => s.trial_number === trial);
      const cohortSession = cohortData.byTrial[trial];

      return {
        trial,
        // Spatial metrics
        subject_cadence: subjectSession?.cadence || null,
        cohort_cadence: cohortSession?.cadence || null,
        subject_symmetry: subjectSession?.symmetry || null,
        cohort_symmetry: cohortSession?.symmetry || null,
        subject_balance: subjectSession?.balance_score || null,
        cohort_balance: cohortSession?.balance_score || null,
        // EEG metrics
        subject_focus: subjectSession?.eeg_focus || null,
        cohort_focus: cohortSession?.eeg_focus || null,
        subject_stress: subjectSession?.eeg_stress || null,
        cohort_stress: cohortSession?.eeg_stress || null,
        subject_attention: subjectSession?.eeg_attention || null,
        cohort_attention: cohortSession?.eeg_attention || null
      };
    });
  }, [selectedSubject, cohortData]);

  // Prepare radar chart data
  const radarData = useMemo(() => {
    if (!selectedSubject || selectedSubject.sessions.length === 0) return [];

    // Calculate subject averages
    const subjectAvg = {
      cadence: 0,
      symmetry: 0,
      balance: 0,
      focus: 0,
      stress: 0,
      attention: 0
    };

    selectedSubject.sessions.forEach(s => {
      if (s.cadence) subjectAvg.cadence += s.cadence;
      if (s.symmetry) subjectAvg.symmetry += s.symmetry;
      if (s.balance_score) subjectAvg.balance += s.balance_score;
      if (s.eeg_focus) subjectAvg.focus += s.eeg_focus;
      if (s.eeg_stress) subjectAvg.stress += s.eeg_stress;
      if (s.eeg_attention) subjectAvg.attention += s.eeg_attention;
    });

    const count = selectedSubject.sessions.length;
    Object.keys(subjectAvg).forEach(key => {
      subjectAvg[key as keyof typeof subjectAvg] /= count;
    });

    // Calculate cohort averages
    const cohortAvg = {
      cadence: 0,
      symmetry: 0,
      balance: 0,
      focus: 0,
      stress: 0,
      attention: 0
    };

    const trials = Object.values(cohortData.byTrial);
    if (trials.length > 0) {
      trials.forEach(t => {
        cohortAvg.cadence += t.cadence;
        cohortAvg.symmetry += t.symmetry;
        cohortAvg.balance += t.balance_score;
        cohortAvg.focus += t.eeg_focus;
        cohortAvg.stress += t.eeg_stress;
        cohortAvg.attention += t.eeg_attention;
      });

      Object.keys(cohortAvg).forEach(key => {
        cohortAvg[key as keyof typeof cohortAvg] /= trials.length;
      });
    }

    return [
      { metric: 'Cadence', subject: Math.round(subjectAvg.cadence), cohort: Math.round(cohortAvg.cadence), fullMark: 150 },
      { metric: 'Symmetry', subject: Math.round(subjectAvg.symmetry), cohort: Math.round(cohortAvg.symmetry), fullMark: 100 },
      { metric: 'Balance', subject: Math.round(subjectAvg.balance), cohort: Math.round(cohortAvg.balance), fullMark: 100 },
      { metric: 'Focus', subject: Math.round(subjectAvg.focus), cohort: Math.round(cohortAvg.focus), fullMark: 100 },
      { metric: 'Attention', subject: Math.round(subjectAvg.attention), cohort: Math.round(cohortAvg.attention), fullMark: 100 },
      { metric: 'Calm', subject: Math.round(100 - subjectAvg.stress), cohort: Math.round(100 - cohortAvg.stress), fullMark: 100 }
    ];
  }, [selectedSubject, cohortData]);

  // Flooring pattern analysis - aggregate across ALL subjects by flooring type
  const flooringAnalysis = useMemo(() => {
    const patterns = ['Hexagonal', 'Square Grid', 'Diagonal', 'Random', 'Control (Flat)'];

    return patterns.map(pattern => {
      const patternSubjects = allSubjects.filter(s =>
        s.demographics.flooring_condition === pattern
      );

      if (patternSubjects.length === 0) {
        return {
          pattern,
          subjectCount: 0,
          avgCadence: 0,
          avgSymmetry: 0,
          avgBalance: 0,
          avgFocus: 0,
          avgStress: 0,
          avgAttention: 0,
          avgStability: 0,
          sessionCount: 0
        };
      }

      let totalCadence = 0, totalSymmetry = 0, totalBalance = 0;
      let totalFocus = 0, totalStress = 0, totalAttention = 0, totalStability = 0;
      let sessionCount = 0;

      patternSubjects.forEach(subject => {
        subject.sessions.forEach(session => {
          if (session.cadence) totalCadence += session.cadence;
          if (session.symmetry) totalSymmetry += session.symmetry;
          if (session.balance_score) totalBalance += session.balance_score;
          if (session.eeg_focus) totalFocus += session.eeg_focus;
          if (session.eeg_stress) totalStress += session.eeg_stress;
          if (session.eeg_attention) totalAttention += session.eeg_attention;
          if (session.stability_score) totalStability += session.stability_score;
          sessionCount++;
        });
      });

      return {
        pattern,
        subjectCount: patternSubjects.length,
        avgCadence: Math.round(totalCadence / sessionCount),
        avgSymmetry: Math.round(totalSymmetry / sessionCount),
        avgBalance: Math.round(totalBalance / sessionCount),
        avgFocus: Math.round(totalFocus / sessionCount),
        avgStress: Math.round(totalStress / sessionCount),
        avgAttention: Math.round(totalAttention / sessionCount),
        avgStability: Math.round(totalStability / sessionCount),
        sessionCount
      };
    });
  }, [allSubjects]);

  // Flooring impact ranking (compared to control)
  const flooringRankings = useMemo(() => {
    const control = flooringAnalysis.find(f => f.pattern === 'Control (Flat)');
    if (!control || control.sessionCount === 0) return [];

    const rankings = flooringAnalysis
      .filter(f => f.pattern !== 'Control (Flat)' && f.sessionCount > 0)
      .map(f => ({
        pattern: f.pattern,
        mobilityScore: ((f.avgCadence / control.avgCadence) +
                       (f.avgSymmetry / control.avgSymmetry) +
                       (f.avgBalance / control.avgBalance) +
                       (f.avgStability / control.avgStability)) / 4,
        cognitiveScore: ((f.avgFocus / control.avgFocus) +
                        (f.avgAttention / control.avgAttention) +
                        ((100 - f.avgStress) / (100 - control.avgStress))) / 3,
        balanceChange: f.avgBalance - control.avgBalance,
        stressChange: f.avgStress - control.avgStress,
        subjectCount: f.subjectCount
      }));

    return rankings.sort((a, b) =>
      (b.mobilityScore + b.cognitiveScore) - (a.mobilityScore + a.cognitiveScore)
    );
  }, [flooringAnalysis]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (allSubjects.length === 0) {
    return (
      <div className="p-8 bg-gray-900 min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Subject Comparison</h1>
        <div className="bg-yellow-900/30 border border-yellow-700 rounded p-4">
          <p className="text-yellow-300">No subjects available. Demo data failed to load.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Subject Comparison Analysis</h1>
        <p className="text-gray-400">Compare individual research subjects against cohort averages</p>
      </div>

      {/* Top Row - Subject Info, Filters, Current Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Selected Subject Card */}
        <div className="bg-gray-800 rounded-lg p-5 shadow-lg">
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <Users className="mr-2 text-blue-400" size={20} />
            Selected Subject
          </h2>

          {selectedSubject && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subject ID:</span>
                  <span className="font-medium">#{selectedSubject.demographics.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Age:</span>
                  <span className="font-medium">{selectedSubject.demographics.age} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gender:</span>
                  <span className="font-medium capitalize">{selectedSubject.demographics.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Height:</span>
                  <span className="font-medium">{selectedSubject.demographics.height_cm} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Flooring:</span>
                  <span className="font-medium text-sm">{selectedSubject.demographics.flooring_condition}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sessions:</span>
                  <span className="font-medium">{selectedSubject.sessions.length}</span>
                </div>
              </div>

              <button
                className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
                onClick={() => {
                  const randomSubject = allSubjects[Math.floor(Math.random() * allSubjects.length)];
                  setSelectedSubject(randomSubject);
                }}
              >
                Select Different Subject
              </button>
            </>
          )}
        </div>

        {/* Comparison Filters Card */}
        <div className="bg-gray-800 rounded-lg p-5 shadow-lg">
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <Filter className="mr-2 text-green-400" size={20} />
            Cohort Filters
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Age Range (±years)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={filters.ageRange}
                  onChange={(e) => handleFilterChange('ageRange', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-medium min-w-[30px] text-center">{filters.ageRange}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-gray-400">Matching Criteria</label>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="matchGender"
                  checked={filters.matchGender}
                  onChange={(e) => handleFilterChange('matchGender', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                />
                <label htmlFor="matchGender" className="ml-2 text-sm">Match Gender</label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="matchFlooring"
                  checked={filters.matchFlooringPattern}
                  onChange={(e) => handleFilterChange('matchFlooringPattern', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                />
                <label htmlFor="matchFlooring" className="ml-2 text-sm">Match Flooring Pattern</label>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Min Sessions</label>
              <input
                type="number"
                min="1"
                value={filters.minSessions}
                onChange={(e) => handleFilterChange('minSessions', parseInt(e.target.value) || 1)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-900/30 border border-blue-800 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-300">Cohort Size:</span>
              <span className="font-bold text-blue-300">{similarSubjects.length}</span>
            </div>
            <p className="text-xs text-blue-200 mt-1">
              {similarSubjects.length > 0
                ? `Comparing with ${similarSubjects.length} similar subjects`
                : 'No similar subjects found. Try adjusting filters.'}
            </p>
          </div>
        </div>

        {/* Current Metrics Card */}
        <div className="bg-gray-800 rounded-lg p-5 shadow-lg">
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <Activity className="mr-2 text-purple-400" size={20} />
            Latest Session
          </h2>

          {selectedSubject && selectedSubject.sessions.length > 0 && (
            <div className="space-y-3">
              {(() => {
                const latest = selectedSubject.sessions[selectedSubject.sessions.length - 1];
                const trial = latest.trial_number;
                const cohortTrial = cohortData.byTrial[trial];

                const metrics = [
                  { key: 'cadence', label: 'Cadence', unit: 'spm', value: latest.cadence, avg: cohortTrial?.cadence, higher: true },
                  { key: 'symmetry', label: 'Symmetry', unit: '%', value: latest.symmetry, avg: cohortTrial?.symmetry, higher: true },
                  { key: 'balance_score', label: 'Balance', unit: '', value: latest.balance_score, avg: cohortTrial?.balance_score, higher: true },
                  { key: 'eeg_focus', label: 'Focus', unit: '', value: latest.eeg_focus, avg: cohortTrial?.eeg_focus, higher: true },
                ];

                return metrics.map(metric => {
                  if (!metric.value) return null;

                  const diff = metric.avg ? metric.value - metric.avg : 0;
                  const isPositive = metric.higher ? diff > 0 : diff < 0;

                  return (
                    <div key={metric.key} className="bg-gray-700 rounded-md p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">{metric.label}</span>
                        <div className="flex items-center">
                          <span className="font-bold text-lg mr-2">
                            {Math.round(metric.value)}{metric.unit}
                          </span>
                          {metric.avg && (
                            <span className={`text-xs px-2 py-0.5 rounded ${isPositive ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                              {diff > 0 ? '+' : ''}{Math.round(diff)}
                            </span>
                          )}
                        </div>
                      </div>
                      {metric.avg && (
                        <div className="text-xs text-gray-500 mt-1">
                          Cohort avg: {Math.round(metric.avg)}{metric.unit}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Timeline Charts */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <TrendingUp className="mr-2 text-blue-400" size={20} />
            Progression Timeline
          </h2>

          <div className="flex space-x-2">
            <button
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${activeMetric === 'spatial' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              onClick={() => setActiveMetric('spatial')}
            >
              <BarChart2 className="inline mr-1" size={14} />
              Spatial Metrics
            </button>
            <button
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${activeMetric === 'cognitive' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              onClick={() => setActiveMetric('cognitive')}
            >
              <Brain className="inline mr-1" size={14} />
              Cognitive Metrics
            </button>
          </div>
        </div>

        {activeMetric === 'spatial' && (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="trial"
                label={{ value: 'Session Number', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
                stroke="#6B7280"
              />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Legend />
              <Line type="monotone" dataKey="subject_cadence" stroke="#3b82f6" strokeWidth={2} name="Subject Cadence" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="cohort_cadence" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Cohort Avg Cadence" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="subject_symmetry" stroke="#10b981" strokeWidth={2} name="Subject Symmetry" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="cohort_symmetry" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Cohort Avg Symmetry" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="subject_balance" stroke="#f59e0b" strokeWidth={2} name="Subject Balance" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="cohort_balance" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Cohort Avg Balance" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeMetric === 'cognitive' && (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="trial"
                label={{ value: 'Session Number', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
                stroke="#6B7280"
              />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Legend />
              <Line type="monotone" dataKey="subject_focus" stroke="#8b5cf6" strokeWidth={2} name="Subject Focus" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="cohort_focus" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Cohort Avg Focus" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="subject_stress" stroke="#ef4444" strokeWidth={2} name="Subject Stress" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="cohort_stress" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="Cohort Avg Stress" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="subject_attention" stroke="#06b6d4" strokeWidth={2} name="Subject Attention" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="cohort_attention" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" name="Cohort Avg Attention" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom Row - Radar Chart and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Multi-Metric Radar */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Multi-Metric Comparison</h2>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <PolarRadiusAxis stroke="#6B7280" />
              <Radar name="Subject" dataKey="subject" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              <Radar name="Cohort Average" dataKey="cohort" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Research Insights */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Research Insights</h2>

          <div className="space-y-4">
            {/* Cohort Trends */}
            <div>
              <h3 className="font-semibold text-blue-300 mb-2 text-sm">Cohort Trends</h3>
              <ul className="space-y-1.5">
                {insights.trends.length > 0 ? (
                  insights.trends.map((trend, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      {trend}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-500">No trends available</li>
                )}
              </ul>
            </div>

            {/* Correlations */}
            <div>
              <h3 className="font-semibold text-purple-300 mb-2 text-sm">Multi-Modal Correlations</h3>
              <ul className="space-y-1.5">
                {insights.correlations.length > 0 ? (
                  insights.correlations.map((corr, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      {corr}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-500">No significant correlations</li>
                )}
              </ul>
            </div>

            {/* Outliers */}
            <div>
              <h3 className="font-semibold text-orange-300 mb-2 text-sm">Subject Notes</h3>
              <ul className="space-y-1.5">
                {insights.outliers.length > 0 ? (
                  insights.outliers.map((outlier, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start">
                      <span className="text-orange-400 mr-2">•</span>
                      {outlier}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-500">Subject within normal range</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Tarkett Flooring Analysis Section */}
      <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border-2 border-indigo-700/50 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Package className="mr-3 text-indigo-400" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-indigo-200">Tarkett Flooring Impact Analysis</h2>
              <p className="text-sm text-indigo-300">Sponsored Research: Understanding flooring patterns on geriatric mobility & cognition</p>
            </div>
          </div>
        </div>

        {/* Flooring Pattern Comparison Bar Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Mobility Impact */}
          <div className="bg-gray-800/80 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Activity className="mr-2 text-green-400" size={18} />
              Mobility Health by Flooring Pattern
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={flooringAnalysis} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#6B7280" />
                <YAxis dataKey="pattern" type="category" width={100} stroke="#6B7280" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Bar dataKey="avgBalance" fill="#10b981" name="Balance Score" />
                <Bar dataKey="avgSymmetry" fill="#3b82f6" name="Symmetry %" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 text-xs text-gray-400">
              Higher scores indicate better mobility health outcomes
            </div>
          </div>

          {/* Cognitive Impact */}
          <div className="bg-gray-800/80 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Brain className="mr-2 text-purple-400" size={18} />
              Cognitive Health by Flooring Pattern
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={flooringAnalysis} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#6B7280" />
                <YAxis dataKey="pattern" type="category" width={100} stroke="#6B7280" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Bar dataKey="avgFocus" fill="#8b5cf6" name="Focus" />
                <Bar dataKey="avgAttention" fill="#06b6d4" name="Attention" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 text-xs text-gray-400">
              Higher scores indicate better cognitive engagement
            </div>
          </div>
        </div>

        {/* Flooring Performance Rankings */}
        <div className="bg-gray-800/80 rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Award className="mr-2 text-yellow-400" size={18} />
            Flooring Pattern Performance Rankings (vs Control)
          </h3>

          <div className="space-y-3">
            {flooringRankings.map((ranking, idx) => {
              const overallScore = ((ranking.mobilityScore + ranking.cognitiveScore) / 2) * 100;
              const isPositive = overallScore >= 100;

              return (
                <div key={ranking.pattern} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${
                        idx === 0 ? 'bg-yellow-500/20 text-yellow-300 border-2 border-yellow-500' :
                        idx === 1 ? 'bg-gray-500/20 text-gray-300 border-2 border-gray-500' :
                        idx === 2 ? 'bg-orange-500/20 text-orange-300 border-2 border-orange-600' :
                        'bg-gray-600/20 text-gray-400 border border-gray-600'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-lg">{ranking.pattern}</div>
                        <div className="text-xs text-gray-400">{ranking.subjectCount} subjects tested</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {overallScore.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-400">Overall Score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                    <div className="bg-gray-800/60 rounded p-2">
                      <div className="text-gray-400 text-xs">Mobility Impact</div>
                      <div className={`font-semibold ${ranking.mobilityScore >= 1 ? 'text-green-300' : 'text-red-300'}`}>
                        {((ranking.mobilityScore - 1) * 100).toFixed(1)}% vs Control
                      </div>
                    </div>
                    <div className="bg-gray-800/60 rounded p-2">
                      <div className="text-gray-400 text-xs">Cognitive Impact</div>
                      <div className={`font-semibold ${ranking.cognitiveScore >= 1 ? 'text-green-300' : 'text-red-300'}`}>
                        {((ranking.cognitiveScore - 1) * 100).toFixed(1)}% vs Control
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                    <div>
                      <span className="text-gray-400">Balance Change: </span>
                      <span className={ranking.balanceChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {ranking.balanceChange >= 0 ? '+' : ''}{ranking.balanceChange.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Stress Change: </span>
                      <span className={ranking.stressChange <= 0 ? 'text-green-400' : 'text-red-400'}>
                        {ranking.stressChange >= 0 ? '+' : ''}{ranking.stressChange.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {flooringRankings.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No flooring comparison data available
            </div>
          )}
        </div>

        {/* Key Findings Summary */}
        <div className="mt-6 bg-indigo-900/40 border border-indigo-700/50 rounded-lg p-4">
          <h4 className="font-semibold text-indigo-200 mb-3">Key Research Findings</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-indigo-300 font-medium mb-1">📊 Sample Size</div>
              <div className="text-gray-300">
                {allSubjects.length} subjects across {flooringAnalysis.reduce((sum, f) => sum + f.sessionCount, 0)} total sessions
              </div>
            </div>
            <div>
              <div className="text-indigo-300 font-medium mb-1">🏆 Top Performer</div>
              <div className="text-gray-300">
                {flooringRankings.length > 0 ? flooringRankings[0].pattern : 'N/A'}
                {flooringRankings.length > 0 && (
                  <span className="text-green-400 ml-1">
                    (+{((flooringRankings[0].mobilityScore + flooringRankings[0].cognitiveScore) / 2 * 100 - 100).toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-indigo-300 font-medium mb-1">🎯 Pattern Variety</div>
              <div className="text-gray-300">
                {flooringAnalysis.filter(f => f.sessionCount > 0).length} unique patterns tested
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
