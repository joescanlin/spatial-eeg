import { useState, useCallback, useEffect } from 'react';
import { patientApi } from '../services/patientApi';

interface BalanceStep {
  id: string;
  title: string;
  instruction: string;
  detail: string;
  duration: number; // seconds
  phase: 'preparation' | 'assessment' | 'challenge' | 'recovery';
  metrics_focus: string[]; // Which metrics to emphasize
}

export type BalancePhase = 'idle' | 'introduction' | 'active' | 'completed' | 'stopped';

// Comprehensive balance assessment protocol
const balanceSteps: BalanceStep[] = [
  {
    id: 'intro',
    title: 'Introduction',
    instruction: 'Get ready for balance assessment',
    detail: 'Stand comfortably on the platform. We will guide you through a series of balance challenges to assess your stability and control.',
    duration: 10,
    phase: 'preparation',
    metrics_focus: ['baseline']
  },
  {
    id: 'feet_together',
    title: 'Feet Together Stance',
    instruction: 'Stand with your feet together',
    detail: 'Place your feet side by side, touching if possible. Keep your arms at your sides and look straight ahead. Maintain this position.',
    duration: 30,
    phase: 'assessment',
    metrics_focus: ['cop_area', 'sway_velocity', 'load_distribution']
  },
  {
    id: 'eyes_closed',
    title: 'Eyes Closed Balance',
    instruction: 'Close your eyes and maintain balance',
    detail: 'Keep your feet together and gently close your eyes. Focus on maintaining your balance without visual input. This tests your proprioceptive balance.',
    duration: 20,
    phase: 'challenge',
    metrics_focus: ['cop_area', 'sway_velocity', 'stability_score']
  },
  {
    id: 'single_leg',
    title: 'Single Leg Stance',
    instruction: 'Stand on your strongest leg',
    detail: 'Lift one foot slightly off the ground (2-3 inches). Keep your eyes open and arms at your sides. Focus on a point ahead of you.',
    duration: 15,
    phase: 'challenge',
    metrics_focus: ['cop_area', 'sway_velocity', 'load_distribution']
  },
  {
    id: 'tandem_walk',
    title: 'Tandem Stance',
    instruction: 'Stand heel-to-toe',
    detail: 'Place one foot directly in front of the other, heel touching toe. Keep your arms at your sides and maintain this narrow base of support.',
    duration: 20,
    phase: 'challenge',
    metrics_focus: ['cop_area', 'sway_velocity', 'stability_score']
  },
  {
    id: 'recovery',
    title: 'Recovery',
    instruction: 'Return to comfortable standing',
    detail: 'Excellent work! Return to a comfortable standing position. Take a moment to relax before we complete the assessment.',
    duration: 10,
    phase: 'recovery',
    metrics_focus: ['recovery_metrics']
  }
];

