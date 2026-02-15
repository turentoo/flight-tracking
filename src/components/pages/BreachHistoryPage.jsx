import { useState, useCallback } from 'react';
import useBreachHistory from '../../hooks/useBreachHistory';
import CalendarView from '../history/CalendarView';
import DayDetailView from '../history/DayDetailView';
import HourDetailView from '../history/HourDetailView';
import BreachDetailModal from '../history/BreachDetailModal';
import EmptyState from '../shared/EmptyState';
import './BreachHistoryPage.css';

export default function BreachHistoryPage() {
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
    <div className="breach-history-page">
      {view === 'calendar' && (
        <>
          <h2 className="page-title">Breach History</h2>
          {isLoading ? (
            <p className="loading-text">Loading history...</p>
          ) : Object.keys(countByDate).length === 0 ? (
            <div className="card">
              <EmptyState
                title="No breach records yet"
                description="Breaches will appear here once they are detected during operating hours."
              />
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
