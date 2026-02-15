import { format, parse, startOfDay, endOfDay } from 'date-fns';
import { ACTIVE_HOURS_START, ACTIVE_HOURS_END, DATE_FORMAT } from './constants';

/**
 * Check if current time is within operating hours
 */
export const isWithinOperatingHours = (start = ACTIVE_HOURS_START, end = ACTIVE_HOURS_END) => {
  const now = new Date();
  const currentHour = now.getHours();
  return currentHour >= start && currentHour < end;
};

/**
 * Get current hour (0-23)
 */
export const getCurrentHour = () => {
  return new Date().getHours();
};

/**
 * Get current date as YYYY-MM-DD string
 */
export const getCurrentDate = () => {
  return format(new Date(), DATE_FORMAT);
};

/**
 * Parse date string (YYYY-MM-DD) to Date object
 */
export const parseDate = (dateString) => {
  return parse(dateString, DATE_FORMAT, new Date());
};

/**
 * Format date object to YYYY-MM-DD string
 */
export const formatDate = (date) => {
  return format(date, DATE_FORMAT);
};

/**
 * Get start of day (00:00:00)
 */
export const getStartOfDay = (date) => {
  return startOfDay(date);
};

/**
 * Get end of day (23:59:59)
 */
export const getEndOfDay = (date) => {
  return endOfDay(date);
};

/**
 * Get hour range as string (e.g., "14:00 - 14:59")
 */
export const getHourRange = (hour) => {
  const startTime = `${String(hour).padStart(2, '0')}:00`;
  const endTime = `${String(hour).padStart(2, '0')}:59`;
  return `${startTime} - ${endTime}`;
};

/**
 * Format timestamp to readable time string (HH:MM:SS)
 */
export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return format(date, 'HH:mm:ss');
};

/**
 * Format timestamp to readable datetime string
 */
export const formatDateTime = (timestamp) => {
  const date = new Date(timestamp);
  return format(date, 'yyyy-MM-dd HH:mm:ss');
};

/**
 * Check if a timestamp falls within a specific hour on a specific date
 */
export const isInHour = (timestamp, date, hour) => {
  const breachDate = formatDate(new Date(timestamp));
  const breachHour = new Date(timestamp).getHours();
  return breachDate === date && breachHour === hour;
};

/**
 * Get last N days as array of date strings
 */
export const getLastNDays = (n) => {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(formatDate(date));
  }
  return dates;
};
