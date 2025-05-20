import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CollapsiblePanel } from '../../components/CollapsiblePanel';
import { User, Calendar, ArrowLeft, ClipboardList } from 'lucide-react';
import PTSessionSummary from '../../components/PTSessionSummary';
import NoteGenerator from '../../components/NoteGenerator';

// Define the Patient interface
interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  diagnosis: string;
  sessions_count: number;
  last_visit: string;
}

// Define the Session interface
interface Session {
  id: string;
  patientId: number;
  startTime: string;
  endTime: string;
  duration: number;
  metrics: any[];
  notes: string;
  selectedMetrics: string[];
}

interface PatientDetailViewProps {
  patient: Patient;
  onBack: () => void;
}

// Generate realistic metrics that show progression over time
interface MetricsConfig {
  startTime: string;
  initialCadence: number;
  initialSymmetry: number;
  initialStepLengthSymmetry: number;
  initialStanceTimeAsymmetry: number;
  initialGaitVariability: number;
  initialBalanceScore: number;
  initialWeightAsymmetry: number;
  initialLeftKneeROM: number;
  initialRightKneeROM: number;
}

const generateProgressMetrics = (sessionNumber: number, baseConfig: MetricsConfig, patientId: number) => {
  // Create different progress patterns based on patient ID
  const isImprovingPatient = patientId % 2 === 0; // Even IDs improve more quickly
  const progressRate = isImprovingPatient ? 0.8 : 0.4;
  
  // More datapoints for longer sessions
  const dataPoints = 25 + Math.floor(Math.random() * 15);
  
  return Array.from({ length: dataPoints }, (_, i) => {
    const progress = Math.min(1, (i / dataPoints) * progressRate * sessionNumber);
    const variability = Math.sin(i * 0.4) * 5; // Add some variability
    
    return {
      timestamp: new Date(baseConfig.startTime).getTime() + i * 60000,
      cadence: baseConfig.initialCadence + progress * 20 + variability,
      symmetry: baseConfig.initialSymmetry + progress * 15,
      stepLengthSymmetry: baseConfig.initialStepLengthSymmetry + progress * 12,
      stanceTimeAsymmetry: Math.max(3, baseConfig.initialStanceTimeAsymmetry - progress * 10),
      gaitVariability: Math.max(2, baseConfig.initialGaitVariability - progress * 5),
      balanceScore: Math.min(0.95, baseConfig.initialBalanceScore + progress * 0.25),
      weightBearing: {
        left: 50 - baseConfig.initialWeightAsymmetry + progress * baseConfig.initialWeightAsymmetry,
        right: 50 + baseConfig.initialWeightAsymmetry - progress * baseConfig.initialWeightAsymmetry,
      },
      range: {
        leftKnee: baseConfig.initialLeftKneeROM + progress * 15,
        rightKnee: baseConfig.initialRightKneeROM + progress * 10,
      },
      stepCount: Math.floor(20 + i * 1.5)
    };
  });
};

