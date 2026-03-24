import { useState, useEffect, useRef } from 'react';
import { useConfigStore } from '../../store/configStore';
import { DEFAULT_BOUNDARY, ALTITUDE_THRESHOLD, ACTIVE_HOURS_START, ACTIVE_HOURS_END, DEFAULT_REPORT_EMAIL, DEFAULT_EMAIL_TEMPLATE } from '../../utils/constants';
import './ConfigPanel.css';

const EMAIL_PLACEHOLDERS = [
  { label: '[flight_number]', value: '[flight_number]' },
  { label: '[timestamp]', value: '[timestamp]' },
  { label: '[threshold]', value: '[threshold]' },
  { label: '[altitude]', value: '[altitude]' },
  { label: '[delta_altitude]', value: '[delta_altitude]' },
  { label: '[coordinates]', value: '[coordinates]' },
  { label: '[aircraft_type]', value: '[aircraft_type]' },
  { label: '[nav_qnh]', value: '[nav_qnh]' },
  { label: '[corrected_altitude]', value: '[corrected_altitude]' },
  { label: '[height_above_aerodrome]', value: '[height_above_aerodrome]' },
];

function EmailTemplateEditor({ template, onChange, onBack }) {
  const textareaRef = useRef(null);

  const insertPlaceholder = (placeholder) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = template.slice(0, start);
    const after = template.slice(end);
    const newValue = before + placeholder + after;
    onChange(newValue);
    // Restore cursor position after the inserted placeholder
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + placeholder.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="email-editor">
      <button className="email-editor-back" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="10 12 6 8 10 4" />
        </svg>
        Back to settings
      </button>
      <h3 className="email-editor-title">Email template</h3>
      <div className="email-editor-pills">
        {EMAIL_PLACEHOLDERS.map((p) => (
          <button
            key={p.value}
            className="email-editor-pill"
            onClick={() => insertPlaceholder(p.value)}
            type="button"
          >
            {p.label}
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        className="email-editor-textarea"
        value={template}
        onChange={(e) => onChange(e.target.value)}
        rows={16}
      />
    </div>
  );
}

export default function ConfigPanel({ onClose }) {
  const {
    boundary,
    altitudeThreshold,
    activeHoursStart,
    activeHoursEnd,
    reportEmail,
    airportFilter,
    skipAirportTypes,
    flightAwareApiKey,
    emailTemplate,
    setBoundary,
    setAltitudeThreshold,
    setActiveHours,
    setReportEmail,
    setAirportFilter,
    setSkipAirportTypes,
    setFlightAwareApiKey,
    setEmailTemplate,
  } = useConfigStore();

  const [view, setView] = useState('settings');
  const [formData, setFormData] = useState({
    centerLat: String(boundary?.centerLat ?? DEFAULT_BOUNDARY.centerLat),
    centerLon: String(boundary?.centerLon ?? DEFAULT_BOUNDARY.centerLon),
    radiusKm: String(boundary?.radiusKm ?? DEFAULT_BOUNDARY.radiusKm),
    altitudeThreshold: String(altitudeThreshold || ALTITUDE_THRESHOLD),
    activeHoursStart: String(activeHoursStart ?? ACTIVE_HOURS_START),
    activeHoursEnd: String(activeHoursEnd ?? ACTIVE_HOURS_END),
    reportEmail: reportEmail || DEFAULT_REPORT_EMAIL,
    airportFilter: airportFilter || 'EGTR',
    skipAirportTypes: skipAirportTypes || '',
    flightAwareApiKey: flightAwareApiKey || '',
    emailTemplate: emailTemplate || DEFAULT_EMAIL_TEMPLATE,
  });

  useEffect(() => {
    setFormData({
      centerLat: String(boundary?.centerLat ?? DEFAULT_BOUNDARY.centerLat),
      centerLon: String(boundary?.centerLon ?? DEFAULT_BOUNDARY.centerLon),
      radiusKm: String(boundary?.radiusKm ?? DEFAULT_BOUNDARY.radiusKm),
      altitudeThreshold: String(altitudeThreshold || ALTITUDE_THRESHOLD),
      activeHoursStart: String(activeHoursStart ?? ACTIVE_HOURS_START),
      activeHoursEnd: String(activeHoursEnd ?? ACTIVE_HOURS_END),
      reportEmail: reportEmail || DEFAULT_REPORT_EMAIL,
      airportFilter: airportFilter || 'EGTR',
      skipAirportTypes: skipAirportTypes || '',
      flightAwareApiKey: flightAwareApiKey || '',
      emailTemplate: emailTemplate || DEFAULT_EMAIL_TEMPLATE,
    });
  }, [boundary, altitudeThreshold, activeHoursStart, activeHoursEnd, reportEmail, airportFilter, skipAirportTypes, flightAwareApiKey, emailTemplate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const newBoundary = {
        centerLat: parseFloat(formData.centerLat),
        centerLon: parseFloat(formData.centerLon),
        radiusKm: parseFloat(formData.radiusKm),
      };
      await setBoundary(newBoundary);
      await setAltitudeThreshold(parseInt(formData.altitudeThreshold, 10));
      await setActiveHours(parseInt(formData.activeHoursStart, 10), parseInt(formData.activeHoursEnd, 10));
      await setReportEmail(formData.reportEmail);
      await setAirportFilter(formData.airportFilter);
      await setSkipAirportTypes(formData.skipAirportTypes);
      await setFlightAwareApiKey(formData.flightAwareApiKey);
      await setEmailTemplate(formData.emailTemplate);
      onClose();
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };

  return (
    <div className="config-panel">
      <div className="config-header">
        <h2>{view === 'settings' ? 'Configuration' : 'Email template'}</h2>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="10" y1="10" x2="22" y2="22" />
            <line x1="22" y1="10" x2="10" y2="22" />
          </svg>
        </button>
      </div>

      {view === 'email' ? (
        <>
          <EmailTemplateEditor
            template={formData.emailTemplate}
            onChange={(val) => setFormData((prev) => ({ ...prev, emailTemplate: val }))}
            onBack={() => setView('settings')}
          />
          <button onClick={handleSave} className="config-save-btn">
            Save configuration
          </button>
        </>
      ) : (
        <>
          <div className="config-body">
            <div className="config-group">
              <span className="config-group-label">Monitoring boundary</span>
              <div className="config-group-fields config-group-fields--row">
                <div className="config-input">
                  <label className="config-input-label">Center latitude</label>
                  <input type="number" name="centerLat" value={formData.centerLat} onChange={handleChange} step="0.001" />
                </div>
                <div className="config-input">
                  <label className="config-input-label">Center longitude</label>
                  <input type="number" name="centerLon" value={formData.centerLon} onChange={handleChange} step="0.001" />
                </div>
                <div className="config-input">
                  <label className="config-input-label">Radius, km</label>
                  <input type="number" name="radiusKm" value={formData.radiusKm} onChange={handleChange} step="0.1" min="0.1" />
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
                  <label className="config-input-label">Airport</label>
                  <input type="text" name="airportFilter" value={formData.airportFilter} onChange={handleChange} placeholder="EGTR" />
                </div>
              </div>
              <div className="config-group-fields config-group-fields--row">
                <div className="config-input">
                  <label className="config-input-label">Skip airport lookup for types</label>
                  <input type="text" name="skipAirportTypes" value={formData.skipAirportTypes} onChange={handleChange} placeholder="R22, P28A" />
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
            <div className="config-group">
              <span className="config-group-label">FlightAware API</span>
              <div className="config-group-fields config-group-fields--row">
                <div className="config-input">
                  <label className="config-input-label">API key</label>
                  <input type="password" name="flightAwareApiKey" value={formData.flightAwareApiKey} onChange={handleChange} placeholder="Your FlightAware AeroAPI key" />
                </div>
              </div>
            </div>
          </div>

          <div className="config-input config-input--full">
            <label className="config-input-label">Report email</label>
            <input type="email" name="reportEmail" value={formData.reportEmail} onChange={handleChange} />
          </div>
          <button className="edit-email-link" type="button" onClick={() => setView('email')}>
            Edit email template
          </button>

          <button onClick={handleSave} className="config-save-btn">
            Save configuration
          </button>
        </>
      )}
    </div>
  );
}
