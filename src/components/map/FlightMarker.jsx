import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { formatCallsign, formatAltitude, formatVelocity, formatHeading } from '../../utils/formatters';

/**
 * Create a rotated aircraft icon using a div icon with CSS transform.
 * Color changes based on whether the flight is low-altitude.
 */
const createAircraftIcon = (heading, isLowAltitude) => {
  const color = isLowAltitude ? '#ff6b6b' : '#646cff';
  const rotation = heading != null ? Math.round(heading) : 0;

  return L.divIcon({
    className: 'flight-marker-icon',
    html: `<div style="transform: rotate(${rotation}deg); color: ${color}; font-size: 22px; line-height: 1; text-align: center;">&#9992;</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

export default function FlightMarker({ flight, altitudeThreshold, groundElevation }) {
  if (flight.latitude == null || flight.longitude == null) return null;

  const altFeet = flight.barometricAltitude != null
    ? flight.barometricAltitude * 3.28084
    : null;
  const agl = altFeet != null && groundElevation != null
    ? altFeet - groundElevation
    : altFeet;
  const isLowAltitude = agl != null && agl < altitudeThreshold;

  const icon = createAircraftIcon(flight.trueTrack, isLowAltitude);

  return (
    <Marker position={[flight.latitude, flight.longitude]} icon={icon}>
      <Popup>
        <div className="flight-popup">
          <strong>{formatCallsign(flight.callsign)}</strong>
          <table>
            <tbody>
              <tr><td>ICAO24</td><td>{flight.icao24.toUpperCase()}</td></tr>
              <tr><td>Altitude</td><td>{altFeet != null ? formatAltitude(altFeet) : 'N/A'}</td></tr>
              {agl != null && (
                <tr>
                  <td>AGL</td>
                  <td style={{ color: isLowAltitude ? '#ff6b6b' : 'inherit', fontWeight: isLowAltitude ? 700 : 400 }}>
                    {formatAltitude(agl)}
                  </td>
                </tr>
              )}
              <tr><td>Speed</td><td>{formatVelocity(flight.velocity)}</td></tr>
              <tr><td>Heading</td><td>{formatHeading(flight.trueTrack)}</td></tr>
              <tr><td>Country</td><td>{flight.originCountry || 'N/A'}</td></tr>
              {flight.onGround && <tr><td colSpan="2"><em>On ground</em></td></tr>}
            </tbody>
          </table>
        </div>
      </Popup>
    </Marker>
  );
}
