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

function EditableBoundary({ boundary, onBoundaryChange }) {
  const map = useMap();
  const rectRef = useRef(null);
  const markersRef = useRef([]);
  const debounceRef = useRef(null);

  const updateHandles = useCallback((bounds) => {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const positions = [
      // corners: SW, NW, NE, SE
      [sw.lat, sw.lng],
      [ne.lat, sw.lng],
      [ne.lat, ne.lng],
      [sw.lat, ne.lng],
      // edge midpoints: S, N, W, E
      [(sw.lat + ne.lat) / 2, sw.lng],
      [(sw.lat + ne.lat) / 2, ne.lng],
      [sw.lat, (sw.lng + ne.lng) / 2],
      [ne.lat, (sw.lng + ne.lng) / 2],
    ];
    markersRef.current.forEach((m, i) => {
      m.setLatLng(positions[i]);
    });
  }, []);

  const persistBoundary = useCallback((newBoundary) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      useConfigStore.getState().setBoundary(newBoundary);
    }, 500);
  }, []);

  const handleDrag = useCallback((index) => {
    return function () {
      const pos = this.getLatLng();
      const bounds = rectRef.current.getBounds();
      let sw = bounds.getSouthWest();
      let ne = bounds.getNorthEast();

      // corners: 0=SW, 1=NW, 2=NE, 3=SE
      // edges: 4=W, 5=E, 6=S, 7=N
      switch (index) {
        case 0: sw = L.latLng(pos.lat, pos.lng); break;
        case 1: ne = L.latLng(pos.lat, ne.lng); sw = L.latLng(sw.lat, pos.lng); break;
        case 2: ne = L.latLng(pos.lat, pos.lng); break;
        case 3: sw = L.latLng(pos.lat, sw.lng); ne = L.latLng(ne.lat, pos.lng); break;
        case 4: sw = L.latLng(sw.lat, pos.lng); break; // W edge
        case 5: ne = L.latLng(ne.lat, pos.lng); break; // E edge
        case 6: sw = L.latLng(pos.lat, sw.lng); break; // S edge
        case 7: ne = L.latLng(pos.lat, ne.lng); break; // N edge
      }

      const newBounds = L.latLngBounds(sw, ne);
      rectRef.current.setBounds(newBounds);
      updateHandles(newBounds);

      const newBoundary = {
        latMin: Math.min(sw.lat, ne.lat),
        latMax: Math.max(sw.lat, ne.lat),
        lonMin: Math.min(sw.lng, ne.lng),
        lonMax: Math.max(sw.lng, ne.lng),
      };
      onBoundaryChange(newBoundary);
      persistBoundary(newBoundary);
    };
  }, [onBoundaryChange, persistBoundary, updateHandles]);

  useEffect(() => {
    if (!boundary) return;

    const bounds = L.latLngBounds(
      [boundary.latMin, boundary.lonMin],
      [boundary.latMax, boundary.lonMax]
    );

    // Create rectangle
    const rect = L.rectangle(bounds, BOUNDARY_STYLE).addTo(map);
    rectRef.current = rect;

    // Create 8 drag handles (4 corners + 4 edge midpoints)
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const positions = [
      [sw.lat, sw.lng],
      [ne.lat, sw.lng],
      [ne.lat, ne.lng],
      [sw.lat, ne.lng],
      [(sw.lat + ne.lat) / 2, sw.lng],
      [(sw.lat + ne.lat) / 2, ne.lng],
      [sw.lat, (sw.lng + ne.lng) / 2],
      [ne.lat, (sw.lng + ne.lng) / 2],
    ];

    const icon = createHandleIcon();
    const markers = positions.map((pos, i) => {
      const marker = L.marker(pos, { icon, draggable: true }).addTo(map);
      marker.on('drag', handleDrag(i));
      return marker;
    });
    markersRef.current = markers;

    return () => {
      rect.remove();
      markers.forEach((m) => m.remove());
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []); // Only run on mount — handles sync via the second useEffect

  // Sync rectangle when boundary changes externally (e.g. from config panel)
  useEffect(() => {
    if (!boundary || !rectRef.current) return;
    const bounds = L.latLngBounds(
      [boundary.latMin, boundary.lonMin],
      [boundary.latMax, boundary.lonMax]
    );
    rectRef.current.setBounds(bounds);
    updateHandles(bounds);
  }, [boundary, updateHandles]);

  return null;
}

function FitBoundary({ boundary, padding }) {
  const map = useMap();
  useEffect(() => {
    if (!boundary) return;
    const bounds = L.latLngBounds(
      [boundary.latMin, boundary.lonMin],
      [boundary.latMax, boundary.lonMax]
    );
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
      const bounds = L.latLngBounds(
        [boundary.latMin, boundary.lonMin],
        [boundary.latMax, boundary.lonMax]
      );
      bounds.extend([lat, lng]);
      map.fitBounds(bounds, { padding: [15, 15] });
    } else {
      map.setView([lat, lng], 14);
    }
  }, [map, lat, lng, boundary]);
  return null;
}

