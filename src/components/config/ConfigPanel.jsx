import { useState, useEffect } from 'react';
import { useConfigStore } from '../../store/configStore';
import { DEFAULT_BOUNDARY, ALTITUDE_THRESHOLD, ACTIVE_HOURS_START, ACTIVE_HOURS_END } from '../../utils/constants';
import { exportBreachesCsv } from '../../utils/exportCsv';
import { deleteAllBreaches } from '../../services/storage/breachRepository';
import { useBreachStore } from '../../store/breachStore';
import './ConfigPanel.css';

export default function ConfigPanel({ onClose }) {
  const {
    boundary,
    altitudeThreshold,
    activeHoursStart,
    activeHoursEnd,
    airportElevation,
    setBoundary,
    setAltitudeThreshold,
    setActiveHours,
  } = useConfigStore();

  const { setBreaches, setCurrentHourBreaches } = useBreachStore();

  const [formData, setFormData] = useState({
    latMin: boundary?.latMin || DEFAULT_BOUNDARY.latMin,
    latMax: boundary?.latMax || DEFAULT_BOUNDARY.latMax,
    lonMin: boundary?.lonMin || DEFAULT_BOUNDARY.lonMin,
    lonMax: boundary?.lonMax || DEFAULT_BOUNDARY.lonMax,
    altitudeThreshold: altitudeThreshold || ALTITUDE_THRESHOLD,
    activeHoursStart: activeHoursStart || ACTIVE_HOURS_START,
    activeHoursEnd: activeHoursEnd || ACTIVE_HOURS_END,
  });

  const [exportStatus, setExportStatus] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setFormData({
      latMin: boundary?.latMin || DEFAULT_BOUNDARY.latMin,
      latMax: boundary?.latMax || DEFAULT_BOUNDARY.latMax,
      lonMin: boundary?.lonMin || DEFAULT_BOUNDARY.lonMin,
      lonMax: boundary?.lonMax || DEFAULT_BOUNDARY.lonMax,
      altitudeThreshold: altitudeThreshold || ALTITUDE_THRESHOLD,
      activeHoursStart: activeHoursStart || ACTIVE_HOURS_START,
      activeHoursEnd: activeHoursEnd || ACTIVE_HOURS_END,
    });
  }, [boundary, altitudeThreshold, activeHoursStart, activeHoursEnd]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes('Lat') || name.includes('Lon') ? parseFloat(value) : parseInt(value, 10),
    }));
  };

  const handleSave = async () => {
    try {
      const newBoundary = {
        latMin: formData.latMin,
        latMax: formData.latMax,
        lonMin: formData.lonMin,
        lonMax: formData.lonMax,
      };
      await setBoundary(newBoundary);
      await setAltitudeThreshold(formData.altitudeThreshold);
      await setActiveHours(formData.activeHoursStart, formData.activeHoursEnd);
      onClose();
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };

  const handleReset = () => {
    setFormData({
      latMin: DEFAULT_BOUNDARY.latMin,
      latMax: DEFAULT_BOUNDARY.latMax,
      lonMin: DEFAULT_BOUNDARY.lonMin,
      lonMax: DEFAULT_BOUNDARY.lonMax,
      altitudeThreshold: ALTITUDE_THRESHOLD,
      activeHoursStart: ACTIVE_HOURS_START,
      activeHoursEnd: ACTIVE_HOURS_END,
    });
  };

  const handleExport = async () => {
    try {
      setExportStatus('exporting');
      const count = await exportBreachesCsv();
      setExportStatus(`Exported ${count} records`);
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      setExportStatus(err.message);
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  const handleClearData = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    try {
      await deleteAllBreaches();
      setBreaches([]);
      setCurrentHourBreaches([]);
      setConfirmClear(false);
      setExportStatus('All breach data cleared');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      console.error('Error clearing data:', err);
    }
  };

  return (
    <div className="config-panel">
      <div className="config-header">
        <h2>Configuration</h2>
        <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="config-section">
        <h3>Monitoring Boundary</h3>
        <p className="section-description">Define the rectangular area over Radlett to monitor</p>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="cfg-latMin">Latitude Min</label>
            <input id="cfg-latMin" type="number" name="latMin" value={formData.latMin} onChange={handleChange} step="0.001" />
          </div>
          <div className="form-group">
            <label htmlFor="cfg-latMax">Latitude Max</label>
            <input id="cfg-latMax" type="number" name="latMax" value={formData.latMax} onChange={handleChange} step="0.001" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="cfg-lonMin">Longitude Min</label>
            <input id="cfg-lonMin" type="number" name="lonMin" value={formData.lonMin} onChange={handleChange} step="0.001" />
          </div>
          <div className="form-group">
            <label htmlFor="cfg-lonMax">Longitude Max</label>
            <input id="cfg-lonMax" type="number" name="lonMax" value={formData.lonMax} onChange={handleChange} step="0.001" />
          </div>
        </div>
      </div>

      <div className="config-section">
        <h3>Breach Detection</h3>
        <p className="section-description">Settings for low-altitude flight detection</p>

        <div className="form-group">
          <label htmlFor="cfg-threshold">Altitude Threshold (AGL feet)</label>
          <input id="cfg-threshold" type="number" name="altitudeThreshold" value={formData.altitudeThreshold} onChange={handleChange} min="100" step="100" />
          <small>Flights below this altitude will be recorded as breaches</small>
        </div>
      </div>

      <div className="config-section">
        <h3>Operating Hours</h3>
        <p className="section-description">When to poll for flights and record breaches</p>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="cfg-start">Start Hour (24h)</label>
            <input id="cfg-start" type="number" name="activeHoursStart" value={formData.activeHoursStart} onChange={handleChange} min="0" max="23" />
          </div>
          <div className="form-group">
            <label htmlFor="cfg-end">End Hour (24h)</label>
            <input id="cfg-end" type="number" name="activeHoursEnd" value={formData.activeHoursEnd} onChange={handleChange} min="0" max="23" />
          </div>
        </div>
      </div>

      {airportElevation && (
        <div className="config-section info">
          <h3>Airport Information</h3>
          <p><strong>Radlett Aerodrome (EGTR)</strong></p>
          <p>Elevation: {Math.round(airportElevation)} ft AMSL</p>
        </div>
      )}

      <div className="config-section">
        <h3>Data Management</h3>
        <p className="section-description">Export or clear stored breach records</p>

        <div className="data-actions">
          <button onClick={handleExport} className="btn-secondary" disabled={exportStatus === 'exporting'}>
            {exportStatus === 'exporting' ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={handleClearData}
            className={`btn-danger ${confirmClear ? 'confirm' : ''}`}
          >
            {confirmClear ? 'Confirm Clear All Data' : 'Clear All Data'}
          </button>
        </div>
        {exportStatus && exportStatus !== 'exporting' && (
          <p className="export-status">{exportStatus}</p>
        )}
      </div>

      <div className="config-actions">
        <button onClick={handleReset} className="btn-secondary">
          Reset to Defaults
        </button>
        <button onClick={handleSave} className="btn-primary">
          Save Configuration
        </button>
      </div>
    </div>
  );
}
