import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import { useBreachStore } from '../../store/breachStore';
import { useConfigStore } from '../../store/configStore';
import { useUIStore } from '../../store/uiStore';
import { getBreachesForMonth, getMonthlyStats, setBreachReported, deleteBreach } from '../../services/storage/breachRepository';
import { formatCallsign } from '../../utils/formatters';
import { getBoundaryCenter } from '../../services/calculations/boundaryChecker';
import EmptyState from '../shared/EmptyState';
import './OverviewPage.css';

const BOUNDARY_STYLE = {
  color: '#646cff',
  weight: 3,
  opacity: 1,
  fillColor: '#646cff',
  fillOpacity: 0.15,
  dashArray: '6 4',
};

function createHandleIcon() {
  return L.divIcon({
    className: 'boundary-drag-handle',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

/**
 * Compute the Haversine distance between two lat/lon points in km.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute a destination point given start, bearing (radians) and distance (km).
 */
function destinationPoint(lat, lon, bearingRad, distKm) {
  const R = 6371;
  const d = distKm / R;
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;
  const newLat = Math.asin(
    Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(bearingRad)
  );
  const newLon = lonRad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(d) * Math.cos(latRad),
    Math.cos(d) - Math.sin(latRad) * Math.sin(newLat)
  );
  return { lat: newLat * 180 / Math.PI, lon: newLon * 180 / Math.PI };
}

function EditableBoundary({ boundary, onBoundaryChange }) {
  const map = useMap();
  const circleRef = useRef(null);
  const markersRef = useRef({ center: null, edge: null });
  const debounceRef = useRef(null);

  const persistBoundary = useCallback((newBoundary) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      useConfigStore.getState().setBoundary(newBoundary);
    }, 500);
  }, []);

  const updateEdgeHandle = useCallback((centerLat, centerLon, radiusKm) => {
    // Place edge handle due east of center
    const edge = destinationPoint(centerLat, centerLon, Math.PI / 2, radiusKm);
    if (markersRef.current.edge) {
      markersRef.current.edge.setLatLng([edge.lat, edge.lon]);
    }
  }, []);

  useEffect(() => {
    if (!boundary) return;

    const { centerLat, centerLon, radiusKm } = boundary;

    // Create circle
    const circle = L.circle([centerLat, centerLon], {
      radius: radiusKm * 1000,
      ...BOUNDARY_STYLE,
    }).addTo(map);
    circleRef.current = circle;

    const icon = createHandleIcon();

    // Center drag handle
    const centerMarker = L.marker([centerLat, centerLon], { icon, draggable: true }).addTo(map);
    centerMarker.on('drag', function () {
      const pos = this.getLatLng();
      const currentRadius = circleRef.current.getRadius() / 1000; // meters -> km
      circleRef.current.setLatLng(pos);
      updateEdgeHandle(pos.lat, pos.lng, currentRadius);

      const newBoundary = { centerLat: pos.lat, centerLon: pos.lng, radiusKm: currentRadius };
      onBoundaryChange(newBoundary);
      persistBoundary(newBoundary);
    });

    // Edge drag handle (due east)
    const edgePos = destinationPoint(centerLat, centerLon, Math.PI / 2, radiusKm);
    const edgeMarker = L.marker([edgePos.lat, edgePos.lon], { icon, draggable: true }).addTo(map);
    edgeMarker.on('drag', function () {
      const pos = this.getLatLng();
      const center = circleRef.current.getLatLng();
      const newRadiusKm = haversineKm(center.lat, center.lng, pos.lat, pos.lng);
      circleRef.current.setRadius(newRadiusKm * 1000);

      const newBoundary = { centerLat: center.lat, centerLon: center.lng, radiusKm: newRadiusKm };
      onBoundaryChange(newBoundary);
      persistBoundary(newBoundary);
    });

    markersRef.current = { center: centerMarker, edge: edgeMarker };

    return () => {
      circle.remove();
      centerMarker.remove();
      edgeMarker.remove();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []); // Only run on mount — sync via second useEffect

  // Sync circle when boundary changes externally (e.g. from config panel)
  useEffect(() => {
    if (!boundary || !circleRef.current) return;
    const { centerLat, centerLon, radiusKm } = boundary;
    circleRef.current.setLatLng([centerLat, centerLon]);
    circleRef.current.setRadius(radiusKm * 1000);
    if (markersRef.current.center) {
      markersRef.current.center.setLatLng([centerLat, centerLon]);
    }
    updateEdgeHandle(centerLat, centerLon, radiusKm);
  }, [boundary, updateEdgeHandle]);

  return null;
}

function FitBoundary({ boundary, padding }) {
  const map = useMap();
  useEffect(() => {
    if (!boundary) return;
    const center = L.latLng(boundary.centerLat, boundary.centerLon);
    const bounds = center.toBounds(boundary.radiusKm * 2000); // toBounds takes diameter in meters
    map.fitBounds(bounds, { padding: padding || [20, 20] });
  }, [map, boundary, padding]);
  return null;
}

function BoundaryMiniMap() {
  const boundary = useConfigStore((s) => s.boundary);
  const setShowConfigPanel = useUIStore((s) => s.setShowConfigPanel);
  const center = useMemo(() => getBoundaryCenter(boundary), [boundary]);
  const handleBoundaryChange = useCallback(() => {}, []);

  if (!boundary || !center) return null;

  return (
    <div className="boundary-minimap">
      <button
        className="boundary-edit-btn"
        onClick={() => setShowConfigPanel(true)}
        title="Edit boundary"
      >
        ✎
      </button>
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={13}
        zoomControl={true}
        attributionControl={false}
        dragging={true}
        scrollWheelZoom={true}
        doubleClickZoom={false}
        touchZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBoundary boundary={boundary} padding={[30, 30]} />
        <EditableBoundary boundary={boundary} onBoundaryChange={handleBoundaryChange} />
      </MapContainer>
    </div>
  );
}

function AlertMapFit({ lat, lng, boundary }) {
  const map = useMap();
  useEffect(() => {
    if (lat == null || lng == null) return;
    if (boundary) {
      const center = L.latLng(boundary.centerLat, boundary.centerLon);
      const bounds = center.toBounds(boundary.radiusKm * 2000);
      bounds.extend([lat, lng]);
      map.fitBounds(bounds, { padding: [15, 15] });
    } else {
      map.setView([lat, lng], 14);
    }
  }, [map, lat, lng, boundary]);
  return null;
}

/**
 * Get the effective altitude for display/comparison.
 * Uses QNH-corrected height above aerodrome when available, falls back to raw barometric.
 */
function getEffectiveAltitude(breach) {
  if (breach.height_above_aerodrome != null) return breach.height_above_aerodrome;
  return breach.altitude;
}

function buildReportMailto(breach, email, altitudeThreshold, emailTemplate) {
  const timestamp = format(new Date(breach.timestamp), 'd MMM yyyy HH:mm:ss');
  const effectiveAlt = getEffectiveAltitude(breach);
  const altitude = effectiveAlt != null ? String(Math.round(effectiveAlt)) : 'N/A';
  const gap = effectiveAlt != null && altitudeThreshold ? String(altitudeThreshold - Math.round(effectiveAlt)) : 'N/A';
  const callsign = formatCallsign(breach.callsign);
  const threshold = String(altitudeThreshold || 1300);
  const coordinates = breach.latitude != null && breach.longitude != null
    ? `${breach.latitude.toFixed(6)}, ${breach.longitude.toFixed(6)}`
    : 'N/A';

  const navQnh = breach.nav_qnh != null ? String(breach.nav_qnh.toFixed(1)) : 'N/A';
  const correctedAltitude = breach.corrected_altitude != null ? String(Math.round(breach.corrected_altitude)) : 'N/A';
  const heightAboveAerodrome = breach.height_above_aerodrome != null ? String(Math.round(breach.height_above_aerodrome)) : 'N/A';

  const body = emailTemplate
    .replace(/\[flight_number\]/g, callsign)
    .replace(/\[timestamp\]/g, timestamp)
    .replace(/\[threshold\]/g, threshold)
    .replace(/\[altitude\]/g, altitude)
    .replace(/\[delta_altitude\]/g, gap)
    .replace(/\[coordinates\]/g, coordinates)
    .replace(/\[aircraft_type\]/g, breach.aircraft_type || 'N/A')
    .replace(/\[nav_qnh\]/g, navQnh)
    .replace(/\[corrected_altitude\]/g, correctedAltitude)
    .replace(/\[height_above_aerodrome\]/g, heightAboveAerodrome);

  const subject = `Noise Complaint - Aircraft Below Restricted Altitude - ${callsign} - ${timestamp}`;

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function AlertExplorer({ breach, boundary, onReportedChange, onDelete }) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const reportEmail = useConfigStore((s) => s.reportEmail);
  const altitudeThreshold = useConfigStore((s) => s.altitudeThreshold);
  const emailTemplate = useConfigStore((s) => s.emailTemplate);

  if (!breach) {
    return (
      <div className="alert-explorer">
        <h3 className="alert-explorer-title">Alert explorer</h3>
        <EmptyState title="Select alert to view details" description="Click a row in the breaches table" />
      </div>
    );
  }

  const hasCoords = breach.latitude != null && breach.longitude != null;
  const isReported = !!breach.reported;

  const handleToggleReported = async () => {
    setToggling(true);
    try {
      const newValue = !isReported;
      await setBreachReported(breach.id, newValue);
      onReportedChange(breach.id, newValue);
    } catch (err) {
      console.error('Failed to update reported status:', err);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="alert-explorer">
      <h3 className="alert-explorer-title">Alert explorer</h3>
      <div className="alert-explorer-details">
        <div className="alert-detail-row">
          <span className="alert-detail-icon">
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
          </span>
          <div>
            <div className="alert-detail-value">{formatCallsign(breach.callsign)}</div>
            <div className="alert-detail-label">Flight</div>
          </div>
        </div>
        <div className="alert-detail-row">
          <span className="alert-detail-icon">
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <div>
            <div className="alert-detail-value">{breach.departure_airport || 'Unknown'}</div>
            <div className="alert-detail-label">Airport</div>
          </div>
        </div>
        <div className="alert-detail-row">
          <span className="alert-detail-icon">
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <div>
            <div className="alert-detail-value">{format(new Date(breach.timestamp), 'd MMM yyyy HH:mm:ss')}</div>
            <div className="alert-detail-label">When</div>
          </div>
        </div>
        {hasCoords && (
          <div className="alert-detail-row">
            <span className="alert-detail-icon">
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <div>
              <div className="alert-detail-value">{breach.longitude.toFixed(6)},{breach.latitude.toFixed(6)}</div>
              <div className="alert-detail-label">Where</div>
            </div>
          </div>
        )}
      </div>
      {hasCoords && (
        <div className="alert-explorer-map">
          <MapContainer
            center={[breach.latitude, breach.longitude]}
            zoom={14}
            zoomControl={false}
            attributionControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[breach.latitude, breach.longitude]} />
            <AlertMapFit lat={breach.latitude} lng={breach.longitude} boundary={boundary} />
          </MapContainer>
        </div>
      )}
      <div className="alert-detail-row alert-detail-altitude">
        <span className="alert-detail-icon">
          <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </span>
        <div>
          <div className="alert-detail-value">{breach.altitude != null ? `${Math.round(breach.altitude).toLocaleString()} ft` : 'N/A'}</div>
          <div className="alert-detail-label">Barometric altitude</div>
        </div>
      </div>
      <div className="alert-detail-row">
        <span className="alert-detail-icon">
          <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
            <path d="M12 6v6l4 2" />
          </svg>
        </span>
        <div>
          <div className="alert-detail-value">{breach.nav_qnh != null ? `${breach.nav_qnh.toFixed(1)} hPa` : 'N/A'}</div>
          <div className="alert-detail-label">QNH</div>
        </div>
      </div>
      <div className="alert-detail-row">
        <span className="alert-detail-icon">
          <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
            <line x1="12" y1="9" x2="12" y2="21" />
          </svg>
        </span>
        <div>
          <div className="alert-detail-value">{breach.height_above_aerodrome != null ? `${Math.round(breach.height_above_aerodrome).toLocaleString()} ft` : 'N/A'}</div>
          <div className="alert-detail-label">Corrected altitude</div>
        </div>
      </div>
      {!isReported && (
        <a
          className="report-button"
          href={buildReportMailto(breach, reportEmail, altitudeThreshold, emailTemplate)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          Report
        </a>
      )}
      <div className="report-toggle-container">
        <label className="report-toggle">
          <input
            type="checkbox"
            checked={isReported}
            onChange={handleToggleReported}
            disabled={toggling}
          />
          <span className="report-toggle-slider" />
        </label>
        <span className="report-toggle-label">Reported</span>
      </div>
      <button
        className="delete-alert-btn"
        onClick={async () => {
          setDeleting(true);
          try {
            await onDelete(breach.id);
          } catch (err) {
            console.error('Failed to delete alert:', err);
          } finally {
            setDeleting(false);
          }
        }}
        disabled={deleting}
      >
        {deleting ? 'Deleting...' : 'Delete alert'}
      </button>
    </div>
  );
}

function CurrentHourChart({ breaches }) {
  const now = useMemo(() => new Date(), [breaches]);

  // Snap to clean 5-minute boundaries (e.g. :00, :05, :10, ...)
  const snappedNow = useMemo(() => {
    const d = new Date(now);
    d.setMinutes(Math.floor(d.getMinutes() / 5) * 5, 0, 0);
    return d;
  }, [now]);

  const startTime = new Date(snappedNow.getTime() - 55 * 60 * 1000);

  // Group breaches into 5-minute intervals aligned to :00, :05, :10, etc.
  const chartData = useMemo(() => {
    const intervals = [];
    for (let i = 0; i < 12; i++) {
      const slotStart = new Date(startTime.getTime() + i * 5 * 60 * 1000);
      intervals.push({
        label: format(slotStart, 'HH:mm'),
        start: slotStart.getTime(),
        end: slotStart.getTime() + 5 * 60 * 1000,
        count: 0,
      });
    }
    breaches.forEach((b) => {
      const ts = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
      for (let i = 0; i < intervals.length; i++) {
        if (ts >= intervals[i].start && ts < intervals[i].end) {
          intervals[i].count += 1;
          break;
        }
      }
    });
    return intervals;
  }, [breaches, startTime]);

  const hasData = breaches.length > 0;

  return (
    <div className="card current-hour-section">
      <h2 className="section-heading">
        Past 60 minutes
      </h2>
      <div className="current-hour-row">
        <div className="chart-container current-hour-chart">
          {!hasData ? (
            <EmptyState title="No flight activity in the past 60 minutes" description="Breaches will appear here when detected" />
          ) : (
            <>
              <div className="chart-legend">
                <span className="legend-dot" />
                <span className="legend-label">Breaches {breaches.length}</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--text-primary)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
        <BoundaryMiniMap />
      </div>
    </div>
  );
}

function BreachesTable({ breaches, title, selectedId, onSelect, altitudeThreshold }) {
  if (breaches.length === 0) {
    return (
      <div className="card breaches-table-card">
        <h3 className="card-title">{title || 'Breaches'}</h3>
        <EmptyState title="No breaches detected this hour" description="Altitude breaches will be listed here in real-time" />
      </div>
    );
  }

  return (
    <div className="card breaches-table-card">
      <h3 className="card-title">{title || 'Breaches'}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Flight number</th>
            <th>Type</th>
            <th>Airport</th>
            <th>Baro alt, ft</th>
            <th>QNH, hPa</th>
            <th>Corrected alt, ft</th>
            <th>Severity</th>
            <th>Timestamp</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {breaches.map((b) => (
            <tr
              key={b.id}
              className={`breach-row${selectedId === b.id ? ' breach-row-selected' : ''}`}
              onClick={() => onSelect && onSelect(b)}
            >
              <td>{formatCallsign(b.callsign)}</td>
              <td>{b.aircraft_type || 'N/A'}</td>
              <td>{b.departure_airport || 'Unknown'}</td>
              <td>{b.altitude != null ? Math.round(b.altitude).toLocaleString() : 'N/A'}</td>
              <td>{b.nav_qnh != null ? b.nav_qnh.toFixed(1) : 'N/A'}</td>
              <td>{b.height_above_aerodrome != null ? Math.round(b.height_above_aerodrome).toLocaleString() : 'N/A'}</td>
              <td><SeverityDot altitude={b.altitude} heightAboveAerodrome={b.height_above_aerodrome} threshold={altitudeThreshold} /></td>
              <td>{format(new Date(b.timestamp), 'd MMM yyyy HH:mm:ss')}</td>
              <td>{b.reported ? <span className="reported-pill">Reported</span> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCards({ stats }) {
  const cards = [
    { label: 'Avg per month', value: stats.avg, className: 'stat-card-blue' },
    { label: 'Max per month', value: stats.max, className: 'stat-card-purple' },
    { label: 'Total breaches', value: stats.total, className: 'stat-card-blue' },
    { label: 'Min per month', value: stats.min, className: 'stat-card-purple' },
  ];

  return (
    <div className="stat-cards">
      {cards.map((c) => (
        <div key={c.label} className={`stat-card ${c.className}`}>
          <span className="stat-card-label">{c.label}</span>
          <span className="stat-card-value">{c.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function MonthlyChart({ months }) {
  const hasData = months.some((m) => m.count > 0);
  const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];

  // Build chart data with individual bar per month for colored bars
  const chartData = months.map((m, i) => ({
    name: m.label,
    count: m.count,
    fill: colors[i % colors.length],
  }));

  if (!hasData) {
    return (
      <div className="chart-container monthly-chart">
        <EmptyState title="No historical data available" description="Breach statistics will appear after monitoring detects breaches" />
      </div>
    );
  }

  return (
    <div className="chart-container monthly-chart">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: 12 }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <rect key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SeverityDot({ altitude, heightAboveAerodrome, threshold }) {
  const effectiveAlt = heightAboveAerodrome != null ? heightAboveAerodrome : altitude;
  if (effectiveAlt == null || threshold == null) return null;
  const gap = threshold - effectiveAlt;
  let color;
  if (gap > 100) color = '#E53935';       // red
  else if (gap > 50) color = '#FB8C00';    // orange
  else color = '#FDD835';                  // yellow
  return (
    <span
      className="severity-dot"
      style={{ background: color }}
      title={`${Math.round(gap)}ft below threshold`}
    />
  );
}

const PAGE_SIZE = 20;

function MonthlyBreachesTable({ year, month, selectedId, onSelect, reportedUpdates, airportFilter, altitudeThreshold, deletedIds }) {
  const [breaches, setBreaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBreachesForMonth(year, month).then((data) => {
      if (!cancelled) {
        setBreaches(data);
        setLoading(false);
      }
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [year, month]);

  const displayBreaches = useMemo(() => {
    let result = breaches;
    if (deletedIds && deletedIds.size > 0) {
      result = result.filter((b) => !deletedIds.has(b.id));
    }
    if (reportedUpdates && Object.keys(reportedUpdates).length > 0) {
      result = result.map((b) =>
        Object.prototype.hasOwnProperty.call(reportedUpdates, b.id) ? { ...b, reported: reportedUpdates[b.id] } : b
      );
    }
    if (airportFilter) {
      result = result.filter((b) => b.departure_airport === airportFilter);
    }
    return result;
  }, [breaches, deletedIds, reportedUpdates, airportFilter]);

  // Reset to first page when filters or data change
  useEffect(() => { setPage(0); }, [displayBreaches]);

  const totalPages = Math.max(1, Math.ceil(displayBreaches.length / PAGE_SIZE));
  const pageBreaches = displayBreaches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  if (loading) {
    return <div className="card"><p className="loading-text">Loading...</p></div>;
  }

  if (displayBreaches.length === 0) {
    return (
      <div className="card">
        <h3 className="card-title">Breaches by month</h3>
        <EmptyState title={`No breaches recorded for ${monthName} ${year}`} description="Select a different month to view breach records" />
      </div>
    );
  }

  // Group the current page's breaches by date
  const grouped = {};
  pageBreaches.forEach((b) => {
    if (!grouped[b.date]) grouped[b.date] = [];
    grouped[b.date].push(b);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="card">
      <h3 className="card-title">Breaches by month</h3>
      <table className="data-table grouped-table">
        <thead>
          <tr>
            <th>Flight number</th>
            <th>Type</th>
            <th>Airport</th>
            <th>Baro alt, ft</th>
            <th>QNH, hPa</th>
            <th>Corrected alt, ft</th>
            <th>Severity</th>
            <th>Timestamp</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedDates.map((date) => {
            const dateObj = new Date(date + 'T00:00:00');
            const dateLabel = format(dateObj, 'd MMMM yyyy');
            return [
              <tr key={`header-${date}`} className="date-group-header">
                <td colSpan={9}>{dateLabel}</td>
              </tr>,
              ...grouped[date].map((b) => (
                <tr
                  key={b.id}
                  className={`breach-row${selectedId === b.id ? ' breach-row-selected' : ''}`}
                  onClick={() => onSelect && onSelect(b)}
                >
                  <td>{formatCallsign(b.callsign)}</td>
                  <td>{b.aircraft_type || 'N/A'}</td>
                  <td>{b.departure_airport || 'Unknown'}</td>
                  <td>{b.altitude != null ? Math.round(b.altitude).toLocaleString() : 'N/A'}</td>
                  <td>{b.nav_qnh != null ? b.nav_qnh.toFixed(1) : 'N/A'}</td>
                  <td>{b.height_above_aerodrome != null ? Math.round(b.height_above_aerodrome).toLocaleString() : 'N/A'}</td>
                  <td><SeverityDot altitude={b.altitude} heightAboveAerodrome={b.height_above_aerodrome} threshold={altitudeThreshold} /></td>
                  <td>{format(new Date(b.timestamp), 'd MMM yyyy HH:mm:ss')}</td>
                  <td>{b.reported ? <span className="reported-pill">Reported</span> : null}</td>
                </tr>
              )),
            ];
          })}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
          >
            Previous
          </button>
          <span className="pagination-info">{page + 1} of {totalPages}</span>
          <button
            className="pagination-btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function OverviewPage() {
  const currentHourBreaches = useBreachStore((s) => s.currentHourBreaches);
  const boundary = useConfigStore((s) => s.boundary);
  const altitudeThreshold = useConfigStore((s) => s.altitudeThreshold);
  const airportFilter = useConfigStore((s) => s.airportFilter) || 'EGTR';
  const [monthlyStats, setMonthlyStats] = useState({ months: [], avg: 0, max: 0, total: 0, min: 0 });
  const [selectedBreach, setSelectedBreach] = useState(null);
  const [reportedUpdates, setReportedUpdates] = useState({});
  const [deletedIds, setDeletedIds] = useState(new Set());
  const [airportOnly, setAirportOnly] = useState(false);

  // Month/year selector state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Load 6-month stats
  useEffect(() => {
    getMonthlyStats(6).then(setMonthlyStats).catch(console.error);
  }, [currentHourBreaches]); // refresh when new breaches come in

  const sorted = useMemo(
    () => [...currentHourBreaches].sort((a, b) => b.timestamp - a.timestamp),
    [currentHourBreaches]
  );

  // Build year options (current year and previous year)
  const yearOptions = [now.getFullYear(), now.getFullYear() - 1];
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  }));

  return (
    <div className="overview-page">
      <div className="overview-layout">
        <div className="overview-main">
          <CurrentHourChart breaches={sorted} />
          <BreachesTable
            breaches={sorted}
            selectedId={selectedBreach?.id}
            onSelect={(b) => setSelectedBreach(selectedBreach?.id === b.id ? null : b)}
            altitudeThreshold={altitudeThreshold}
          />

          <h2 className="section-heading past-heading">Past breaches</h2>

          <div className="card past-breaches-card">
            <h3 className="card-title">6 months overview</h3>
            <StatCards stats={monthlyStats} />
            <MonthlyChart months={monthlyStats.months} />
          </div>

          <div className="month-selector">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="month-select"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="year-select"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="egtr-toggle-container">
              <label className="report-toggle">
                <input
                  type="checkbox"
                  checked={airportOnly}
                  onChange={() => setAirportOnly((v) => !v)}
                />
                <span className="report-toggle-slider" />
              </label>
              <span className="report-toggle-label">{airportFilter}</span>
            </div>
          </div>

          <MonthlyBreachesTable
            year={selectedYear}
            month={selectedMonth}
            selectedId={selectedBreach?.id}
            onSelect={(b) => setSelectedBreach(selectedBreach?.id === b.id ? null : b)}
            reportedUpdates={reportedUpdates}
            airportFilter={airportOnly ? airportFilter : null}
            altitudeThreshold={altitudeThreshold}
            deletedIds={deletedIds}
          />
        </div>
        <AlertExplorer
          breach={selectedBreach}
          boundary={boundary}
          onReportedChange={(id, reported) => {
            useBreachStore.getState().updateBreachReported(id, reported);
            setSelectedBreach((prev) => prev && prev.id === id ? { ...prev, reported } : prev);
            setReportedUpdates((prev) => ({ ...prev, [id]: reported }));
          }}
          onDelete={async (id) => {
            await deleteBreach(id);
            useBreachStore.getState().removeBreach(id);
            setDeletedIds((prev) => new Set(prev).add(id));
            setSelectedBreach(null);
          }}
        />
      </div>
    </div>
  );
}