function buildReportMailto(breach, email, altitudeThreshold, emailTemplate) {
  const timestamp = format(new Date(breach.timestamp), 'd MMM yyyy HH:mm:ss');
  const altitude = breach.altitude != null ? String(Math.round(breach.altitude)) : 'N/A';
  const agl = breach.agl != null ? Math.round(breach.agl) : null;
  const gap = agl != null && altitudeThreshold ? String(altitudeThreshold - agl) : 'N/A';
  const callsign = formatCallsign(breach.callsign);
  const threshold = String(altitudeThreshold || 1300);

  const body = emailTemplate
    .replace(/\[flight_number\]/g, callsign)
    .replace(/\[timestamp\]/g, timestamp)
    .replace(/\[threshold\]/g, threshold)
    .replace(/\[altitude\]/g, altitude)
    .replace(/\[delta_altitude\]/g, gap);

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
          <div className="alert-detail-label">Altitude</div>
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
            <th>Coordinates</th>
            <th>Airport</th>
            <th>Altitude, ft</th>
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
              <td>{b.longitude != null && b.latitude != null ? `${b.longitude.toFixed(6)},${b.latitude.toFixed(6)}` : 'N/A'}</td>
              <td>{b.departure_airport || 'Unknown'}</td>
              <td>{b.altitude != null ? Math.round(b.altitude).toLocaleString() : 'N/A'}</td>
              <td><SeverityDot agl={b.agl} threshold={altitudeThreshold} /></td>
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

function SeverityDot({ agl, threshold }) {
  if (agl == null || threshold == null) return null;
  const gap = threshold - agl;
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

function MonthlyBreachesTable({ year, month, selectedId, onSelect, reportedUpdates, airportFilter, altitudeThreshold }) {
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
    if (reportedUpdates && Object.keys(reportedUpdates).length > 0) {
      result = result.map((b) =>
        Object.prototype.hasOwnProperty.call(reportedUpdates, b.id) ? { ...b, reported: reportedUpdates[b.id] } : b
      );
    }
    if (airportFilter) {
      result = result.filter((b) => b.departure_airport === airportFilter);
    }
    return result;
  }, [breaches, reportedUpdates, airportFilter]);

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
            <th>Coordinates</th>
            <th>Airport</th>
            <th>Altitude, ft</th>
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
                <td colSpan={8}>{dateLabel}</td>
              </tr>,
              ...grouped[date].map((b) => (
                <tr
                  key={b.id}
                  className={`breach-row${selectedId === b.id ? ' breach-row-selected' : ''}`}
                  onClick={() => onSelect && onSelect(b)}
                >
                  <td>{formatCallsign(b.callsign)}</td>
                  <td>{b.aircraft_type || 'N/A'}</td>
                  <td>{b.longitude != null && b.latitude != null ? `${b.longitude.toFixed(6)},${b.latitude.toFixed(6)}` : 'N/A'}</td>
                  <td>{b.departure_airport || 'Unknown'}</td>
                  <td>{b.altitude != null ? Math.round(b.altitude).toLocaleString() : 'N/A'}</td>
                  <td><SeverityDot agl={b.agl} threshold={altitudeThreshold} /></td>
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
            setSelectedBreach(null);
          }}
        />
      </div>
    </div>
  );
}
