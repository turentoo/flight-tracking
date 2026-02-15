import { useState, useEffect, useCallback } from 'react';
import { useConfigStore } from '../store/configStore';

/**
 * Hook that tracks whether the current time is within operating hours.
 * Re-checks every 30 seconds so the UI transitions promptly at boundaries.
 */
export default function useTimeWindow() {
  const activeHoursStart = useConfigStore((s) => s.activeHoursStart);
  const activeHoursEnd = useConfigStore((s) => s.activeHoursEnd);

  const check = useCallback(() => {
    const hour = new Date().getHours();
    return hour >= activeHoursStart && hour < activeHoursEnd;
  }, [activeHoursStart, activeHoursEnd]);

  const [isActive, setIsActive] = useState(check);

  useEffect(() => {
    setIsActive(check());
    const id = setInterval(() => setIsActive(check()), 30_000);
    return () => clearInterval(id);
  }, [check]);

  return { isActive, activeHoursStart, activeHoursEnd };
}
