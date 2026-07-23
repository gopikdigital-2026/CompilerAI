import { useState, useEffect, useCallback } from 'react';

export type RefreshInterval = 0 | 5000 | 10000 | 30000 | 60000;

export interface AutoRefreshState {
  isRefreshing: boolean;
  lastUpdated: Date | null;
  triggerRefresh: () => void;
  interval: RefreshInterval;
  setInterval: (interval: RefreshInterval) => void;
}

export function useAutoRefresh(defaultInterval: RefreshInterval = 10000): AutoRefreshState {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [interval, setIntervalValue] = useState<RefreshInterval>(defaultInterval);

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true);
    setLastUpdated(new Date());
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  useEffect(() => {
    if (interval === 0) return;
    const id = globalThis.setInterval(() => {
      setIsRefreshing(true);
      setLastUpdated(new Date());
      setTimeout(() => setIsRefreshing(false), 500);
    }, interval);
    return () => globalThis.clearInterval(id);
  }, [interval]);

  const setInterval = useCallback((newInterval: RefreshInterval) => {
    setIntervalValue(newInterval);
  }, []);

  return { isRefreshing, lastUpdated, triggerRefresh, interval, setInterval };
}
