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
}));
