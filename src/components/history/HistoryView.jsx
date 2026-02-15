import { useState, useCallback } from 'react';
import useBreachHistory from '../../hooks/useBreachHistory';
import CalendarView from './CalendarView';
import DayDetailView from './DayDetailView';
import HourDetailView from './HourDetailView';
import BreachDetailModal from './BreachDetailModal';
import './HistoryView.css';

/**
 * Drill-down levels:
 *  'calendar'  → CalendarView  (month grid with breach counts)
 *  'day'       → DayDetailView (hourly bar chart for a date)
 *  'hour'      → HourDetailView (breach cards for a specific hour)
 */
export default function HistoryView() {
  const {
    countByDate,
    isLoading,
    refreshDateCounts,
    loadHourCountsForDate,
    loadBreachesForHour,
  } = useBreachHistory();

  const [view, setView] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [selectedBreach, setSelectedBreach] = useState(null);

  const handleSelectDate = useCallback((date) => {
    setSelectedDate(date);
    setView('day');
  }, []);

  const handleSelectHour = useCallback((date, hour) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setView('hour');
  }, []);

  const handleBackToCalendar = useCallback(() => {
    setView('calendar');
    setSelectedDate(null);
    setSelectedHour(null);
    refreshDateCounts();
  }, [refreshDateCounts]);

  const handleBackToDay = useCallback(() => {
    setView('day');
    setSelectedHour(null);
  }, []);

  const handleSelectBreach = useCallback((breach) => {
    setSelectedBreach(breach);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedBreach(null);
  }, []);

  return (
    <div className="history-view">
      {view === 'calendar' && (
        <>
          <h2 className="history-title">Breach History</h2>
          {isLoading ? (
            <p className="history-loading">Loading history...</p>
          ) : Object.keys(countByDate).length === 0 ? (
            <div className="history-empty">
              <p>No breach records yet.</p>
              <span>Breaches will appear here once they are detected during operating hours.</span>
            </div>
          ) : (
            <CalendarView countByDate={countByDate} onSelectDate={handleSelectDate} />
          )}
        </>
      )}

      {view === 'day' && selectedDate && (
        <DayDetailView
          date={selectedDate}
          loadHourCounts={loadHourCountsForDate}
          onSelectHour={handleSelectHour}
          onBack={handleBackToCalendar}
        />
      )}

      {view === 'hour' && selectedDate && selectedHour !== null && (
        <HourDetailView
          date={selectedDate}
          hour={selectedHour}
          loadBreaches={loadBreachesForHour}
          onSelectBreach={handleSelectBreach}
          onBack={handleBackToDay}
        />
      )}

      {selectedBreach && (
        <BreachDetailModal breach={selectedBreach} onClose={handleCloseModal} />
      )}
    </div>
  );
}
