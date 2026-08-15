import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function usePinger(intervalMs = 5 * 60 * 1000) { // 5 minutes default
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      try {
        const response = await api.get('/ping', { timeout: 5000 });
        console.log(response.data)
        if (mounted) {
          setIsOnline(response.status === 200 || response.data.status === "pong");
        }
      } catch (error) {
        console.warn("Pinger failed for baseURL:" + api.defaults.baseURL + "Error:" + error);
        if (mounted) {
          setIsOnline(false);
        }
      }
    };

    // Initial check
    checkStatus();

    // Polling interval
    const interval = setInterval(checkStatus, intervalMs);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [intervalMs]);

  return isOnline;
}
