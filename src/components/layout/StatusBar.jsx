import { useState, useEffect } from 'react';
import { useFlightStore } from '../../store/flightStore';
import { useBreachStore } from '../../store/breachStore';
import { isAuthenticated } from '../../services/api/openskyClient';
import useTimeWindow from '../../hooks/useTimeWindow';
import { formatTime } from '../../utils/timeHelpers';
import './StatusBar.css';

export default function StatusBar() {
  const { flightCount, lastUpdated, error, isLoading } = useFlightStore();
  const { currentHourBreaches } = useBreachStore();
  const { isActive, activeHoursStart, activeHoursEnd } = useTimeWindow();

  // Live clock so "last updated X s ago" stays fresh
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsAgo = lastUpdated ? Math.round((now - lastUpdated) / 1000) : null;

  return (
    <div className="status-bar">
      <div className="status-left">
        <div className={`status-indicator ${isActive ? 'active' : 'inactive'}`} />
        <div className="status-info">
          {isActive ? (
            <>
              <span className="status-label">
                Monitoring{isAuthenticated ? ' (authenticated)' : ''}
              </span>
              <span className="status-detail">
                {isLoading
                  ? 'Fetching flights\u2026'
                  : `${flightCount} flight${flightCount !== 1 ? 's' : ''} in area`}
              </span>
            </>
          ) : (
            <>
              <span className="status-label">Offline</span>
              <span className="status-detail">
                Active {String(activeHoursStart).padStart(2, '0')}:00 &ndash;{' '}
                {String(activeHoursEnd).padStart(2, '0')}:00
              </span>
            </>
          )}
        </div>
      </div>

      <div className="status-center">
        <div className={`breach-badge ${currentHourBreaches.length > 0 ? 'has-breaches' : ''}`}>
          <span className="breach-count">{currentHourBreaches.length}</span>
          <span className="breach-label">breach{currentHourBreaches.length !== 1 ? 'es' : ''} this hour</span>
        </div>
      </div>

      <div className="status-right">
        {error ? (
          <div className="status-error">
            <span className="error-text">{error}</span>
          </div>
        ) : lastUpdated ? (
          <span className="timestamp-text">
            Updated {formatTime(lastUpdated)}{secondsAgo !== null ? ` (${secondsAgo}s ago)` : ''}
          </span>
        ) : isActive ? (
          <span className="timestamp-text">Waiting for first update\u2026</span>
        ) : null}
      </div>
    </div>
  );
}
