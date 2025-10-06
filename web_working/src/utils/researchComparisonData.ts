// Research subject comparison data utilities for spatial-EEG study
// This handles data fetching and aggregation for cohort analysis

export interface SubjectDemographics {
  id: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  height_cm: number;
  flooring_condition?: string;
  cognitive_baseline?: {
    focus: number;
    stress: number;
    attention: number;
  };
  subject_notes?: string;
}

export interface SessionMetrics {
  session_id: number;
  trial_number: number;
  timestamp: string;
  flooring_pattern: string;

  // Spatial/Gait metrics
  cadence?: number;
  symmetry?: number;
  step_length_symmetry?: number;
  balance_score?: number;
  cop_area?: number;
  sway_velocity?: number;
  load_distribution_left?: number;
  load_distribution_right?: number;
  stability_score?: number;

  // EEG/Cognitive metrics
  eeg_focus?: number;
  eeg_stress?: number;
  eeg_attention?: number;
  eeg_cognitive_load?: number;

  // Band power summary (averaged across channels)
  band_power?: {
    theta: number;
    alpha: number;
    beta: number;
    gamma: number;
  };
}

export interface SubjectData {
  demographics: SubjectDemographics;
  sessions: SessionMetrics[];
}

export interface ComparisonFilters {
  ageRange: number;
  matchGender: boolean;
  matchFlooringPattern: boolean;
  minSessions?: number;
}

// Fetch all subjects with their session data from the API
export async function fetchAllSubjects(): Promise<SubjectData[]> {
  try {
    const response = await fetch('/api/patients?limit=1000');
    if (!response.ok) throw new Error('Failed to fetch subjects');

    const subjects = await response.json();

    // Fetch sessions for each subject
    const subjectsWithSessions = await Promise.all(
      subjects.map(async (subject: any) => {
        const sessionsResponse = await fetch(`/api/sessions?patient_id=${subject.id}&limit=100`);
        const sessions = sessionsResponse.ok ? await sessionsResponse.json() : [];

        return {
          demographics: {
            id: subject.id,
            age: calculateAge(subject.date_of_birth),
            gender: subject.gender || 'other',
            height_cm: subject.height_cm || 0,
            flooring_condition: subject.flooring_condition,
            cognitive_baseline: subject.cognitive_baseline,
            subject_notes: subject.subject_notes
          },
          sessions: sessions.map((s: any) => ({
            session_id: s.id,
            trial_number: s.trial_number || 0,
            timestamp: s.start_ts,
            flooring_pattern: s.flooring_pattern || 'unknown',

            // Spatial metrics (would come from metrics_data or aggregated fields)
            cadence: s.avg_cadence,
            symmetry: s.avg_symmetry,
            balance_score: s.avg_balance_score,
            stability_score: s.avg_stability_score,

            // EEG metrics
            eeg_focus: s.eeg_avg_focus,
            eeg_stress: s.eeg_avg_stress,
            eeg_attention: s.eeg_avg_attention,
            eeg_cognitive_load: s.eeg_avg_cognitive_load,

            // Band power (if available)
            band_power: s.eeg_band_power_summary
          }))
        };
      })
    );

    return subjectsWithSessions;
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return [];
  }
}

