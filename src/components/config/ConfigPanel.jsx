import { useState, useEffect } from 'react';
import { useConfigStore } from '../../store/configStore';
import { DEFAULT_BOUNDARY, ALTITUDE_THRESHOLD, ACTIVE_HOURS_START, ACTIVE_HOURS_END, DEFAULT_REPORT_EMAIL } from '../../utils/constants';
import './ConfigPanel.css';

export default function ConfigPanel({ onClose }) {
  const {
    boundary,
    altitudeThreshold,
    activeHoursStart,
    activeHoursEnd,
    reportEmail,
    airportFilter,
    setBoundary,
    setAltitudeThreshold,
    setActiveHours,
    setReportEmail,
    setAirportFilter,
  } = useConfigStore();

  const [formData, setFormData] = useState({
    latMin: String(boundary?.latMin ?? DEFAULT_BOUNDARY.latMin),
    latMax: String(boundary?.latMax ?? DEFAULT_BOUNDARY.latMax),
    lonMin: String(boundary?.lonMin ?? DEFAULT_BOUNDARY.lonMin),
    lonMax: String(boundary?.lonMax ?? DEFAULT_BOUNDARY.lonMax),
    altitudeThreshold: String(altitudeThreshold || ALTITUDE_THRESHOLD),
    activeHoursStart: String(activeHoursStart ?? ACTIVE_HOURS_START),
    activeHoursEnd: String(activeHoursEnd ?? ACTIVE_HOURS_END),
    reportEmail: reportEmail || DEFAULT_REPORT_EMAIL,
    airportFilter: airportFilter || '',
  });

  useEffect(() => {
    setFormData({
      latMin: String(boundary?.latMin ?? DEFAULT_BOUNDARY.latMin),
      latMax: String(boundary?.latMax ?? DEFAULT_BOUNDARY.latMax),
      lonMin: String(boundary?.lonMin ?? DEFAULT_BOUNDARY.lonMin),
      lonMax: String(boundary?.lonMax ?? DEFAULT_BOUNDARY.lonMax),
      altitudeThreshold: String(altitudeThreshold || ALTITUDE_THRESHOLD),
      activeHoursStart: String(activeHoursStart ?? ACTIVE_HOURS_START),
      activeHoursEnd: String(activeHoursEnd ?? ACTIVE_HOURS_END),
      reportEmail: reportEmail || DEFAULT_REPORT_EMAIL,
      airportFilter: airportFilter || '',
    });
  }, [boundary, altitudeThreshold, activeHoursStart, activeHoursEnd, reportEmail, airportFilter]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const newBoundary = {
        latMin: parseFloat(formData.latMin),
        latMax: parseFloat(formData.latMax),
        lonMin: parseFloat(formData.lonMin),
        lonMax: parseFloat(formData.lonMax),
      };
      await setBoundary(newBoundary);
      await setAltitudeThreshold(parseInt(formData.altitudeThreshold, 10));
      await setActiveHours(parseInt(formData.activeHoursStart, 10), parseInt(formData.activeHoursEnd, 10));
      await setReportEmail(formData.reportEmail);
      await setAirportFilter(formData.airportFilter);
      onClose();
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };

  return (
    <div className="config-panel">
      <div className="config-header">
        <h2>Configuration</h2>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="10" y1="10" x2="22" y2="22" />
            <line x1="22" y1="10" x2="10" y2="22" />
          </svg>
        </button>
      </div>

      <div className="config-body">
        <div className="config-group">
          <span className="config-group-label">Monitoring boundary</span>
          <div className="config-group-fields config-group-fields--grid">
            <div className="config-input">
              <label className="config-input-label">Latitude min</label>
              <input type="number" name="latMin" value={formData.latMin} onChange={handleChange} step="0.001" />
            </div>
            <div className="config-input">
              <label className="config-input-label">Latitude max</label>
              <input type="number" name="latMax" value={formData.latMax} onChange={handleChange} step="0.001" />
            </div>
            <div className="config-input">
              <label className="config-input-label">Longitude min</label>
              <input type="number" name="lonMin" value={formData.lonMin} onChange={handleChange} step="0.001" />
            </div>
            <div className="config-input">
              <label className="config-input-label">Longitude max</label>
              <input type="number" name="lonMax" value={formData.lonMax} onChange={handleChange} step="0.001" />
            </div>
          </div>
        </div>

        <div className="config-group">
          <span className="config-group-label">Flight parameters</span>
          <div className="config-group-fields config-group-fields--row">
            <div className="config-input">
              <label className="config-input-label">Altitude threshold, ft</label>
              <input type="number" name="altitudeThreshold" value={formData.altitudeThreshold} onChange={handleChange} min="100" step="100" />
            </div>
            <div className="config-input">
              <label className="config-input-label">Airport filter (optional)</label>
              <input type="text" name="airportFilter" value={formData.airportFilter} onChange={handleChange} placeholder="" />
            </div>
          </div>
        </div>

        <div className="config-group">
          <span className="config-group-label">Monitoring hours</span>
          <div className="config-group-fields config-group-fields--row">
            <div className="config-input">
              <label className="config-input-label">Start hour (24h)</label>
              <input type="number" name="activeHoursStart" value={formData.activeHoursStart} onChange={handleChange} min="0" max="23" />
            </div>
            <div className="config-input">
              <label className="config-input-label">End hour (24h)</label>
              <input type="number" name="activeHoursEnd" value={formData.activeHoursEnd} onChange={handleChange} min="0" max="23" />
            </div>
          </div>
        </div>
      </div>

      <div className="config-input config-input--full">
        <label className="config-input-label">Report email</label>
        <input type="email" name="reportEmail" value={formData.reportEmail} onChange={handleChange} />
      </div>

      <button onClick={handleSave} className="config-save-btn">
        Save configuration
      </button>
    </div>
  );
}
