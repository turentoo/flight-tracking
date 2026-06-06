import { useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useConfigStore } from '../../store/configStore';
import './TopBar.css';

const PAGE_BREADCRUMBS = {
  overview: { parent: 'Dashboards', label: 'Overview' },
  'breach-history': { parent: 'Pages', label: 'Breach history' },
};

const MONITORING_POLL_MS = 15_000;

export default function TopBar() {
  const activePage = useUIStore((s) => s.activePage);
  const setShowConfigPanel = useUIStore((s) => s.setShowConfigPanel);
  const monitoringEnabled = useConfigStore((s) => s.monitoringEnabled);
  const setMonitoringEnabled = useConfigStore((s) => s.setMonitoringEnabled);
  const refreshMonitoringEnabled = useConfigStore((s) => s.refreshMonitoringEnabled);
  const crumb = PAGE_BREADCRUMBS[activePage] || PAGE_BREADCRUMBS.overview;

  // Keep the toggle reflective of the value in Supabase in case the backend
  // (or another browser session) flips it.
  useEffect(() => {
    refreshMonitoringEnabled();
    const id = setInterval(refreshMonitoringEnabled, MONITORING_POLL_MS);
    return () => clearInterval(id);
  }, [refreshMonitoringEnabled]);

  const handleToggle = () => {
    setMonitoringEnabled(!monitoringEnabled);
  };

  return (
    <div className="topbar">
      <div className="topbar-breadcrumb">
        <span className="breadcrumb-parent">{crumb.parent}</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{crumb.label}</span>
      </div>
      <div className="topbar-actions">
        <button
          type="button"
          className={`monitoring-toggle ${monitoringEnabled ? 'is-on' : 'is-off'}`}
          onClick={handleToggle}
          aria-pressed={monitoringEnabled}
          title={monitoringEnabled ? 'Monitoring is ON — click to pause backend polling' : 'Monitoring is OFF — click to resume backend polling'}
        >
          <span className={`monitoring-dot ${monitoringEnabled ? 'pulse' : ''}`} />
          <span className="monitoring-label">Monitoring</span>
          <span className="monitoring-state">{monitoringEnabled ? 'ON' : 'OFF'}</span>
        </button>
        <button
          className="topbar-settings"
          onClick={() => setShowConfigPanel(true)}
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
