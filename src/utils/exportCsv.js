import { getAllBreaches } from '../services/storage/breachRepository';

const CSV_HEADERS = [
  'Date',
  'Time',
  'Hour',
  'Callsign',
  'ICAO24',
  'AGL (ft)',
  'Altitude (ft)',
  'Latitude',
  'Longitude',
  'Speed (m/s)',
  'Heading',
];

const escapeField = (value) => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const breachToRow = (breach) => [
  breach.date,
  new Date(breach.timestamp).toLocaleTimeString('en-GB'),
  breach.hour,
  breach.callsign,
  breach.icao24?.toUpperCase(),
  breach.agl,
  breach.altitude,
  breach.latitude?.toFixed(6),
  breach.longitude?.toFixed(6),
  breach.velocity != null ? breach.velocity.toFixed(1) : '',
  breach.heading != null ? Math.round(breach.heading) : '',
];

/**
 * Export all breaches as a CSV file download.
 */
export const exportBreachesCsv = async () => {
  const breaches = await getAllBreaches();

  if (breaches.length === 0) {
    throw new Error('No breach data to export.');
  }

  // Sort by timestamp ascending.
  breaches.sort((a, b) => a.timestamp - b.timestamp);

  const lines = [
    CSV_HEADERS.map(escapeField).join(','),
    ...breaches.map((b) => breachToRow(b).map(escapeField).join(',')),
  ];

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `flight-breaches-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return breaches.length;
};
