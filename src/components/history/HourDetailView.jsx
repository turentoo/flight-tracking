import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { parseDate, getHourRange } from '../../utils/timeHelpers';
import BreachCard from '../current/BreachCard';
import './HourDetailView.css';

export default function HourDetailView({ date, hour, loadBreaches, onSelectBreach, onBack }) {
  const [breaches, setBreaches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadBreaches(date, hour).then((data) => {
      if (!cancelled) {
        setBreaches(data.sort((a, b) => b.timestamp - a.timestamp));
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [date, hour, loadBreaches]);

  const dateObj = parseDate(date);
  const formattedDate = format(dateObj, 'EEEE, d MMMM yyyy');
  const hourRange = getHourRange(hour);

  return (
    <div className="hour-detail-view">
      <button className="back-btn" onClick={onBack}>&lsaquo; Back to day</button>

      <div className="hour-detail-header">
        <div>
          <h2>{hourRange}</h2>
          <span className="hour-detail-date">{formattedDate}</span>
        </div>
        <span className="hour-detail-total">
          {breaches.length} breach{breaches.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {isLoading ? (
        <div className="hour-loading">Loading breaches...</div>
      ) : breaches.length === 0 ? (
        <div className="hour-empty">No breaches recorded for this hour.</div>
      ) : (
        <div className="hour-breach-list">
          {breaches.map((breach) => (
            <BreachCard
              key={breach.id}
              breach={breach}
              onClick={onSelectBreach}
            />
          ))}
        </div>
      )}
    </div>
  );
}
