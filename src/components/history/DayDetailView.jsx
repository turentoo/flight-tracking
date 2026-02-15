import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { parseDate, getHourRange } from '../../utils/timeHelpers';
import { ACTIVE_HOURS_START, ACTIVE_HOURS_END } from '../../utils/constants';
import './DayDetailView.css';

export default function DayDetailView({ date, loadHourCounts, onSelectHour, onBack }) {
  const [hourCounts, setHourCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadHourCounts(date).then((counts) => {
      if (!cancelled) {
        setHourCounts(counts);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [date, loadHourCounts]);

  const dateObj = parseDate(date);
  const formattedDate = format(dateObj, 'EEEE, d MMMM yyyy');
  const totalBreaches = Object.values(hourCounts).reduce((sum, c) => sum + c, 0);

  // Show only the operating hours range.
  const hours = [];
  for (let h = ACTIVE_HOURS_START; h < ACTIVE_HOURS_END; h++) {
    hours.push(h);
  }

  // Find the max count for bar scaling.
  const maxCount = Math.max(1, ...hours.map((h) => hourCounts[h] || 0));

  return (
    <div className="day-detail-view">
      <button className="back-btn" onClick={onBack}>&lsaquo; Back to calendar</button>

      <div className="day-header">
        <h2>{formattedDate}</h2>
        <span className="day-total">{totalBreaches} breach{totalBreaches !== 1 ? 'es' : ''}</span>
      </div>

      {isLoading ? (
        <div className="day-loading">Loading hourly data...</div>
      ) : (
        <div className="hour-bars">
          {hours.map((h) => {
            const count = hourCounts[h] || 0;
            const pct = (count / maxCount) * 100;
            return (
              <button
                key={h}
                className={`hour-bar-row ${count > 0 ? 'has-breaches' : ''}`}
                onClick={() => count > 0 && onSelectHour(date, h)}
                disabled={count === 0}
              >
                <span className="hour-label">{getHourRange(h)}</span>
                <div className="hour-bar-track">
                  <div
                    className="hour-bar-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="hour-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
