import { Rectangle, Tooltip } from 'react-leaflet';

const BOUNDARY_STYLE = {
  color: '#646cff',
  weight: 3,
  opacity: 1,
  fillColor: '#646cff',
  fillOpacity: 0.15,
  dashArray: '6 4',
};

export default function BoundaryOverlay({ boundary }) {
  if (!boundary) return null;

  const bounds = [
    [boundary.latMin, boundary.lonMin],
    [boundary.latMax, boundary.lonMax],
  ];

  return (
    <Rectangle bounds={bounds} pathOptions={BOUNDARY_STYLE}>
      <Tooltip sticky>Monitoring boundary</Tooltip>
    </Rectangle>
  );
}
