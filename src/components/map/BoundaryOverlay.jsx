import { Circle, Tooltip } from 'react-leaflet';

const BOUNDARY_STYLE = {
  color: '#E11D48',
  weight: 3,
  opacity: 1,
  fillColor: '#E11D48',
  fillOpacity: 0.15,
  dashArray: '6 4',
};

export default function BoundaryOverlay({ boundary }) {
  if (!boundary) return null;

  return (
    <Circle
      center={[boundary.centerLat, boundary.centerLon]}
      radius={boundary.radiusKm * 1000}
      pathOptions={BOUNDARY_STYLE}
    >
      <Tooltip sticky>Monitoring boundary</Tooltip>
    </Circle>
  );
}
