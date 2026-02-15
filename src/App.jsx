import { useEffect, useState } from 'react';
import { useConfigStore } from './store/configStore';
import { useUIStore } from './store/uiStore';
import { useFlightStore } from './store/flightStore';
import useTimeWindow from './hooks/useTimeWindow';
import useFlightPolling from './hooks/useFlightPolling';
import useBreachDetection from './hooks/useBreachDetection';
import Header from './components/layout/Header';
import StatusBar from './components/layout/StatusBar';
import TabNavigation from './components/layout/TabNavigation';
import ConfigPanel from './components/config/ConfigPanel';
import FlightMap from './components/map/FlightMap';
import BreachAlertBanner from './components/current/BreachAlertBanner';
import CurrentHourPanel from './components/current/CurrentHourPanel';
import HistoryView from './components/history/HistoryView';
import { getAirportByICAO } from './services/api/ourAirportsClient';
import { REFERENCE_AIRPORT_ICAO } from './utils/constants';
import { formatAltitude, formatVelocity, formatHeading, formatCallsign } from './utils/formatters';
import './App.css';

function FlightTable() {
  const flights = useFlightStore((s) => s.flights);
  const groundElevation = useConfigStore((s) => s.airportElevation);

  if (flights.length === 0) return null;

  return (
    <div className="flight-list">
      <h3>Flights in Monitoring Area ({flights.length})</h3>
      <div className="flight-table-wrap">
        <table className="flight-table">
          <thead>
            <tr>
              <th>Callsign</th>
              <th>ICAO24</th>
              <th>Altitude</th>
              <th>AGL</th>
              <th>Speed</th>
              <th>Heading</th>
              <th>Lat</th>
              <th>Lon</th>
            </tr>
          </thead>
          <tbody>
            {flights.map((f) => {
              const altFeet = f.barometricAltitude != null ? f.barometricAltitude * 3.28084 : null;
              const agl = altFeet != null && groundElevation != null ? altFeet - groundElevation : null;
              return (
                <tr key={f.icao24} className={f.onGround ? 'on-ground' : ''}>
                  <td className="mono">{formatCallsign(f.callsign)}</td>
                  <td className="mono">{f.icao24.toUpperCase()}</td>
                  <td>{altFeet != null ? formatAltitude(altFeet) : 'N/A'}</td>
                  <td>{agl != null ? formatAltitude(agl) : 'N/A'}</td>
                  <td>{formatVelocity(f.velocity)}</td>
                  <td>{formatHeading(f.trueTrack)}</td>
                  <td>{f.latitude?.toFixed(4) ?? 'N/A'}</td>
                  <td>{f.longitude?.toFixed(4) ?? 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MapTab() {
  return (
    <div className="map-tab">
      <FlightMap />
      <FlightTable />
    </div>
  );
}

function App() {
  const { loadConfig, setAirportElevation, isLoading } = useConfigStore();
  const { activeTab, showConfigPanel, setShowConfigPanel } = useUIStore();
  const [appReady, setAppReady] = useState(false);

  const { isActive } = useTimeWindow();
  useFlightPolling(isActive);
  const { onBreachRef } = useBreachDetection(isActive);

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
      <BreachAlertBanner onBreachRef={onBreachRef} />
      <Header />
      <StatusBar />
      <TabNavigation />

      <main className="app-main">
        <div className="tab-content">
          {activeTab === 'map' && <MapTab />}
          {activeTab === 'current' && <CurrentHourPanel />}
          {activeTab === 'history' && <HistoryView />}
        </div>
      </main>

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
