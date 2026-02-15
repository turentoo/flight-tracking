import { create } from 'zustand';

export const useBreachStore = create((set, get) => ({
  breaches: [],
  breachCount: 0,
  currentHourBreaches: [],
  isLoading: false,
  error: null,

  setBreaches: (breaches) => {
    set({
      breaches,
      breachCount: breaches.length,
      error: null,
    });
  },

  addBreach: (breach) => {
    set((state) => {
      const updated = [...state.breaches, breach];
      return {
        breaches: updated,
        breachCount: updated.length,
        error: null,
      };
    });
  },

  setCurrentHourBreaches: (breaches) => {
    set({
      currentHourBreaches: breaches,
    });
  },

  clearCurrentHourBreaches: () => {
    set({
      currentHourBreaches: [],
    });
  },

  getBreachesForDate: (date) => {
    const state = get();
    return state.breaches.filter((b) => b.date === date);
  },

  getBreachesForHour: (date, hour) => {
    const state = get();
    return state.breaches.filter((b) => b.date === date && b.hour === hour);
  },

  updateBreachError: (error) => {
    set({
      error: error ? error.message : null,
      isLoading: false,
    });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  removeBreach: (id) => {
    set((state) => {
      const breaches = state.breaches.filter((b) => b.id !== id);
      return {
        breaches,
        breachCount: breaches.length,
        currentHourBreaches: state.currentHourBreaches.filter((b) => b.id !== id),
      };
    });
  },

  updateBreachAirport: (id, airportCode) => {
    set((state) => ({
      breaches: state.breaches.map((b) =>
        b.id === id ? { ...b, departure_airport: airportCode } : b
      ),
      currentHourBreaches: state.currentHourBreaches.map((b) =>
        b.id === id ? { ...b, departure_airport: airportCode } : b
      ),
    }));
  },

  updateBreachReported: (id, reported) => {
    set((state) => ({
      breaches: state.breaches.map((b) =>
        b.id === id ? { ...b, reported } : b
      ),
      currentHourBreaches: state.currentHourBreaches.map((b) =>
        b.id === id ? { ...b, reported } : b
      ),
    }));
  },
}));
