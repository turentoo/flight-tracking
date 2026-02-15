import { useState, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  format,
} from 'date-fns';
import { formatDate } from '../../utils/timeHelpers';
import './CalendarView.css';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarView({ countByDate, onSelectDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    // Start on Monday (weekStartsOn: 1)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let day = calStart;
    while (day <= calEnd) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(day));
        day = addDays(day, 1);
      }
      rows.push(week);
    }
    return rows;
  }, [currentMonth]);

  const totalForMonth = useMemo(() => {
    let total = 0;
    const monthStr = format(currentMonth, 'yyyy-MM');
    for (const [date, count] of Object.entries(countByDate)) {
      if (date.startsWith(monthStr)) {
        total += count;
      }
    }
    return total;
  }, [currentMonth, countByDate]);

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button className="cal-nav-btn" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
          &lsaquo;
        </button>
        <div className="cal-title">
          <h3>{format(currentMonth, 'MMMM yyyy')}</h3>
          <span className="cal-month-total">
            {totalForMonth} breach{totalForMonth !== 1 ? 'es' : ''}
          </span>
        </div>
        <button className="cal-nav-btn" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
          &rsaquo;
        </button>
      </div>

      <div className="calendar-grid">
        <div className="cal-weekdays">
          {WEEKDAYS.map((d) => (
            <div key={d} className="cal-weekday">{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="cal-week">
            {week.map((day) => {
              const dateStr = formatDate(day);
              const count = countByDate[dateStr] || 0;
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);

              return (
                <button
                  key={dateStr}
                  className={[
                    'cal-day',
                    !inMonth && 'other-month',
                    today && 'today',
                    count > 0 && 'has-breaches',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => count > 0 && onSelectDate(dateStr)}
                  disabled={count === 0}
                >
                  <span className="day-number">{format(day, 'd')}</span>
                  {count > 0 && (
                    <span className="day-badge">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
