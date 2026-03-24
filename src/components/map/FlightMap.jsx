import { useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useFlightStore } from '../../store/flightStore';
import { useConfigStore } from '../../store/configStore';
import { getBoundaryCenter } from '../../services/calculations/boundaryChecker';
import BoundaryOverlay from './BoundaryOverlay';
import FlightMarker from './FlightMarker';
import './FlightMap.css';

/**
 * Small helper component that re-centers the map when the boundary changes.
 */
function RecenterMap({ center }) {
  const map = useMap();
  useMemo(() => {
    if (center) {
      map.setView([center.latitude, center.longitude], map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function FlightMap() {
  const flights = useFlightStore((s) => s.flights);
  const boundary = useConfigStore((s) => s.boundary);
  const altitudeThreshold = useConfigStore((s) => s.altitudeThreshold);
  const groundElevation = useConfigStore((s) => s.airportElevation);

  const center = useMemo(() => getBoundaryCenter(boundary), [boundary]);

  if (!center) {
    return (
      <div className="map-placeholder">
        <p>No boundary configured. Open Settings to set coordinates.</p>
      </div>
    );
  }

  return (
    <div className="flight-map-container">
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={13}
        className="flight-map"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <RecenterMap center={center} />
        <BoundaryOverlay boundary={boundary} />

        {flights.map((flight) => (
          <FlightMarker
            key={flight.icao24}
            flight={flight}
            altitudeThreshold={altitudeThreshold}
            groundElevation={groundElevation}
          />
        ))}
      </MapContainer>

      <div className="map-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ color: '#646cff' }}>&#9992;</span>
          Normal altitude
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ color: '#ff6b6b' }}>&#9992;</span>
          Below {altitudeThreshold} ft AGL
        </span>
        <span className="legend-item">
          <span className="legend-boundary" />
          Monitoring boundary
        </span>
      </div>
    </div>
  );
}
