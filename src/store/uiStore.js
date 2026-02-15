import { create } from 'zustand';

export const useUIStore = create((set) => ({
  activePage: 'overview', // 'overview', 'breach-history'
  selectedDate: null,
  selectedHour: null,
  showConfigPanel: false,
  showBreachDetail: false,
  selectedBreach: null,

  setActivePage: (page) => {
    set({ activePage: page });
  },

  // Keep activeTab as alias for backward compatibility
  setActiveTab: (tab) => {
    set({ activePage: tab });
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date });
  },

  setSelectedHour: (hour) => {
    set({ selectedHour: hour });
  },

  setShowConfigPanel: (show) => {
    set({ showConfigPanel: show });
  },

  setShowBreachDetail: (show) => {
    set({ showBreachDetail: show });
  },

  setSelectedBreach: (breach) => {
    set({ selectedBreach: breach });
  },

  openBreachDetail: (breach) => {
    set({ selectedBreach: breach, showBreachDetail: true });
  },

  closeBreachDetail: () => {
    set({ selectedBreach: null, showBreachDetail: false });
  },
}));
