import { formatCallsign, formatAltitude, formatVelocity, formatHeading, formatCoordinates } from '../../utils/formatters';
import { formatTime } from '../../utils/timeHelpers';
import './BreachCard.css';

export default function BreachCard({ breach, onClick }) {
  return (
    <div className="breach-card" onClick={() => onClick && onClick(breach)} role="button" tabIndex={0}>
      <div className="breach-card-header">
        <span className="breach-callsign">{formatCallsign(breach.callsign)}</span>
        <span className="breach-time">{formatTime(breach.timestamp)}</span>
      </div>

      <div className="breach-card-body">
        <div className="breach-stat breach-stat-agl">
          <span className="stat-label">AGL</span>
          <span className="stat-value">{formatAltitude(breach.agl)}</span>
        </div>
        <div className="breach-stat">
          <span className="stat-label">Altitude</span>
          <span className="stat-value">{formatAltitude(breach.altitude)}</span>
        </div>
        <div className="breach-stat">
          <span className="stat-label">Speed</span>
          <span className="stat-value">{formatVelocity(breach.velocity)}</span>
        </div>
        <div className="breach-stat">
          <span className="stat-label">Heading</span>
          <span className="stat-value">{formatHeading(breach.heading)}</span>
        </div>
      </div>

      <div className="breach-card-footer">
        <span className="breach-icao">{breach.icao24?.toUpperCase()}</span>
        <span className="breach-coords">{formatCoordinates(breach.latitude, breach.longitude)}</span>
      </div>
    </div>
  );
}
