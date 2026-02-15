import { useBreachStore } from '../../store/breachStore';
import { useConfigStore } from '../../store/configStore';
import useTimeWindow from '../../hooks/useTimeWindow';
import { getHourRange, getCurrentHour } from '../../utils/timeHelpers';
import BreachCard from './BreachCard';
import './CurrentHourPanel.css';

export default function CurrentHourPanel({ onBreachClick }) {
  const currentHourBreaches = useBreachStore((s) => s.currentHourBreaches);
  const altitudeThreshold = useConfigStore((s) => s.altitudeThreshold);
  const { isActive } = useTimeWindow();

  const hour = getCurrentHour();
  const hourRange = getHourRange(hour);

  if (!isActive) {
    return (
      <div className="current-hour-panel">
        <div className="panel-header">
          <h2>Current Hour</h2>
        </div>
        <div className="panel-offline">
          <p>Outside operating hours. Monitoring is paused.</p>
        </div>
      </div>
    );
  }

  // Sort most recent first.
  const sorted = [...currentHourBreaches].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="current-hour-panel">
      <div className="panel-header">
        <div>
          <h2>Current Hour</h2>
          <span className="hour-range">{hourRange}</span>
        </div>
        <div className="panel-summary">
          <span className={`summary-count ${sorted.length > 0 ? 'has-breaches' : ''}`}>
            {sorted.length}
          </span>
          <span className="summary-label">
            breach{sorted.length !== 1 ? 'es' : ''} detected
          </span>
        </div>
      </div>

      <div className="panel-info">
        Monitoring for flights below <strong>{altitudeThreshold} ft</strong> AGL
        within the configured boundary.
      </div>

      {sorted.length === 0 ? (
        <div className="panel-empty">
          <div className="empty-icon">&#10003;</div>
          <p>No breaches detected this hour</p>
          <span className="empty-hint">
            Breaches will appear here in real-time when an aircraft drops below the altitude threshold.
          </span>
        </div>
      ) : (
        <div className="breach-list">
          {sorted.map((breach) => (
            <BreachCard
              key={breach.id}
              breach={breach}
              onClick={onBreachClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
