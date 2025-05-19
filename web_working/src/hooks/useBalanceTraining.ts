import { useState, useCallback, useEffect } from 'react';

interface Step {
  text: string;
  duration: number; // seconds
}

const steps: Step[] = [
  { text: 'Stand with feet together', duration: 5 },
  { text: 'Close your eyes', duration: 5 },
  { text: 'Extend arms to sides', duration: 5 },
  { text: 'Hold position', duration: 10 },
];

export function useBalanceTraining(patientId: number | null) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const start = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, activity: 'balance' }),
      });
      if (!res.ok) throw new Error('Failed to start session');
      const data = await res.json();
      setSessionId(data.id);
      setActive(true);
      setStepIndex(0);
      setElapsed(0);
    } catch (err) {
      console.error(err);
    }
  }, [patientId]);

  const stop = useCallback(async () => {
    if (sessionId) {
      try {
        await fetch(`/api/sessions/${sessionId}/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ end_ts: new Date().toISOString() }),
        });
      } catch (err) {
        console.error(err);
      }
    }
    setActive(false);
    setSessionId(null);
    setStepIndex(0);
    setElapsed(0);
  }, [sessionId]);

  // advance timer
  useEffect(() => {
    if (!active) return;
    if (stepIndex >= steps.length) {
      stop();
      return;
    }
    const step = steps[stepIndex];
    const timer = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= step.duration) {
          clearInterval(timer);
          setElapsed(0);
          setStepIndex((i) => i + 1);
          return 0;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [active, stepIndex, stop]);

  const progress = active && stepIndex < steps.length ? elapsed / steps[stepIndex].duration : 0;
  const stepText = stepIndex < steps.length ? steps[stepIndex].text : 'Finished';

  return { start, stop, active, stepText, progress };
}

export { steps as balanceSteps };
