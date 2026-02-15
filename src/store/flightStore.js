import { create } from 'zustand';

export const useFlightStore = create((set) => ({
  flights: [],
  flightCount: 0,
  lastUpdated: null,
  isLoading: false,
  error: null,

  setFlights: (flights) => {
    set({
      flights,
      flightCount: flights.length,
      lastUpdated: Date.now(),
      error: null,
    });
  },

  addFlights: (newFlights) => {
    set((state) => {
      const flightMap = new Map(state.flights.map((f) => [f.icao24, f]));
      newFlights.forEach((f) => flightMap.set(f.icao24, f));
      const updatedFlights = Array.from(flightMap.values());
      return {
        flights: updatedFlights,
        flightCount: updatedFlights.length,
        lastUpdated: Date.now(),
        error: null,
      };
    });
  },

  updateFlightError: (error) => {
    set({
      error: error ? error.message : null,
      isLoading: false,
    });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  clearFlights: () => {
    set({
      flights: [],
      flightCount: 0,
      lastUpdated: null,
      error: null,
    });
  },
}));
