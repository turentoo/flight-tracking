import axios from 'axios';
import { OPENSKY_API_URL, OPENSKY_USERNAME, OPENSKY_PASSWORD } from '../../utils/constants';

const hasCredentials = OPENSKY_USERNAME && OPENSKY_PASSWORD;

const client = axios.create({
  baseURL: OPENSKY_API_URL,
  timeout: 10000,
  ...(hasCredentials && {
    auth: {
      username: OPENSKY_USERNAME,
      password: OPENSKY_PASSWORD,
    },
  }),
});

/**
 * Whether the client is using authenticated requests.
 * Authenticated users get higher rate limits (~4000 req/day, 5s minimum interval).
 */
export const isAuthenticated = hasCredentials;

/**
 * Fetch flights within boundary from OpenSky Network
 * @param {Object} boundary - Boundary object with latMin, latMax, lonMin, lonMax
 * @returns {Promise<Array>} Array of flight objects
 */
export const fetchFlightsInBoundary = async (boundary) => {
  try {
    const { latMin, latMax, lonMin, lonMax } = boundary;
    const params = {
      lamin: latMin,
      lamax: latMax,
      lomin: lonMin,
      lomax: lonMax,
    };

    const response = await client.get('/states/all', { params });

    // OpenSky returns array of arrays, convert to objects
    if (!response.data || !response.data.states) {
      return [];
    }

    return response.data.states.map((state) => ({
      icao24: state[0],
      callsign: state[1] ? state[1].trim() : null,
      originCountry: state[2],
      timePosition: state[3],
      lastContact: state[4],
      longitude: state[5],
      latitude: state[6],
      barometricAltitude: state[7],
      onGround: state[8],
      velocity: state[9],
      trueTrack: state[10],
      verticalRate: state[11],
      sensors: state[12],
      geometricAltitude: state[13],
      squawk: state[14],
      spi: state[15],
      positionSource: state[16],
      categoryCode: state[17],
    }));
  } catch (error) {
    console.error('Error fetching flights from OpenSky:', error);
    throw error;
  }
};

/**
 * Get flight information by ICAO24
 */
export const getFlightInfo = async (icao24) => {
  try {
    const params = {
      icao24,
      begin: Math.floor(Date.now() / 1000) - 3600, // Last hour
    };
    const response = await client.get('/flights/aircraft', { params });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching flight info:', error);
    throw error;
  }
};

/**
 * Check API connectivity
 */
export const checkAPIConnectivity = async () => {
  try {
    const response = await client.get('/states/all');
    return response.status === 200;
  } catch (error) {
    console.error('Error checking API connectivity:', error);
    return false;
  }
};
