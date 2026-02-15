import { useState, useEffect, useCallback } from 'react';
import { formatCallsign, formatAltitude } from '../../utils/formatters';
import { formatTime } from '../../utils/timeHelpers';
import './BreachAlertBanner.css';

const DISPLAY_DURATION = 8000; // ms to show the banner

export default function BreachAlertBanner({ onBreachRef }) {
  const [breach, setBreach] = useState(null);
  const [visible, setVisible] = useState(false);

  const show = useCallback((b) => {
    setBreach(b);
    setVisible(true);
  }, []);

  // Register ourselves as the callback so useBreachDetection can push new breaches.
  useEffect(() => {
    if (onBreachRef) onBreachRef.current = show;
    return () => {
      if (onBreachRef) onBreachRef.current = null;
    };
  }, [onBreachRef, show]);

  // Auto-dismiss after DISPLAY_DURATION.
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => setVisible(false), DISPLAY_DURATION);
    return () => clearTimeout(id);
  }, [visible, breach]);

  if (!visible || !breach) return null;

  return (
    <div className="breach-alert-banner" role="alert">
      <div className="banner-icon">!</div>
      <div className="banner-body">
        <strong>Low-altitude breach detected</strong>
        <span className="banner-detail">
          {formatCallsign(breach.callsign)} at {formatAltitude(breach.agl)} AGL
          &mdash; {formatTime(breach.timestamp)}
        </span>
      </div>
      <button className="banner-dismiss" onClick={() => setVisible(false)}>
        ✕
      </button>
    </div>
  );
}
