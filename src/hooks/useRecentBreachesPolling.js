import { useEffect } from 'react';
import { useBreachStore } from '../store/breachStore';
import { getRecentBreaches } from '../services/storage/breachRepository';

const REFRESH_MS = 30_000;

/**
 * Lightweight poller that refreshes the "past 60 minutes" breaches
 * displayed on the Overview page. Replaces the in-browser detection
 * hook, which used to populate this list as it detected breaches —
 * detection now runs in the backend worker.
 */
export default function useRecentBreachesPolling(active = true) {
  const setCurrentHourBreaches = useBreachStore((s) => s.setCurrentHourBreaches);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    const refresh = async () => {
      try {
        const breaches = await getRecentBreaches();
        if (!cancelled) setCurrentHourBreaches(breaches);
      } catch (err) {
        console.error('[ui] failed to refresh recent breaches:', err);
      }
    };

    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active, setCurrentHourBreaches]);
}
