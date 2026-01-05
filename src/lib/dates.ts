/**
 * Date Utilities for Extended ISO 8601 (BCE/CE support)
 *
 * The timeline supports dates from deep history (BCE) to the far future.
 * We use an extended ISO 8601 format:
 *
 * CE dates (positive years): "2024-03-15", "1066-10-14"
 * BCE dates (negative years): "-0753-04-21", "-0044-03-15"
 * Year-only: "2024", "-0500"
 *
 * Dates are stored as strings to preserve precision and avoid JS Date limitations.
 */

import type { DatePrecision } from '@/types';

/**
 * Parsed date representation that supports BCE dates.
 * Uses astronomical year numbering (year 0 = 1 BCE).
 */
export interface ParsedDate {
  year: number; // Astronomical year (negative for BCE)
  month?: number; // 1-12
  day?: number; // 1-31
  hour?: number;
  minute?: number;
  second?: number;
  precision: DatePrecision;
}

/**
 * Parse an extended ISO 8601 date string into components.
 * Supports BCE dates with negative year prefix.
 *
 * @example
 * parseExtendedDate("2024-03-15") // { year: 2024, month: 3, day: 15, precision: 'day' }
 * parseExtendedDate("-0753-04-21") // { year: -753, month: 4, day: 21, precision: 'day' }
 * parseExtendedDate("2024") // { year: 2024, precision: 'year' }
 */
export function parseExtendedDate(dateStr: string): ParsedDate {
  const isNegative = dateStr.startsWith('-');
  const normalized = isNegative ? dateStr.slice(1) : dateStr;

  // Check for datetime format
  if (normalized.includes('T')) {
    const [datePart, timePart] = normalized.split('T');
    const dateComponents = datePart.split('-').map(Number);
    const timeComponents = timePart.replace('Z', '').split(':').map(Number);

    return {
      year: (isNegative ? -1 : 1) * dateComponents[0],
      month: dateComponents[1],
      day: dateComponents[2],
      hour: timeComponents[0],
      minute: timeComponents[1],
      second: timeComponents[2] || 0,
      precision: 'datetime',
    };
  }

  const parts = normalized.split('-').map(Number);

  if (parts.length === 1) {
    return {
      year: (isNegative ? -1 : 1) * parts[0],
      precision: 'year',
    };
  }

  if (parts.length === 2) {
    return {
      year: (isNegative ? -1 : 1) * parts[0],
      month: parts[1],
      precision: 'month',
    };
  }

  return {
    year: (isNegative ? -1 : 1) * parts[0],
    month: parts[1],
    day: parts[2],
    precision: 'day',
  };
}

/**
 * Format a parsed date back to extended ISO 8601 string.
 */
export function formatExtendedDate(date: ParsedDate): string {
  const yearStr =
    date.year < 0
      ? `-${String(Math.abs(date.year)).padStart(4, '0')}`
      : String(date.year).padStart(4, '0');

  if (date.precision === 'year') {
    return yearStr;
  }

  const monthStr = String(date.month || 1).padStart(2, '0');

  if (date.precision === 'month') {
    return `${yearStr}-${monthStr}`;
  }

  const dayStr = String(date.day || 1).padStart(2, '0');

  if (date.precision === 'day') {
    return `${yearStr}-${monthStr}-${dayStr}`;
  }

  // datetime
  const hourStr = String(date.hour || 0).padStart(2, '0');
  const minStr = String(date.minute || 0).padStart(2, '0');
  const secStr = String(date.second || 0).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}T${hourStr}:${minStr}:${secStr}Z`;
}

/**
 * Format a date for display to users.
 * Converts negative years to BCE notation.
 *
 * @example
 * formatDateForDisplay("-0044-03-15", "day") // "March 15, 44 BCE"
 * formatDateForDisplay("2024-03-15", "day") // "March 15, 2024"
 * formatDateForDisplay("-0500", "year") // "500 BCE"
 */
export function formatDateForDisplay(dateStr: string, precision?: DatePrecision): string {
  const parsed = parseExtendedDate(dateStr);
  const effectivePrecision = precision || parsed.precision;
  const era = parsed.year < 0 ? ' BCE' : parsed.year < 1000 ? ' CE' : '';
  const absYear = Math.abs(parsed.year);

  switch (effectivePrecision) {
    case 'year':
      return `${absYear}${era}`;

    case 'month': {
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      return `${monthNames[(parsed.month || 1) - 1]} ${absYear}${era}`;
    }

    case 'day': {
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      return `${monthNames[(parsed.month || 1) - 1]} ${parsed.day || 1}, ${absYear}${era}`;
    }

    case 'datetime': {
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const hour = parsed.hour || 0;
      const minute = parsed.minute || 0;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${monthNames[(parsed.month || 1) - 1]} ${parsed.day}, ${absYear}${era} ${hour12}:${String(minute).padStart(2, '0')} ${ampm}`;
    }

    default:
      return dateStr;
  }
}

