import { useUIStore } from '../../store/uiStore';
import './Header.css';

export default function Header() {
  const { setShowConfigPanel } = useUIStore();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <h1>✈️ Flight Tracking Dashboard</h1>
          <p className="subtitle">Monitoring low-altitude flights over Radlett</p>
        </div>
        <button
          className="config-button"
          onClick={() => setShowConfigPanel(true)}
          title="Open configuration panel"
        >
          ⚙️ Settings
        </button>
      </div>
    </header>
  );
}