// Enhanced mock sessions with more complete data for each patient
const mockSessions: Session[] = [
  // PATIENT 1 (John Doe) - Post-operative rehabilitation
  {
    id: 'session-1-1',
    patientId: 1,
    startTime: '2023-05-01T10:00:00Z',
    endTime: '2023-05-01T10:45:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(1, {
      startTime: '2023-05-01T10:00:00Z',
      initialCadence: 70,
      initialSymmetry: 60,
      initialStepLengthSymmetry: 65,
      initialStanceTimeAsymmetry: 18,
      initialGaitVariability: 8.5,
      initialBalanceScore: 0.55,
      initialWeightAsymmetry: 12,
      initialLeftKneeROM: 95,
      initialRightKneeROM: 110
    }, 1),
    notes: 'Initial session post-surgery. Patient reported 5/10 pain. Limited weight bearing on right side. Focusing on basic ROM exercises and proper gait pattern education.',
    selectedMetrics: ['cadence', 'symmetry', 'stepLengthSymmetry', 'stanceTime']
  },
  {
    id: 'session-1-2',
    patientId: 1,
    startTime: '2023-05-05T11:30:00Z',
    endTime: '2023-05-05T12:15:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(2, {
      startTime: '2023-05-05T11:30:00Z',
      initialCadence: 75,
      initialSymmetry: 65,
      initialStepLengthSymmetry: 68,
      initialStanceTimeAsymmetry: 16,
      initialGaitVariability: 7.5,
      initialBalanceScore: 0.6,
      initialWeightAsymmetry: 10,
      initialLeftKneeROM: 100,
      initialRightKneeROM: 112
    }, 1),
    notes: 'Patient reports decreased pain (3/10). Improved weight bearing on right side. Worked on weight shifting and balance exercises. Introduced light resistance band work.',
    selectedMetrics: ['cadence', 'symmetry', 'stepLengthSymmetry', 'balanceScore']
  },
  {
    id: 'session-1-3',
    patientId: 1,
    startTime: '2023-05-10T13:00:00Z',
    endTime: '2023-05-10T13:45:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(3, {
      startTime: '2023-05-10T13:00:00Z',
      initialCadence: 80,
      initialSymmetry: 70,
      initialStepLengthSymmetry: 75,
      initialStanceTimeAsymmetry: 15,
      initialGaitVariability: 6.5,
      initialBalanceScore: 0.65,
      initialWeightAsymmetry: 8,
      initialLeftKneeROM: 105,
      initialRightKneeROM: 115
    }, 1),
    notes: 'Patient reported mild discomfort during weight-bearing exercises. Focus on gait training and balance exercises. Noted significant improvement in symmetry during ambulation.',
    selectedMetrics: ['cadence', 'stepLengthSymmetry', 'gaitVariability']
  },
  {
    id: 'session-1-4',
    patientId: 1,
    startTime: '2023-05-17T14:00:00Z',
    endTime: '2023-05-17T14:45:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(4, {
      startTime: '2023-05-17T14:00:00Z',
      initialCadence: 85,
      initialSymmetry: 78,
      initialStepLengthSymmetry: 80,
      initialStanceTimeAsymmetry: 10,
      initialGaitVariability: 5,
      initialBalanceScore: 0.7,
      initialWeightAsymmetry: 6,
      initialLeftKneeROM: 110,
      initialRightKneeROM: 118
    }, 1),
    notes: 'Continued with gait training. Patient demonstrates improved cadence and symmetry compared to previous session. Introduced functional strengthening exercises with focus on proper mechanics.',
    selectedMetrics: ['cadence', 'symmetry', 'stanceTime', 'stepLengthSymmetry']
  },
  {
    id: 'session-1-5',
    patientId: 1,
    startTime: '2023-05-24T09:30:00Z',
    endTime: '2023-05-24T10:15:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(5, {
      startTime: '2023-05-24T09:30:00Z',
      initialCadence: 90,
      initialSymmetry: 82,
      initialStepLengthSymmetry: 84,
      initialStanceTimeAsymmetry: 8,
      initialGaitVariability: 4.5,
      initialBalanceScore: 0.75,
      initialWeightAsymmetry: 5,
      initialLeftKneeROM: 115,
      initialRightKneeROM: 120
    }, 1),
    notes: 'Pain now at 1/10. Significant improvements in all parameters. Patient able to perform moderate intensity exercises with good form. Balance continues to improve. Preparing for return to recreational activities.',
    selectedMetrics: ['cadence', 'symmetry', 'balanceScore', 'gaitVariability', 'stepLengthSymmetry']
  },
  
  // PATIENT 2 (Jane Smith) - ACL reconstruction
  {
    id: 'session-2-1',
    patientId: 2,
    startTime: '2023-04-20T09:00:00Z',
    endTime: '2023-04-20T09:45:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(1, {
      startTime: '2023-04-20T09:00:00Z',
      initialCadence: 65,
      initialSymmetry: 55,
      initialStepLengthSymmetry: 60,
      initialStanceTimeAsymmetry: 20,
      initialGaitVariability: 9,
      initialBalanceScore: 0.5,
      initialWeightAsymmetry: 15,
      initialLeftKneeROM: 90,
      initialRightKneeROM: 105
    }, 2),
    notes: 'First post-op session after ACL reconstruction. Pain rated 6/10. Very limited weight-bearing on left leg. Focusing on quadriceps activation and maintaining ROM.',
    selectedMetrics: ['symmetry', 'stanceTime', 'balanceScore']
  },
  {
    id: 'session-2-2',
    patientId: 2,
    startTime: '2023-04-25T10:30:00Z',
    endTime: '2023-04-25T11:15:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(2, {
      startTime: '2023-04-25T10:30:00Z',
      initialCadence: 72,
      initialSymmetry: 62,
      initialStepLengthSymmetry: 65,
      initialStanceTimeAsymmetry: 18,
      initialGaitVariability: 8,
      initialBalanceScore: 0.55,
      initialWeightAsymmetry: 13,
      initialLeftKneeROM: 95,
      initialRightKneeROM: 110
    }, 2),
    notes: 'Pain decreased to 4/10. Improved quadriceps control. Working on progressive weight-bearing. Introduced closed-chain exercises within safe ROM.',
    selectedMetrics: ['cadence', 'symmetry', 'stepLengthSymmetry']
  },
  {
    id: 'session-2-3',
    patientId: 2,
    startTime: '2023-05-01T11:00:00Z',
    endTime: '2023-05-01T11:45:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(3, {
      startTime: '2023-05-01T11:00:00Z',
      initialCadence: 80,
      initialSymmetry: 70,
      initialStepLengthSymmetry: 72,
      initialStanceTimeAsymmetry: 15,
      initialGaitVariability: 7,
      initialBalanceScore: 0.63,
      initialWeightAsymmetry: 10,
      initialLeftKneeROM: 105,
      initialRightKneeROM: 115
    }, 2),
    notes: 'Good progress with weight-bearing. Pain now at 3/10. Focusing on balance activities and neuromuscular re-education. Starting to address gait deviations.',
    selectedMetrics: ['cadence', 'symmetry', 'balanceScore', 'gaitVariability']
  },
  {
    id: 'session-2-4',
    patientId: 2,
    startTime: '2023-05-08T14:00:00Z',
    endTime: '2023-05-08T14:45:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(4, {
      startTime: '2023-05-08T14:00:00Z',
      initialCadence: 88,
      initialSymmetry: 80,
      initialStepLengthSymmetry: 82,
      initialStanceTimeAsymmetry: 12,
      initialGaitVariability: 5.5,
      initialBalanceScore: 0.71,
      initialWeightAsymmetry: 7,
      initialLeftKneeROM: 110,
      initialRightKneeROM: 120
    }, 2),
    notes: 'Focused on balance exercises and proprioception training. Patient showing good progress with improved symmetry. Gait pattern normalizing with better weight acceptance on left leg.',
    selectedMetrics: ['cadence', 'stanceTime', 'stepLengthSymmetry']
  },
  {
    id: 'session-2-5',
    patientId: 2,
    startTime: '2023-05-15T09:30:00Z',
    endTime: '2023-05-15T10:15:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(5, {
      startTime: '2023-05-15T09:30:00Z',
      initialCadence: 95,
      initialSymmetry: 87,
      initialStepLengthSymmetry: 88,
      initialStanceTimeAsymmetry: 8,
      initialGaitVariability: 4,
      initialBalanceScore: 0.78,
      initialWeightAsymmetry: 5,
      initialLeftKneeROM: 120,
      initialRightKneeROM: 125
    }, 2),
    notes: 'Excellent progress today. Starting plyometric training and sport-specific drills at low intensity. Gait almost normalized with minimal deviations. Balance significantly improved.',
    selectedMetrics: ['cadence', 'symmetry', 'stepLengthSymmetry', 'balanceScore']
  },
  
  // PATIENT 3 (Robert Johnson) - Lower back pain
  {
    id: 'session-3-1',
    patientId: 3,
    startTime: '2023-04-15T13:00:00Z',
    endTime: '2023-04-15T13:45:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(1, {
      startTime: '2023-04-15T13:00:00Z',
      initialCadence: 75,
      initialSymmetry: 70,
      initialStepLengthSymmetry: 75,
      initialStanceTimeAsymmetry: 10,
      initialGaitVariability: 6,
      initialBalanceScore: 0.65,
      initialWeightAsymmetry: 8,
      initialLeftKneeROM: 115,
      initialRightKneeROM: 115
    }, 3),
    notes: 'Initial evaluation for chronic lower back pain. Patient reports 7/10 pain with prolonged standing and walking. Gait shows reduced pelvic rotation and trunk stiffness. Avoiding forward flexion.',
    selectedMetrics: ['cadence', 'symmetry', 'gaitVariability']
  },
  {
    id: 'session-3-2',
    patientId: 3,
    startTime: '2023-04-22T14:30:00Z',
    endTime: '2023-04-22T15:15:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(2, {
      startTime: '2023-04-22T14:30:00Z',
      initialCadence: 78,
      initialSymmetry: 73,
      initialStepLengthSymmetry: 77,
      initialStanceTimeAsymmetry: 9,
      initialGaitVariability: 5.5,
      initialBalanceScore: 0.68,
      initialWeightAsymmetry: 7,
      initialLeftKneeROM: 115,
      initialRightKneeROM: 115
    }, 3),
    notes: 'Pain decreased slightly to 6/10. Introduced core stabilization exercises and proper body mechanics. Working on increasing lumbar mobility while maintaining stability during movement.',
    selectedMetrics: ['symmetry', 'balanceScore', 'stepLengthSymmetry']
  },
  {
    id: 'session-3-3',
    patientId: 3,
    startTime: '2023-04-29T13:30:00Z',
    endTime: '2023-04-29T14:15:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(3, {
      startTime: '2023-04-29T13:30:00Z',
      initialCadence: 82,
      initialSymmetry: 76,
      initialStepLengthSymmetry: 80,
      initialStanceTimeAsymmetry: 8,
      initialGaitVariability: 5,
      initialBalanceScore: 0.72,
      initialWeightAsymmetry: 6,
      initialLeftKneeROM: 115,
      initialRightKneeROM: 115
    }, 3),
    notes: 'Pain reduced to 5/10. Improved tolerance for walking and standing activities. Focusing on dynamic core stability and proprioceptive training. Added gentle hip mobility exercises.',
    selectedMetrics: ['cadence', 'symmetry', 'gaitVariability', 'balanceScore']
  },
  {
    id: 'session-3-4',
    patientId: 3,
    startTime: '2023-05-06T15:00:00Z',
    endTime: '2023-05-06T15:45:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(4, {
      startTime: '2023-05-06T15:00:00Z',
      initialCadence: 84,
      initialSymmetry: 80,
      initialStepLengthSymmetry: 82,
      initialStanceTimeAsymmetry: 7,
      initialGaitVariability: 4.5,
      initialBalanceScore: 0.75,
      initialWeightAsymmetry: 5,
      initialLeftKneeROM: 115,
      initialRightKneeROM: 115
    }, 3),
    notes: 'Good progress today. Pain now at 4/10. Better pelvic rotation during gait. Added functional movement patterns and light resistance training. Home program adherence is excellent.',
    selectedMetrics: ['cadence', 'symmetry', 'stepLengthSymmetry']
  },
  {
    id: 'session-3-5',
    patientId: 3,
    startTime: '2023-05-07T10:00:00Z',
    endTime: '2023-05-07T10:45:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(5, {
      startTime: '2023-05-07T10:00:00Z',
      initialCadence: 88,
      initialSymmetry: 84,
      initialStepLengthSymmetry: 85,
      initialStanceTimeAsymmetry: 6,
      initialGaitVariability: 4,
      initialBalanceScore: 0.8,
      initialWeightAsymmetry: 4,
      initialLeftKneeROM: 115,
      initialRightKneeROM: 115
    }, 3),
    notes: 'Patient reports pain at 3/10, significantly improved. Able to walk for 30 minutes without significant discomfort. Progressing to more challenging exercises. Gait pattern normalizing with better spinal mobility.',
    selectedMetrics: ['cadence', 'symmetry', 'gaitVariability', 'balanceScore', 'stepLengthSymmetry']
  },
  
  // PATIENT 4 (Maria Garcia) - Shoulder impingement
  {
    id: 'session-4-1',
    patientId: 4,
    startTime: '2023-04-18T09:00:00Z',
    endTime: '2023-04-18T09:45:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(1, {
      startTime: '2023-04-18T09:00:00Z',
      initialCadence: 95,
      initialSymmetry: 75,
      initialStepLengthSymmetry: 80,
      initialStanceTimeAsymmetry: 8,
      initialGaitVariability: 5,
      initialBalanceScore: 0.70,
      initialWeightAsymmetry: 14,
      initialLeftKneeROM: 120,
      initialRightKneeROM: 120
    }, 4),
    notes: 'Initial evaluation for shoulder impingement. Patient reports 6/10 pain with overhead activities and reaching behind back. Limited ROM in all planes. Focus on scapular positioning and postural education.',
    selectedMetrics: ['symmetry', 'balanceScore', 'gaitVariability']
  },
  {
    id: 'session-4-2',
    patientId: 4,
    startTime: '2023-04-25T10:15:00Z',
    endTime: '2023-04-25T11:00:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(2, {
      startTime: '2023-04-25T10:15:00Z',
      initialCadence: 95,
      initialSymmetry: 78,
      initialStepLengthSymmetry: 82,
      initialStanceTimeAsymmetry: 7,
      initialGaitVariability: 4.5,
      initialBalanceScore: 0.73,
      initialWeightAsymmetry: 12,
      initialLeftKneeROM: 120,
      initialRightKneeROM: 120
    }, 4),
    notes: 'Pain reduced to 5/10. Shoulder ROM improving slightly. Introduced light resistance exercises for scapular retraction and depression. Added gentle ROM exercises within pain-free range.',
    selectedMetrics: ['cadence', 'symmetry', 'balanceScore']
  },
  {
    id: 'session-4-3',
    patientId: 4,
    startTime: '2023-05-02T14:00:00Z',
    endTime: '2023-05-02T14:45:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(3, {
      startTime: '2023-05-02T14:00:00Z',
      initialCadence: 96,
      initialSymmetry: 81,
      initialStepLengthSymmetry: 84,
      initialStanceTimeAsymmetry: 6,
      initialGaitVariability: 4.2,
      initialBalanceScore: 0.76,
      initialWeightAsymmetry: 10,
      initialLeftKneeROM: 120,
      initialRightKneeROM: 120
    }, 4),
    notes: 'Pain decreased to 4/10. ROM continues to improve gradually. Adding more advanced scapular stabilization exercises. Working on correcting movement patterns during functional reach tasks.',
    selectedMetrics: ['symmetry', 'balanceScore', 'gaitVariability']
  },
  {
    id: 'session-4-4',
    patientId: 4,
    startTime: '2023-05-09T11:30:00Z',
    endTime: '2023-05-09T12:15:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(4, {
      startTime: '2023-05-09T11:30:00Z',
      initialCadence: 97,
      initialSymmetry: 84,
      initialStepLengthSymmetry: 86,
      initialStanceTimeAsymmetry: 5,
      initialGaitVariability: 3.8,
      initialBalanceScore: 0.79,
      initialWeightAsymmetry: 8,
      initialLeftKneeROM: 120,
      initialRightKneeROM: 120
    }, 4),
    notes: 'Continued improvement with pain now at 3/10. Good progress with scapular control. Added rotator cuff strengthening exercises with resistance bands. Patient reporting improved function with daily activities.',
    selectedMetrics: ['cadence', 'symmetry', 'balanceScore']
  },
  {
    id: 'session-4-5',
    patientId: 4,
    startTime: '2023-05-13T15:00:00Z',
    endTime: '2023-05-13T15:45:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(5, {
      startTime: '2023-05-13T15:00:00Z',
      initialCadence: 98,
      initialSymmetry: 87,
      initialStepLengthSymmetry: 88,
      initialStanceTimeAsymmetry: 4,
      initialGaitVariability: 3.5,
      initialBalanceScore: 0.82,
      initialWeightAsymmetry: 6,
      initialLeftKneeROM: 120,
      initialRightKneeROM: 120
    }, 4),
    notes: 'Pain now at 2/10 with overhead activities. ROM significantly improved in all planes. Progressing to more advanced strength exercises and beginning sport-specific movements. Balance and posture have improved considerably.',
    selectedMetrics: ['symmetry', 'balanceScore', 'gaitVariability', 'cadence']
  },
  
  // PATIENT 5 (William Brown) - Hip replacement
  {
    id: 'session-5-1',
    patientId: 5,
    startTime: '2023-04-10T13:30:00Z',
    endTime: '2023-04-10T14:15:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(1, {
      startTime: '2023-04-10T13:30:00Z',
      initialCadence: 60,
      initialSymmetry: 50,
      initialStepLengthSymmetry: 55,
      initialStanceTimeAsymmetry: 25,
      initialGaitVariability: 12,
      initialBalanceScore: 0.45,
      initialWeightAsymmetry: 20,
      initialLeftKneeROM: 90,
      initialRightKneeROM: 90
    }, 5),
    notes: 'Post-op hip replacement evaluation. Patient using walker for all mobility. Pain rated 7/10. Very limited weight bearing on surgical side. Focus on gentle ROM exercises and proper transfer techniques.',
    selectedMetrics: ['symmetry', 'weightBearing', 'balanceScore']
  },
  {
    id: 'session-5-2',
    patientId: 5,
    startTime: '2023-04-17T13:00:00Z',
    endTime: '2023-04-17T13:45:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(2, {
      startTime: '2023-04-17T13:00:00Z',
      initialCadence: 65,
      initialSymmetry: 55,
      initialStepLengthSymmetry: 58,
      initialStanceTimeAsymmetry: 22,
      initialGaitVariability: 10,
      initialBalanceScore: 0.50,
      initialWeightAsymmetry: 18,
      initialLeftKneeROM: 95,
      initialRightKneeROM: 95
    }, 5),
    notes: 'Progressing from walker to cane. Pain decreased to 5/10. Increased weight bearing on surgical limb. Added gentle hip strengthening exercises and continued with ROM progression.',
    selectedMetrics: ['cadence', 'symmetry', 'balanceScore', 'weightBearing']
  },
  {
    id: 'session-5-3',
    patientId: 5,
    startTime: '2023-04-24T14:30:00Z',
    endTime: '2023-04-24T15:15:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(3, {
      startTime: '2023-04-24T14:30:00Z',
      initialCadence: 72,
      initialSymmetry: 60,
      initialStepLengthSymmetry: 65,
      initialStanceTimeAsymmetry: 18,
      initialGaitVariability: 8,
      initialBalanceScore: 0.58,
      initialWeightAsymmetry: 15,
      initialLeftKneeROM: 105,
      initialRightKneeROM: 105
    }, 5),
    notes: 'Using cane for longer distances, attempting short distances without assistive device. Pain at 4/10. Gait pattern improving but still demonstrates Trendelenburg sign. Working on hip abductor strengthening and weight shifting exercises.',
    selectedMetrics: ['cadence', 'symmetry', 'stanceTime', 'balanceScore']
  },
  {
    id: 'session-5-4',
    patientId: 5,
    startTime: '2023-05-01T10:00:00Z',
    endTime: '2023-05-01T10:45:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(4, {
      startTime: '2023-05-01T10:00:00Z',
      initialCadence: 78,
      initialSymmetry: 68,
      initialStepLengthSymmetry: 72,
      initialStanceTimeAsymmetry: 14,
      initialGaitVariability: 6.5,
      initialBalanceScore: 0.65,
      initialWeightAsymmetry: 12,
      initialLeftKneeROM: 110,
      initialRightKneeROM: 110
    }, 5),
    notes: 'Walking short distances without assistive device. Pain reduced to 3/10. Significant improvement in gait pattern and reduced Trendelenburg. Advancing to more functional exercises and light resistance training.',
    selectedMetrics: ['symmetry', 'stepLengthSymmetry', 'balanceScore', 'gaitVariability']
  },
  {
    id: 'session-5-5',
    patientId: 5,
    startTime: '2023-05-08T11:30:00Z',
    endTime: '2023-05-08T12:15:00Z',
    duration: 2700,
    metrics: generateProgressMetrics(5, {
      startTime: '2023-05-08T11:30:00Z',
      initialCadence: 85,
      initialSymmetry: 75,
      initialStepLengthSymmetry: 78,
      initialStanceTimeAsymmetry: 10,
      initialGaitVariability: 5,
      initialBalanceScore: 0.72,
      initialWeightAsymmetry: 8,
      initialLeftKneeROM: 115,
      initialRightKneeROM: 115
    }, 5),
    notes: 'Walking independently on level surfaces. Using cane only for longer distances and uneven terrain. Pain at 2/10 with extended activity. Added stair training and transitioning to home exercise program with focus on functional strength and endurance.',
    selectedMetrics: ['cadence', 'symmetry', 'stepLengthSymmetry', 'balanceScore', 'weightBearing']
  },
  
  // Additional patients with sessions would follow the same pattern
];

