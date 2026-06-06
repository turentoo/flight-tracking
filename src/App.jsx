import { useEffect, useState } from 'react';
import { useConfigStore } from './store/configStore';
import { useUIStore } from './store/uiStore';
import useRecentBreachesPolling from './hooks/useRecentBreachesPolling';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import OverviewPage from './components/pages/OverviewPage';
import BreachHistoryPage from './components/pages/BreachHistoryPage';
import ConfigPanel from './components/config/ConfigPanel';
import { getAirportByICAO } from './services/api/ourAirportsClient';
import { REFERENCE_AIRPORT_ICAO } from './utils/constants';
import './App.css';

function App() {
  const { loadConfig, setAirportElevation, isLoading } = useConfigStore();
  const { activePage, showConfigPanel, setShowConfigPanel } = useUIStore();
  const [appReady, setAppReady] = useState(false);

  // Detection runs in the backend worker; the browser only displays data.
  // Poll Supabase periodically to keep the "past 60 minutes" view fresh.
  useRecentBreachesPolling(appReady);

  // Escape key closes config panel.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showConfigPanel) {
        setShowConfigPanel(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showConfigPanel, setShowConfigPanel]);

  // Initialize configuration and load airport elevation
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await loadConfig();

        try {
          const airport = await getAirportByICAO(REFERENCE_AIRPORT_ICAO);
          if (airport && airport.elevation) {
            await setAirportElevation(airport.elevation);
          }
        } catch (error) {
          console.warn('Could not fetch airport elevation:', error);
        }

        setAppReady(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        setAppReady(true);
      }
    };

    initializeApp();
  }, [loadConfig, setAirportElevation]);

  if (!appReady || isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing Flight Tracking Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main-area">
        <TopBar />
        <main className="main-content">
          {activePage === 'overview' && <OverviewPage />}
          {activePage === 'breach-history' && <BreachHistoryPage />}
        </main>
      </div>

      {showConfigPanel && (
        <div className="modal-overlay" onClick={() => setShowConfigPanel(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <ConfigPanel onClose={() => setShowConfigPanel(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
