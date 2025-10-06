// Dummy data generator for research subject comparison
// Generates realistic spatial-EEG data for demonstration

import { SubjectData, SubjectDemographics, SessionMetrics } from './researchComparisonData';

const FLOORING_PATTERNS = [
  'Hexagonal',
  'Square Grid',
  'Diagonal',
  'Random',
  'Control (Flat)'
];

const GENDERS = ['male', 'female'] as const;

// Generate a single research subject with realistic progression
function generateSubject(id: number): SubjectData {
  const age = 65 + Math.floor(Math.random() * 25); // 65-90 years old
  const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];
  const height_cm = gender === 'male'
    ? 165 + Math.floor(Math.random() * 20) // 165-185cm
    : 155 + Math.floor(Math.random() * 15); // 155-170cm

  const flooring_condition = FLOORING_PATTERNS[Math.floor(Math.random() * FLOORING_PATTERNS.length)];

  // Cognitive baseline (random but consistent for subject)
  const cognitive_baseline = {
    focus: 40 + Math.random() * 30, // 40-70
    stress: 20 + Math.random() * 30, // 20-50
    attention: 45 + Math.random() * 25 // 45-70
  };

  const demographics: SubjectDemographics = {
    id,
    age,
    gender,
    height_cm,
    flooring_condition,
    cognitive_baseline,
    subject_notes: `Subject ${id} - ${age}yo ${gender}`
  };

  // Generate 3-8 sessions with realistic progression
  const numSessions = 3 + Math.floor(Math.random() * 6);
  const sessions: SessionMetrics[] = [];

  // Subject's inherent characteristics (affect all sessions)
  const baselineCadence = 95 + Math.random() * 25; // 95-120 steps/min
  const baselineSymmetry = 75 + Math.random() * 15; // 75-90%
  const baselineBalance = 60 + Math.random() * 20; // 60-80
  const baselineFocus = cognitive_baseline.focus;
  const baselineStress = cognitive_baseline.stress;
  const baselineAttention = cognitive_baseline.attention;

  // Pattern difficulty affects metrics differently
  const patternDifficulty = flooring_condition === 'Control (Flat)' ? 0
    : flooring_condition === 'Hexagonal' ? 0.15
    : flooring_condition === 'Square Grid' ? 0.1
    : flooring_condition === 'Diagonal' ? 0.2
    : 0.25; // Random

  for (let trial = 1; trial <= numSessions; trial++) {
    // Progressive improvement over sessions (learning effect)
    const improvementFactor = Math.min(trial * 0.05, 0.25); // Max 25% improvement

    // Session-specific variation
    const sessionVariation = () => -5 + Math.random() * 10;

    // Spatial metrics (affected by pattern difficulty and learning)
    const cadence = Math.round(
      baselineCadence * (1 - patternDifficulty * 0.2) * (1 + improvementFactor) + sessionVariation()
    );

    const symmetry = Math.round(
      Math.min(95, baselineSymmetry * (1 - patternDifficulty * 0.15) * (1 + improvementFactor) + sessionVariation())
    );

    const balance_score = Math.round(
      Math.min(95, baselineBalance * (1 - patternDifficulty * 0.3) * (1 + improvementFactor) + sessionVariation())
    );

    const cop_area = Math.round(
      (100 + Math.random() * 50) * (1 + patternDifficulty * 0.4) * (1 - improvementFactor * 0.3)
    );

    const sway_velocity = Math.round(
      (50 + Math.random() * 30) * (1 + patternDifficulty * 0.3) * (1 - improvementFactor * 0.2) * 10
    ) / 10;

    const stability_score = Math.round(
      Math.min(90, balance_score * 0.9 + sessionVariation())
    );

    // Cognitive metrics (EEG) - inversely correlated with difficulty
    const cognitive_load = Math.round(
      30 + patternDifficulty * 40 - improvementFactor * 20 + sessionVariation()
    );

    const eeg_focus = Math.round(
      Math.max(20, Math.min(95, baselineFocus * (1 + improvementFactor * 0.2) - patternDifficulty * 15 + sessionVariation()))
    );

    const eeg_stress = Math.round(
      Math.max(10, Math.min(80, baselineStress + patternDifficulty * 20 - improvementFactor * 10 + sessionVariation()))
    );

    const eeg_attention = Math.round(
      Math.max(30, Math.min(90, baselineAttention * (1 + improvementFactor * 0.15) - patternDifficulty * 10 + sessionVariation()))
    );

    // Band power data (realistic values for geriatric subjects)
    const band_power = {
      theta: Math.round((4 + Math.random() * 3) * 10) / 10, // 4-7 µV
      alpha: Math.round((8 + Math.random() * 5) * 10) / 10, // 8-13 µV (typically higher at rest)
      beta: Math.round((3 + Math.random() * 2 + patternDifficulty * 2) * 10) / 10, // 3-7 µV (increases with cognitive load)
      gamma: Math.round((1 + Math.random() * 1.5) * 10) / 10 // 1-2.5 µV
    };

    const session: SessionMetrics = {
      session_id: id * 1000 + trial,
      trial_number: trial,
      timestamp: new Date(Date.now() - (numSessions - trial) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      flooring_pattern: flooring_condition,

      // Spatial metrics
      cadence,
      symmetry,
      step_length_symmetry: Math.round(symmetry * (0.9 + Math.random() * 0.15)),
      balance_score,
      cop_area,
      sway_velocity,
      load_distribution_left: Math.round(45 + Math.random() * 10),
      load_distribution_right: Math.round(45 + Math.random() * 10),
      stability_score,

      // EEG metrics
      eeg_focus,
      eeg_stress,
      eeg_attention,
      eeg_cognitive_load: cognitive_load,

      // Band power
      band_power
    };

    sessions.push(session);
  }

  return {
    demographics,
    sessions
  };
}

// Generate a full dataset of research subjects
export function generateResearchDataset(numSubjects: number = 50): SubjectData[] {
  const subjects: SubjectData[] = [];

  for (let i = 1; i <= numSubjects; i++) {
    subjects.push(generateSubject(i));
  }

  return subjects;
}

// Export for use in SubjectComparisonView
export const DEMO_SUBJECTS = generateResearchDataset(50);
