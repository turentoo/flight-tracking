import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useBreachHistory from '../../hooks/useBreachHistory';
import { getMonthlyStats } from '../../services/storage/breachRepository';
import CalendarView from '../history/CalendarView';
import DayDetailView from '../history/DayDetailView';
import HourDetailView from '../history/HourDetailView';
import BreachDetailModal from '../history/BreachDetailModal';
import EmptyState from '../shared/EmptyState';
import './BreachHistoryPage.css';

function StatCards({ stats }) {
  const cards = [
    { label: 'Avg per month', value: stats.avg, className: 'stat-card-blue' },
    { label: 'Max per month', value: stats.max, className: 'stat-card-purple' },
    { label: 'Total breaches', value: stats.total, className: 'stat-card-blue' },
    { label: 'Min per month', value: stats.min, className: 'stat-card-purple' },
  ];

  return (
    <div className="stat-cards">
      {cards.map((c) => (
        <div key={c.label} className={`stat-card ${c.className}`}>
          <span className="stat-card-label">{c.label}</span>
          <span className="stat-card-value">{c.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function MonthlyChart({ months }) {
  const hasData = months.some((m) => m.count > 0);
  const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];

  const chartData = months.map((m, i) => ({
    name: m.label,
    count: m.count,
    fill: colors[i % colors.length],
  }));

  if (!hasData) {
    return (
      <div className="chart-container monthly-chart">
        <EmptyState title="No historical data available" description="Breach statistics will appear after monitoring detects breaches" />
      </div>
    );
  }

  return (
    <div className="chart-container monthly-chart">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <rect key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function BreachHistoryPage() {
  const {
    countByDate,
    isLoading,
    refreshDateCounts,
    loadHourCountsForDate,
    loadBreachesForHour,
  } = useBreachHistory();

  const [monthlyStats, setMonthlyStats] = useState({ months: [], avg: 0, max: 0, total: 0, min: 0 });

  useEffect(() => {
    getMonthlyStats(6).then(setMonthlyStats).catch(console.error);
  }, []);

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
          <div className="card past-breaches-card">
            <h3 className="card-title">6 months overview</h3>
            <StatCards stats={monthlyStats} />
            <MonthlyChart months={monthlyStats.months} />
          </div>
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