export default function PatientDetailView({ patient, onBack }: PatientDetailViewProps) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  
  // Clear localStorage when component mounts to ensure we get fresh mock data
  useEffect(() => {
    // Remove only the current patient's sessions to avoid wiping all data
    try {
      const allSessions = JSON.parse(localStorage.getItem('pt-sessions') || '[]');
      const otherSessions = allSessions.filter((s: Session) => s.patientId !== patient.id);
      localStorage.setItem('pt-sessions', JSON.stringify(otherSessions));
      console.log(`Cleared sessions for patient ${patient.id} from localStorage`);
    } catch (e) {
      console.error('Error clearing localStorage:', e);
    }
  }, [patient.id]);
  
  // Fetch patient sessions
  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['patient-sessions', patient.id],
    queryFn: async () => {
      try {
        console.log('Fetching sessions for patient:', patient.id);
        
        // Check if we have local storage sessions
        let storedSessions = [];
        try {
          storedSessions = JSON.parse(localStorage.getItem('pt-sessions') || '[]');
          console.log('Retrieved sessions from localStorage:', storedSessions);
        } catch (storageError) {
          console.error('Error accessing localStorage:', storageError);
        }
        
        // Filter sessions for this patient
        const patientSessions = storedSessions.filter((session: Session) => 
          session.patientId === patient.id
        );
        
        // If we have stored sessions for this patient, return them
        if (patientSessions.length > 0) {
          console.log(`Found ${patientSessions.length} sessions for patient ${patient.id} in localStorage`);
          return patientSessions;
        }
        
        // If no stored sessions, use mock data - this is the key change
        console.log('Using mock data for patient', patient.id);
        const filteredMockSessions = mockSessions.filter(session => session.patientId === patient.id);
        console.log(`Found ${filteredMockSessions.length} mock sessions for patient ${patient.id}`);
        
        // Store these sessions in local storage for future use
        const allStoredSessions = [...storedSessions, ...filteredMockSessions];
        localStorage.setItem('pt-sessions', JSON.stringify(allStoredSessions));
        
        return filteredMockSessions;
      } catch (err) {
        console.error('Error fetching sessions:', err);
        throw new Error('Failed to fetch patient sessions');
      }
    },
    // Only fetch if we have a patient
    enabled: Boolean(patient?.id),
  });
  
  // Back to session list from a selected session
  const handleBackToSessions = () => {
    setSelectedSession(null);
  };
  
  // Log the selected session data when it changes (for debugging)
  useEffect(() => {
    if (selectedSession) {
      console.log('Selected session metrics:', selectedSession.metrics);
      console.log('Metrics count:', Array.isArray(selectedSession.metrics) ? selectedSession.metrics.length : 0);
      console.log('Selected metrics:', selectedSession.selectedMetrics);
    }
  }, [selectedSession]);
  
  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center">
        <button
          onClick={onBack}
          className="mr-4 p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold">Patient Details</h2>
      </div>
      
      {/* Patient Details Card */}
      <CollapsiblePanel
        title="Patient Information"
        icon={<User className="w-6 h-6 text-blue-400" />}
        defaultExpanded={true}
      >
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Name</p>
              <p className="font-medium">{patient.first_name} {patient.last_name}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Diagnosis</p>
              <p className="font-medium">{patient.diagnosis}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Sessions</p>
              <p className="font-medium">{patient.sessions_count}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Last Visit</p>
              <p className="font-medium">{new Date(patient.last_visit).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </CollapsiblePanel>
      
      {/* Show session details or session list */}
      {selectedSession ? (
        <div className="space-y-4">
          <div className="flex items-center">
            <button
              onClick={handleBackToSessions}
              className="mr-4 p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
            >
              <ArrowLeft size={16} />
            </button>
            <h3 className="text-xl font-bold">Session Details</h3>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-gray-400 text-sm">Date</p>
                <p className="font-medium">{new Date(selectedSession.startTime).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Time</p>
                <p className="font-medium">
                  {new Date(selectedSession.startTime).toLocaleTimeString()} - 
                  {new Date(selectedSession.endTime).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Duration</p>
                <p className="font-medium">
                  {Math.floor(selectedSession.duration / 60)}:{(selectedSession.duration % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
            
            {/* AI-Generated SOAP Note */}
            <NoteGenerator session={selectedSession} patient={patient} />
            
            {/* Session Notes */}
            <div className="mb-6 mt-6">
              <h4 className="text-lg font-medium mb-2">Manual Session Notes</h4>
              <div className="bg-gray-700 p-3 rounded-lg">
                {selectedSession.notes || <span className="text-gray-400 italic">No notes recorded for this session</span>}
              </div>
            </div>
            
            {/* Session Metrics */}
            <PTSessionSummary 
              metrics={Array.isArray(selectedSession.metrics) ? selectedSession.metrics : []} 
              isSessionActive={false} 
              selectedMetrics={Array.isArray(selectedSession.selectedMetrics) ? selectedSession.selectedMetrics : []} 
            />
          </div>
        </div>
      ) : (
        <CollapsiblePanel
          title="Session History"
          icon={<Calendar className="w-6 h-6 text-green-400" />}
          defaultExpanded={true}
        >
          {isLoading ? (
            <div className="flex justify-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-900/30 text-red-200 p-4 rounded-lg">
              Error loading sessions. Please try again.
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session: Session) => (
                <div 
                  key={session.id}
                  className="bg-gray-700 p-3 rounded-lg hover:bg-gray-600 cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <ClipboardList className="mr-3 text-green-400" size={18} />
                      <div>
                        <div className="font-medium">
                          {new Date(session.startTime).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-400">
                          Duration: {Math.floor(session.duration / 60)}:{(session.duration % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm bg-gray-800 px-2 py-1 rounded">
                      {Array.isArray(session.metrics) ? session.metrics.length : 0} data points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 text-gray-400">
              No sessions found for this patient.
            </div>
          )}
        </CollapsiblePanel>
      )}
    </div>
  );
} 