/**
 * Convert an extended date to a numeric value for positioning on the timeline.
 * Returns a decimal year value (e.g., 2024.5 for July 2024).
 *
 * This allows BCE and CE dates to be placed on a continuous number line.
 */
export function dateToNumericValue(dateStr: string): number {
  const parsed = parseExtendedDate(dateStr);

  // Start with the year
  let value = parsed.year;

  // Add fractional year for month/day/time
  if (parsed.month) {
    // Approximate: each month is ~1/12 of a year
    value += (parsed.month - 1) / 12;

    if (parsed.day) {
      // Approximate: each day is ~1/365 of a year
      value += (parsed.day - 1) / 365;

      if (parsed.hour !== undefined) {
        // Add hours as fraction of a day
        value += (parsed.hour + (parsed.minute || 0) / 60) / (365 * 24);
      }
    }
  }

  return value;
}

/**
 * Convert a numeric value back to an approximate date string.
 * Used for generating axis labels.
 */
export function numericValueToDate(value: number, precision: DatePrecision = 'year'): string {
  const year = Math.floor(value);
  const remainder = value - year;

  if (precision === 'year') {
    return formatExtendedDate({ year, precision: 'year' });
  }

  const month = Math.floor(remainder * 12) + 1;

  if (precision === 'month') {
    return formatExtendedDate({ year, month, precision: 'month' });
  }

  const dayFraction = (remainder * 12 - (month - 1)) * 30;
  const day = Math.max(1, Math.min(28, Math.floor(dayFraction) + 1));

  return formatExtendedDate({ year, month, day, precision: 'day' });
}

/**
 * Calculate the difference between two dates in years.
 * Supports BCE dates.
 */
export function getYearsDifference(startDate: string, endDate: string): number {
  return dateToNumericValue(endDate) - dateToNumericValue(startDate);
}

/**
 * Compare two extended date strings.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
export function compareDates(a: string, b: string): number {
  return dateToNumericValue(a) - dateToNumericValue(b);
}

/**
 * Check if a date falls within a range.
 */
export function isDateInRange(date: string, start: string, end: string): boolean {
  const dateVal = dateToNumericValue(date);
  const startVal = dateToNumericValue(start);
  const endVal = dateToNumericValue(end);
  return dateVal >= startVal && dateVal <= endVal;
}

/**
 * Get the minimum date from an array of date strings.
 */
export function getMinDate(dates: string[]): string | undefined {
  if (dates.length === 0) return undefined;
  return dates.reduce((min, date) => (compareDates(date, min) < 0 ? date : min));
}

/**
 * Get the maximum date from an array of date strings.
 */
export function getMaxDate(dates: string[]): string | undefined {
  if (dates.length === 0) return undefined;
  return dates.reduce((max, date) => (compareDates(date, max) > 0 ? date : max));
}

/**
 * Convert an extended date to a JavaScript Date object.
 * Note: This only works for CE dates (year > 0) and loses precision for BCE dates.
 * Use only when you need to interact with JS Date APIs.
 */
export function toJSDate(dateStr: string): Date | null {
  const parsed = parseExtendedDate(dateStr);

  // JS Date can't handle BCE dates well
  if (parsed.year <= 0) {
    return null;
  }

  return new Date(
    parsed.year,
    (parsed.month || 1) - 1,
    parsed.day || 1,
    parsed.hour || 0,
    parsed.minute || 0,
    parsed.second || 0
  );
}

/**
 * Convert a JavaScript Date to an extended date string.
 */
export function fromJSDate(date: Date, precision: DatePrecision = 'day'): string {
  return formatExtendedDate({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    precision,
  });
}

/**
 * Get today's date as an extended date string.
 */
export function today(precision: DatePrecision = 'day'): string {
  return fromJSDate(new Date(), precision);
}
