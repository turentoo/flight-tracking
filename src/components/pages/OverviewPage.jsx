import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import { useBreachStore } from '../../store/breachStore';
import { useConfigStore } from '../../store/configStore';
import { useUIStore } from '../../store/uiStore';
import { getBreachesForMonth, getMonthlyStats } from '../../services/storage/breachRepository';
import { getCurrentHour, getHourRange } from '../../utils/timeHelpers';
import { formatCallsign } from '../../utils/formatters';
import { REFERENCE_AIRPORT_ICAO } from '../../utils/constants';
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
        zoom={12}
        zoomControl={true}
        attributionControl={false}
        dragging={true}
        scrollWheelZoom={true}
        doubleClickZoom={false}
        touchZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <EditableBoundary boundary={boundary} onBoundaryChange={handleBoundaryChange} />
      </MapContainer>
    </div>
  );
}

function CurrentHourChart({ breaches }) {
  const hour = getCurrentHour();
  const hourRange = getHourRange(hour);

  // Group breaches into 5-minute intervals
  const chartData = useMemo(() => {
    const intervals = [];
    for (let m = 0; m < 60; m += 5) {
      intervals.push({
        label: `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        count: 0,
      });
    }
    breaches.forEach((b) => {
      const d = new Date(b.timestamp);
      const min = d.getMinutes();
      const idx = Math.floor(min / 5);
      if (idx < intervals.length) intervals[idx].count += 1;
    });
    return intervals;
  }, [breaches, hour]);

  const hasData = breaches.length > 0;

  return (
    <div className="card current-hour-section">
      <h2 className="section-heading">
        Current hour: {hourRange}
      </h2>
      <div className="current-hour-row">
        <div className="chart-container current-hour-chart">
          {!hasData ? (
            <EmptyState title="No flight activity this hour" description="Breaches will appear here when detected" />
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

function BreachesTable({ breaches, title }) {
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
            <th>Coordinates</th>
            <th>Airport</th>
            <th>Altitude, ft</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {breaches.map((b) => (
            <tr key={b.id}>
              <td>{formatCallsign(b.callsign)}</td>
              <td>{b.longitude != null && b.latitude != null ? `${b.longitude.toFixed(6)},${b.latitude.toFixed(6)}` : 'N/A'}</td>
              <td>{REFERENCE_AIRPORT_ICAO.replace('EG', '')}</td>
              <td>{b.altitude != null ? Math.round(b.altitude).toLocaleString() : 'N/A'}</td>
              <td>{format(new Date(b.timestamp), 'd MMM yyyy HH:mm:ss')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCards({ stats }) {
  const cards = [
    { label: 'Avg per month', value: stats.avg, color: 'var(--stat-blue)' },
    { label: 'Max per month', value: stats.max, color: 'var(--stat-teal)' },
    { label: 'Total breaches', value: stats.total, color: 'var(--stat-dark)' },
    { label: 'Min per month', value: stats.min, color: 'var(--stat-purple)' },
  ];

  return (
    <div className="stat-cards">
      {cards.map((c) => (
        <div key={c.label} className="stat-card" style={{ borderLeftColor: c.color }}>
          <span className="stat-card-label">{c.label}</span>
          <span className="stat-card-value">{c.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function MonthlyChart({ months }) {
  const hasData = months.some((m) => m.count > 0);
  const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-1)', 'var(--chart-2)'];

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
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, index) => (
              <rect key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MonthlyBreachesTable({ year, month }) {
  const [breaches, setBreaches] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  if (loading) {
    return <div className="card"><p className="loading-text">Loading...</p></div>;
  }

  if (breaches.length === 0) {
    return (
      <div className="card">
        <h3 className="card-title">Breaches by month</h3>
        <EmptyState title={`No breaches recorded for ${monthName} ${year}`} description="Select a different month to view breach records" />
      </div>
    );
  }

  // Group by date
  const grouped = {};
  breaches.forEach((b) => {
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
            <th>Coordinates</th>
            <th>Airport</th>
            <th>Altitude, ft</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {sortedDates.map((date) => {
            const dateObj = new Date(date + 'T00:00:00');
            const dateLabel = format(dateObj, 'd MMMM yyyy');
            return [
              <tr key={`header-${date}`} className="date-group-header">
                <td colSpan={5}>{dateLabel}</td>
              </tr>,
              ...grouped[date].map((b) => (
                <tr key={b.id}>
                  <td>{formatCallsign(b.callsign)}</td>
                  <td>{b.longitude != null && b.latitude != null ? `${b.longitude.toFixed(6)},${b.latitude.toFixed(6)}` : 'N/A'}</td>
                  <td>{REFERENCE_AIRPORT_ICAO.replace('EG', '')}</td>
                  <td>{b.altitude != null ? Math.round(b.altitude).toLocaleString() : 'N/A'}</td>
                  <td>{format(new Date(b.timestamp), 'd MMM yyyy HH:mm:ss')}</td>
                </tr>
              )),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function OverviewPage() {
  const currentHourBreaches = useBreachStore((s) => s.currentHourBreaches);
  const [monthlyStats, setMonthlyStats] = useState({ months: [], avg: 0, max: 0, total: 0, min: 0 });

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
      <CurrentHourChart breaches={sorted} />
      <BreachesTable breaches={sorted} />

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
      </div>

      <MonthlyBreachesTable year={selectedYear} month={selectedMonth} />
    </div>
  );
}
