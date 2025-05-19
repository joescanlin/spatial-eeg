import { useState, useCallback } from 'react';
import { useMQTT } from './useMQTT';

export const useMetricStreams = () => {
  const [latest, setLatest] = useState<any>({});
  const handler = useCallback((payload: any) => setLatest(payload), []);
  useMQTT(handler);
  return latest;
}; 