import { formatCallsign, formatAltitude, formatVelocity, formatHeading, formatCoordinates } from '../../utils/formatters';
import { formatDateTime, formatTime } from '../../utils/timeHelpers';
import './BreachDetailModal.css';

export default function BreachDetailModal({ breach, onClose }) {
  if (!breach) return null;

  const rows = [
    ['Callsign', formatCallsign(breach.callsign)],
    ['ICAO24', breach.icao24?.toUpperCase() || 'N/A'],
    ['Time', formatDateTime(breach.timestamp)],
    ['AGL Altitude', formatAltitude(breach.agl)],
    ['Barometric Altitude', formatAltitude(breach.altitude)],
    ['Speed', formatVelocity(breach.velocity)],
    ['Heading', formatHeading(breach.heading)],
    ['Position', formatCoordinates(breach.latitude, breach.longitude)],
    ['Latitude', breach.latitude?.toFixed(6) ?? 'N/A'],
    ['Longitude', breach.longitude?.toFixed(6) ?? 'N/A'],
    ['Date', breach.date],
    ['Hour', `${String(breach.hour).padStart(2, '0')}:00`],
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="breach-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <h2>{formatCallsign(breach.callsign)}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="detail-alert">
          Low-altitude breach &mdash; {formatAltitude(breach.agl)} AGL at {formatTime(breach.timestamp)}
        </div>

        <table className="detail-table">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td className="detail-label">{label}</td>
                <td className="detail-value">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
