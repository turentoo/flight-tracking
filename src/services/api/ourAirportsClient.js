import axios from 'axios';
import { OURAIRPORTS_API_URL } from '../../utils/constants';

const client = axios.create({
  baseURL: OURAIRPORTS_API_URL,
  timeout: 10000,
});

/**
 * Parse CSV line (simple implementation)
 */
const parseCSVLine = (line) => {
  const values = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
};

/**
 * Fetch airport elevation by ICAO code
 * @param {string} icao - Airport ICAO code (e.g., 'EGTR')
 * @returns {Promise<number>} Elevation in feet AMSL
 */
export const getAirportElevation = async (icao) => {
  try {
    // OurAirports data is in CSV format - fetch airports.csv
    const response = await client.get('/airports.csv');

    if (!response.data) {
      throw new Error('No data returned from OurAirports');
    }

    const lines = response.data.split('\n');
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      // Column format: id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,...
      const ident = values[1] ? values[1].trim() : '';

      if (ident.toUpperCase() === icao.toUpperCase()) {
        const elevation = parseFloat(values[6]);
        if (!isNaN(elevation)) {
          return elevation;
        }
      }
    }

    console.warn(`Airport elevation not found for ICAO: ${icao}`);
    return null;
  } catch (error) {
    console.error('Error fetching airport elevation:', error);
    throw error;
  }
};

/**
 * Fetch airport by ICAO code (all data)
 */
export const getAirportByICAO = async (icao) => {
  try {
    const response = await client.get('/airports.csv');

    if (!response.data) {
      throw new Error('No data returned from OurAirports');
    }

    const lines = response.data.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      const ident = values[1] ? values[1].trim() : '';

      if (ident.toUpperCase() === icao.toUpperCase()) {
        return {
          id: values[0],
          ident: values[1],
          type: values[2],
          name: values[3],
          latitude: parseFloat(values[4]),
          longitude: parseFloat(values[5]),
          elevation: parseFloat(values[6]),
          continent: values[7],
          isoCountry: values[8],
          isoRegion: values[9],
          municipality: values[10],
        };
      }
    }

    console.warn(`Airport not found for ICAO: ${icao}`);
    return null;
  } catch (error) {
    console.error('Error fetching airport data:', error);
    throw error;
  }
};

/**
 * Check if OurAirports data is accessible
 */
export const checkDataAccessibility = async () => {
  try {
    const response = await client.head('/airports.csv');
    return response.status === 200;
  } catch (error) {
    console.error('Error checking OurAirports accessibility:', error);
    return false;
  }
};
