import { useState } from 'react';

interface SMSAlertState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

export function useSMSAlert() {
  const [state, setState] = useState<SMSAlertState>({
    isLoading: false,
    error: null,
    success: false
  });

  const sendTestSMS = async (phoneNumber: string) => {
    setState({ isLoading: true, error: null, success: false });
    
    try {
      const response = await fetch('/api/sms/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to send test SMS');
      }

      setState({ isLoading: false, error: null, success: true });
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, success: false }));
      }, 3000);
    } catch (error) {
      setState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to send test SMS', 
        success: false 
      });
    }
  };

  return { ...state, sendTestSMS };
}