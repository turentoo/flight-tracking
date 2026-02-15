import { useUIStore } from '../../store/uiStore';
import './TabNavigation.css';

export default function TabNavigation() {
  const { activeTab, setActiveTab } = useUIStore();

  const tabs = [
    { id: 'map', label: '📍 Map', icon: '📍' },
    { id: 'current', label: '🚨 Current Hour', icon: '🚨' },
    { id: 'history', label: '📊 History', icon: '📊' },
  ];

  return (
    <nav className="tab-navigation">
      <div className="tabs-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
