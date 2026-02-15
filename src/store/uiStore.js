import { create } from 'zustand';

export const useUIStore = create((set) => ({
  activeTab: 'map', // 'map', 'current', 'history'
  selectedDate: null,
  selectedHour: null,
  showConfigPanel: false,
  showBreachDetail: false,
  selectedBreach: null,

  setActiveTab: (tab) => {
    set({ activeTab: tab });
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
