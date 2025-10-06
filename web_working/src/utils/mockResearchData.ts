/**
 * Mock Research Session Data Generator
 *
 * Generates realistic research trial data with:
 * - EEG cognitive metrics (focus, stress, attention, cognitive load)
 * - Spatial/gait metrics from floor sensors
 * - Flooring pattern/condition information
 */

// Research Subject Interface
export interface ResearchSubject {
  id: number;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  flooring_condition: string;
  cognitive_baseline: {
    focus: number;
    stress: number;
    attention: number;
  };
  sessions_count: number;
  last_visit: string;
}

// Research Session Interface
export interface ResearchSession {
  id: string;
  subjectId: number;
  trialNumber: number;
  flooringPattern: string;
  startTime: string;
  endTime: string;
  duration: number;  // seconds

  // EEG Summary Metrics
  eeg: {
    avgFocus: number;
    avgStress: number;
    avgAttention: number;
    avgCognitiveLoad: number;
    contactQuality: {
      overall: number;
      channels: Record<string, number>;
    };
    bandPowerSummary: {
      theta: { avg: number; max: number };
      alpha: { avg: number; max: number };
      beta: { avg: number; max: number };
      gamma: { avg: number; max: number };
    };
  };

  // Spatial/Gait Metrics (time-series data points)
  metrics: any[];

  // Session Notes
  notes: string;
  environmentalNotes: string;
  selectedMetrics: string[];
}

// Mock Research Subjects
export const mockResearchSubjects: ResearchSubject[] = [
  {
    id: 1,
    first_name: "Margaret",
    last_name: "Thompson",
    age: 72,
    gender: "Female",
    flooring_condition: "Textured Grid Pattern",
    cognitive_baseline: { focus: 65, stress: 35, attention: 70 },
    sessions_count: 5,
    last_visit: "2025-09-28"
  },
  {
    id: 2,
    first_name: "Robert",
    last_name: "Chen",
    age: 68,
    gender: "Male",
    flooring_condition: "High-Contrast Stripes",
    cognitive_baseline: { focus: 72, stress: 28, attention: 75 },
    sessions_count: 4,
    last_visit: "2025-09-27"
  },
  {
    id: 3,
    first_name: "Dorothy",
    last_name: "Williams",
    age: 76,
    gender: "Female",
    flooring_condition: "Smooth Monochrome",
    cognitive_baseline: { focus: 58, stress: 42, attention: 62 },
    sessions_count: 6,
    last_visit: "2025-09-26"
  },
  {
    id: 4,
    first_name: "James",
    last_name: "Anderson",
    age: 70,
    gender: "Male",
    flooring_condition: "Directional Arrows",
    cognitive_baseline: { focus: 68, stress: 32, attention: 71 },
    sessions_count: 3,
    last_visit: "2025-09-25"
  },
  {
    id: 5,
    first_name: "Patricia",
    last_name: "Martinez",
    age: 74,
    gender: "Female",
    flooring_condition: "Organic Patterns",
    cognitive_baseline: { focus: 61, stress: 38, attention: 66 },
    sessions_count: 5,
    last_visit: "2025-09-24"
  }
];

// Generate progressive spatial metrics
function generateSpatialMetrics(sessionNumber: number, subjectId: number, flooringPattern: string) {
  const dataPoints = 30 + Math.floor(Math.random() * 20);
  const isEffectivePattern = ["Textured Grid Pattern", "High-Contrast Stripes", "Directional Arrows"].includes(flooringPattern);
  const progressRate = isEffectivePattern ? 0.7 : 0.3;

  return Array.from({ length: dataPoints }, (_, i) => {
    const progress = Math.min(1, (i / dataPoints) * progressRate * sessionNumber);
    const variability = Math.sin(i * 0.3) * 3;

    return {
      timestamp: Date.now() + i * 60000,
      cadence: 55 + progress * 25 + variability,
      symmetry: 65 + progress * 20,
      stepLengthSymmetry: 68 + progress * 18,
      stanceTimeAsymmetry: Math.max(5, 18 - progress * 12),
      gaitVariability: Math.max(3, 9 - progress * 5),
      balanceScore: Math.min(0.92, 0.55 + progress * 0.35),
      copArea: Math.max(2, 8 - progress * 4),
      swayVelocity: Math.max(1.5, 6 - progress * 3.5),
      stabilityScore: Math.min(95, 60 + progress * 30),
      stepCount: Math.floor(15 + i * 1.2)
    };
  });
}