// Calculate age from date of birth
function calculateAge(dateOfBirth: string | null): number {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Find similar subjects based on demographics and filters
export function findSimilarSubjects(
  subject: SubjectDemographics,
  allSubjects: SubjectData[],
  filters: ComparisonFilters
): SubjectData[] {
  const { ageRange, matchGender, matchFlooringPattern, minSessions = 1 } = filters;

  return allSubjects.filter(s => {
    // Don't include the subject itself
    if (s.demographics.id === subject.id) return false;

    // Filter by minimum sessions
    if (s.sessions.length < minSessions) return false;

    // Age matching
    const ageMatch = Math.abs(s.demographics.age - subject.age) <= ageRange;
    if (!ageMatch) return false;

    // Gender matching
    if (matchGender && s.demographics.gender !== subject.gender) return false;

    // Flooring pattern matching
    if (matchFlooringPattern && subject.flooring_condition) {
      if (s.demographics.flooring_condition !== subject.flooring_condition) return false;
    }

    return true;
  });
}

// Aggregate metrics across subjects by trial number
export function getAggregatedMetrics(subjects: SubjectData[]): {
  byTrial: Record<number, {
    // Spatial metrics
    cadence: number;
    symmetry: number;
    balance_score: number;
    stability_score: number;

    // EEG metrics
    eeg_focus: number;
    eeg_stress: number;
    eeg_attention: number;
    eeg_cognitive_load: number;

    count: number;
  }>
} {
  const aggregated: Record<number, any> = {};

  subjects.forEach(subject => {
    subject.sessions.forEach(session => {
      const trial = session.trial_number;

      if (!aggregated[trial]) {
        aggregated[trial] = {
          cadence: 0,
          symmetry: 0,
          balance_score: 0,
          stability_score: 0,
          eeg_focus: 0,
          eeg_stress: 0,
          eeg_attention: 0,
          eeg_cognitive_load: 0,
          count: 0
        };
      }

      // Sum up all metrics (we'll average later)
      if (session.cadence) aggregated[trial].cadence += session.cadence;
      if (session.symmetry) aggregated[trial].symmetry += session.symmetry;
      if (session.balance_score) aggregated[trial].balance_score += session.balance_score;
      if (session.stability_score) aggregated[trial].stability_score += session.stability_score;
      if (session.eeg_focus) aggregated[trial].eeg_focus += session.eeg_focus;
      if (session.eeg_stress) aggregated[trial].eeg_stress += session.eeg_stress;
      if (session.eeg_attention) aggregated[trial].eeg_attention += session.eeg_attention;
      if (session.eeg_cognitive_load) aggregated[trial].eeg_cognitive_load += session.eeg_cognitive_load;

      aggregated[trial].count += 1;
    });
  });

  // Calculate averages
  Object.keys(aggregated).forEach(trialStr => {
    const trial = parseInt(trialStr);
    const data = aggregated[trial];

    if (data.count > 0) {
      data.cadence = Math.round((data.cadence / data.count) * 10) / 10;
      data.symmetry = Math.round((data.symmetry / data.count) * 10) / 10;
      data.balance_score = Math.round((data.balance_score / data.count) * 10) / 10;
      data.stability_score = Math.round((data.stability_score / data.count) * 10) / 10;
      data.eeg_focus = Math.round((data.eeg_focus / data.count) * 10) / 10;
      data.eeg_stress = Math.round((data.eeg_stress / data.count) * 10) / 10;
      data.eeg_attention = Math.round((data.eeg_attention / data.count) * 10) / 10;
      data.eeg_cognitive_load = Math.round((data.eeg_cognitive_load / data.count) * 10) / 10;
    }
  });

  return { byTrial: aggregated };
}

// Calculate correlation between two metrics across all sessions
export function calculateCorrelation(
  subjects: SubjectData[],
  metric1: keyof SessionMetrics,
  metric2: keyof SessionMetrics
): number {
  const pairs: Array<[number, number]> = [];

  subjects.forEach(subject => {
    subject.sessions.forEach(session => {
      const val1 = session[metric1];
      const val2 = session[metric2];

      if (typeof val1 === 'number' && typeof val2 === 'number') {
        pairs.push([val1, val2]);
      }
    });
  });

  if (pairs.length < 2) return 0;

  // Calculate Pearson correlation coefficient
  const n = pairs.length;
  const sum1 = pairs.reduce((sum, [x]) => sum + x, 0);
  const sum2 = pairs.reduce((sum, [, y]) => sum + y, 0);
  const sum1Sq = pairs.reduce((sum, [x]) => sum + x * x, 0);
  const sum2Sq = pairs.reduce((sum, [, y]) => sum + y * y, 0);
  const pSum = pairs.reduce((sum, [x, y]) => sum + x * y, 0);

  const num = pSum - (sum1 * sum2 / n);
  const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));

  if (den === 0) return 0;

  return Math.round((num / den) * 100) / 100;
}

// Get cohort insights based on the data
export function getCohortInsights(
  selectedSubject: SubjectData,
  similarSubjects: SubjectData[]
): {
  trends: string[];
  correlations: string[];
  outliers: string[];
} {
  const insights = {
    trends: [] as string[],
    correlations: [] as string[],
    outliers: [] as string[]
  };

  if (similarSubjects.length === 0) return insights;

  // Calculate some basic trends
  const avgSessions = similarSubjects.reduce((sum, s) => sum + s.sessions.length, 0) / similarSubjects.length;
  insights.trends.push(`Cohort average: ${avgSessions.toFixed(1)} sessions per subject`);

  // Check flooring pattern distribution
  const flooringPatterns = new Map<string, number>();
  similarSubjects.forEach(s => {
    s.sessions.forEach(session => {
      const pattern = session.flooring_pattern || 'unknown';
      flooringPatterns.set(pattern, (flooringPatterns.get(pattern) || 0) + 1);
    });
  });

  const mostCommonPattern = Array.from(flooringPatterns.entries())
    .sort((a, b) => b[1] - a[1])[0];

  if (mostCommonPattern) {
    insights.trends.push(`Most tested pattern: ${mostCommonPattern[0]} (${mostCommonPattern[1]} sessions)`);
  }

  // Calculate correlations
  const focusBalanceCorr = calculateCorrelation(similarSubjects, 'eeg_focus', 'balance_score');
  if (Math.abs(focusBalanceCorr) > 0.3) {
    insights.correlations.push(
      `${focusBalanceCorr > 0 ? 'Positive' : 'Negative'} correlation between focus and balance (r=${focusBalanceCorr})`
    );
  }

  const stressStabilityCorr = calculateCorrelation(similarSubjects, 'eeg_stress', 'stability_score');
  if (Math.abs(stressStabilityCorr) > 0.3) {
    insights.correlations.push(
      `${stressStabilityCorr > 0 ? 'Positive' : 'Negative'} correlation between stress and stability (r=${stressStabilityCorr})`
    );
  }

  // Check if selected subject is an outlier
  if (selectedSubject.sessions.length > avgSessions * 1.5) {
    insights.outliers.push('This subject has more sessions than typical');
  } else if (selectedSubject.sessions.length < avgSessions * 0.5 && selectedSubject.sessions.length > 0) {
    insights.outliers.push('This subject has fewer sessions than typical');
  }

  return insights;
}