export function useBalanceTraining(patientId: number | null) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [phase, setPhase] = useState<BalancePhase>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [metricsBuffer, setMetricsBuffer] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);

  const start = useCallback(() => {
    // Show the introduction screen when balance training is selected
    setPhase('introduction');
    setStepIndex(0);
    setElapsed(0);
    setMetricsBuffer([]);
    setIsReady(false);
  }, []);

  const startActualSession = useCallback(async () => {
    if (!patientId) {
      console.error('No patient selected for balance training');
      return;
    }
    
    try {
      // Create session with balance training specifics
      const sessionData = {
        patient_id: patientId,
        activity: 'balance',
        session_notes: 'Balance Training Assessment - Guided Protocol',
        selected_metrics: [
          'cop_area_cm2',
          'sway_vel_cm_s', 
          'load_distribution',
          'stability_score',
          'weight_shift_quality'
        ]
      };

      const session = await patientApi.createSession(sessionData);
      setSessionId(session.id);
      setPhase('active');
      setStepIndex(0);
      setElapsed(0);
      setMetricsBuffer([]);
      
      console.log(`Balance training session started for patient ${patientId}, session ${session.id}`);
    } catch (err) {
      console.error('Failed to start balance training session:', err);
    }
  }, [patientId]);

  const stop = useCallback(async () => {
    if (sessionId) {
      try {
        // Save any remaining metrics
        if (metricsBuffer.length > 0) {
          await patientApi.createMetricsBulk(sessionId, metricsBuffer);
        }

        // Complete the session with summary
        const completionNotes = `Balance Training completed. ${balanceSteps.length} steps performed over ${Math.round((Date.now() - (sessionId * 1000)) / 60000)} minutes.`;
        
        await patientApi.endSession(sessionId, {
          end_ts: new Date().toISOString(),
          session_notes: completionNotes,
          ai_summary: `Balance assessment protocol completed with ${stepIndex + 1} of ${balanceSteps.length} steps.`
        });

        console.log(`Balance training session ${sessionId} completed successfully`);
      } catch (err) {
        console.error('Error completing balance training session:', err);
      }
    }
    
    // Reset to initial idle state
    setPhase('idle');
    setSessionId(null);
    setStepIndex(0);
    setElapsed(0);
    setMetricsBuffer([]);
    setIsReady(false);
  }, [sessionId, metricsBuffer, stepIndex]);

  // Timer logic for step progression
  useEffect(() => {
    if (phase !== 'active') return;
    
    if (stepIndex >= balanceSteps.length) {
      // All steps completed
      setPhase('completed');
      stop();
      return;
    }

    const currentStep = balanceSteps[stepIndex];
    const timer = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= currentStep.duration) {
          // Step completed, move to next
          clearInterval(timer);
          setElapsed(0);
          setStepIndex((i) => i + 1);
          return 0;
        }
        return e + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, stepIndex, stop]);

  // Metrics collection during active steps
  useEffect(() => {
    if (phase !== 'active' || !sessionId) return;

    const metricsTimer = setInterval(() => {
      const currentStep = balanceSteps[stepIndex];
      if (currentStep && currentStep.phase !== 'preparation') {
        // Collect metrics specific to current step
        const stepMetrics = {
          session_id: sessionId,
          ts: new Date().toISOString(),
          // Simulated metrics - in real app these would come from sensors
          cop_area_cm2: Math.random() * 15 + 5, // 5-20 cm²
          sway_vel_cm_s: Math.random() * 3 + 1, // 1-4 cm/s
          stability_score: Math.random() * 40 + 60, // 60-100
          weight_shift_quality: Math.random() * 30 + 70, // 70-100
          left_pct: 45 + Math.random() * 10, // 45-55%
          right_pct: 45 + Math.random() * 10, // 45-55%
          exercise_completion_pct: ((stepIndex + 1) / balanceSteps.length) * 100,
          metric_status: {
            step_id: currentStep.id,
            step_phase: currentStep.phase,
            step_focus: currentStep.metrics_focus.join(',')
          }
        };

        setMetricsBuffer(prev => {
          const newBuffer = [...prev, stepMetrics];
          
          // Save to database every 5 metrics
          if (newBuffer.length >= 5) {
            patientApi.createMetricsBulk(sessionId, newBuffer).catch(err => {
              console.error('Error saving balance training metrics:', err);
            });
            return []; // Clear buffer after saving
          }
          
          return newBuffer;
        });
      }
    }, 2000); // Collect metrics every 2 seconds

    return () => clearInterval(metricsTimer);
  }, [phase, stepIndex, sessionId]);

  // Public interface
  const currentStep = stepIndex < balanceSteps.length ? balanceSteps[stepIndex] : null;
  const progress = currentStep ? elapsed / currentStep.duration : 0;
  const isComplete = phase === 'completed';
  const isActive = phase === 'active';

  const cancel = useCallback(() => {
    // Cancel without creating/completing a session
    setPhase('idle');
    setSessionId(null);
    setStepIndex(0);
    setElapsed(0);
    setMetricsBuffer([]);
    setIsReady(false);
  }, []);

  const proceedToNext = useCallback(() => {
    if (phase === 'introduction') {
      startActualSession();
      setIsReady(true);
    }
  }, [phase, startActualSession]);

  return {
    // Control functions
    start,
    stop,
    cancel,
    proceedToNext,
    
    // State
    phase,
    isActive,
    isComplete,
    isReady,
    
    // Current step info
    currentStep,
    stepIndex,
    progress,
    elapsed,
    totalSteps: balanceSteps.length,
    
    // Session info
    sessionId,
    
    // Legacy compatibility
    active: isActive,
    stepText: currentStep?.instruction || 'Preparing...'
  };
}

// Export for external use
export { balanceSteps };