// Generate EEG metrics based on flooring condition
function generateEEGMetrics(flooringPattern: string, cognitiveBaseline: any, sessionNumber: number) {
  // Effective patterns show lower stress and higher focus
  const isEffectivePattern = ["Textured Grid Pattern", "High-Contrast Stripes", "Directional Arrows"].includes(flooringPattern);

  const stressModifier = isEffectivePattern ? -10 : 5;
  const focusModifier = isEffectivePattern ? 8 : -5;
  const progressFactor = Math.min(1, sessionNumber * 0.15);

  return {
    avgFocus: Math.max(0, Math.min(100, cognitiveBaseline.focus + focusModifier * progressFactor + Math.random() * 5)),
    avgStress: Math.max(0, Math.min(100, cognitiveBaseline.stress + stressModifier * progressFactor + Math.random() * 5)),
    avgAttention: Math.max(0, Math.min(100, cognitiveBaseline.attention + focusModifier * 0.8 * progressFactor + Math.random() * 5)),
    avgCognitiveLoad: Math.max(0, Math.min(100, 45 + (isEffectivePattern ? -8 : 10) * progressFactor + Math.random() * 8)),
    contactQuality: {
      overall: 75 + Math.floor(Math.random() * 20),
      channels: {
        AF3: 3 + Math.floor(Math.random() * 2),
        AF4: 3 + Math.floor(Math.random() * 2),
        T7: 2 + Math.floor(Math.random() * 2),
        T8: 2 + Math.floor(Math.random() * 2),
        Pz: 2 + Math.floor(Math.random() * 2)
      }
    },
    bandPowerSummary: {
      theta: { avg: 0.25 + Math.random() * 0.15, max: 0.45 + Math.random() * 0.2 },
      alpha: { avg: 0.35 + Math.random() * 0.2, max: 0.65 + Math.random() * 0.25 },
      beta: { avg: 0.2 + Math.random() * 0.15, max: 0.4 + Math.random() * 0.2 },
      gamma: { avg: 0.15 + Math.random() * 0.1, max: 0.3 + Math.random() * 0.15 }
    }
  };
}

// Generate research notes based on session data
function generateResearchNotes(
  trialNumber: number,
  flooringPattern: string,
  eegMetrics: any,
  spatialMetrics: any[]
) {
  const avgStability = spatialMetrics.reduce((sum, m) => sum + m.stabilityScore, 0) / spatialMetrics.length;
  const avgSymmetry = spatialMetrics.reduce((sum, m) => sum + m.symmetry, 0) / spatialMetrics.length;

  const notes = [
    `Trial ${trialNumber} - Testing ${flooringPattern} flooring condition.`,
    `Subject demonstrated ${avgStability > 75 ? 'good' : avgStability > 60 ? 'moderate' : 'reduced'} stability (avg: ${avgStability.toFixed(1)}%).`,
    `Gait symmetry measured at ${avgSymmetry.toFixed(1)}%.`,
    `EEG data shows average focus at ${eegMetrics.avgFocus.toFixed(1)}% and stress at ${eegMetrics.avgStress.toFixed(1)}%.`,
    eegMetrics.avgStress < 35 ? 'Subject appeared comfortable with flooring pattern.' : 'Elevated stress levels observed during navigation.',
    avgStability > 75 && eegMetrics.avgFocus > 70 ? 'Pattern appears to support confident navigation.' : 'Further evaluation needed.'
  ];

  return notes.join(' ');
}

// Mock session data for each subject
const flooringPatterns = [
  "Textured Grid Pattern",
  "High-Contrast Stripes",
  "Smooth Monochrome",
  "Directional Arrows",
  "Organic Patterns"
];

export function generateMockResearchSessions(subjectId: number): ResearchSession[] {
  const subject = mockResearchSubjects.find(s => s.id === subjectId);
  if (!subject) return [];

  const sessions: ResearchSession[] = [];
  const baseDate = new Date('2025-09-01');

  for (let i = 1; i <= subject.sessions_count; i++) {
    const sessionDate = new Date(baseDate);
    sessionDate.setDate(baseDate.getDate() + (i - 1) * 7); // Weekly trials

    const startTime = new Date(sessionDate);
    startTime.setHours(10, 0, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + 45 + Math.floor(Math.random() * 15));

    const flooringPattern = i <= 5 ? flooringPatterns[i - 1] : subject.flooring_condition;
    const spatialMetrics = generateSpatialMetrics(i, subjectId, flooringPattern);
    const eegMetrics = generateEEGMetrics(flooringPattern, subject.cognitive_baseline, i);

    sessions.push({
      id: `session-${subjectId}-${i}`,
      subjectId: subjectId,
      trialNumber: i,
      flooringPattern: flooringPattern,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: Math.floor((endTime.getTime() - startTime.getTime()) / 1000),
      eeg: eegMetrics,
      metrics: spatialMetrics,
      notes: generateResearchNotes(i, flooringPattern, eegMetrics, spatialMetrics),
      environmentalNotes: `Lab temperature: ${68 + Math.floor(Math.random() * 4)}°F, Lighting: ${800 + Math.floor(Math.random() * 200)} lux, Time of day: Morning`,
      selectedMetrics: ['cadence', 'symmetry', 'balanceScore', 'gaitVariability', 'stabilityScore']
    });
  }

  return sessions;
}
