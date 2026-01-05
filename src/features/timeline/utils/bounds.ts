/**
 * Timeline Bounds Calculation
 *
 * Calculates the visible timeline range from event dates with smart padding and snapping.
 * Based on Spec.md Section 2.6: Timeline Panel - Timeline Boundary Calculation
 */

import type { TimelineEvent, TimelineBounds } from '@/types';
import {
  parseExtendedDate,
  formatExtendedDate,
  dateToNumericValue,
  numericValueToDate,
  getMinDate,
  getMaxDate,
} from '@/lib/dates';

type SnapUnit = TimelineBounds['snapUnit'];

/**
 * Determine the appropriate snap unit based on the duration of the range.
 */
function getSnapUnit(rangeDuration: number): SnapUnit {
  const absDuration = Math.abs(rangeDuration);

  if (absDuration < 1 / 12) {
    // Less than 1 month
    return 'day';
  }
  if (absDuration < 1) {
    // Less than 1 year
    return 'month';
  }
  if (absDuration < 10) {
    // 1-10 years
    return 'year';
  }
  if (absDuration < 100) {
    // 10-100 years
    return 'decade';
  }
  if (absDuration < 1000) {
    // 100-1000 years
    return 'century';
  }
  // More than 1000 years
  return 'millennium';
}

/**
 * Snap a numeric year value to a clean boundary based on the snap unit.
 * Direction: 'floor' rounds down (for start), 'ceil' rounds up (for end)
 */
function snapToUnit(value: number, unit: SnapUnit, direction: 'floor' | 'ceil'): number {
  const roundFn = direction === 'floor' ? Math.floor : Math.ceil;

  switch (unit) {
    case 'day':
      // Round to nearest day (approximately)
      return direction === 'floor' ? Math.floor(value * 365) / 365 : Math.ceil(value * 365) / 365;

    case 'month':
      // Round to nearest month
      return direction === 'floor' ? Math.floor(value * 12) / 12 : Math.ceil(value * 12) / 12;

    case 'year':
      return roundFn(value);

    case 'decade':
      return roundFn(value / 10) * 10;

    case 'century':
      return roundFn(value / 100) * 100;

    case 'millennium':
      return roundFn(value / 1000) * 1000;

    default:
      return roundFn(value);
  }
}

/**
 * Convert a snapped numeric value back to a date string.
 */
function snapValueToDateString(value: number, unit: SnapUnit, direction: 'start' | 'end'): string {
  const year = Math.floor(value);
  const fraction = value - year;

  switch (unit) {
    case 'day':
    case 'month': {
      const month = Math.floor(fraction * 12) + 1;
      if (unit === 'month') {
        if (direction === 'start') {
          return formatExtendedDate({ year, month: Math.max(1, month), day: 1, precision: 'day' });
        } else {
          // End of month - use last day
          const nextMonth = month + 1;
          if (nextMonth > 12) {
            return formatExtendedDate({ year: year + 1, month: 1, day: 1, precision: 'day' });
          }
          return formatExtendedDate({ year, month: nextMonth, day: 1, precision: 'day' });
        }
      }
      const dayFraction = (fraction * 12 - (month - 1)) * 30;
      const day = Math.max(1, Math.min(28, Math.floor(dayFraction) + 1));
      return formatExtendedDate({ year, month, day, precision: 'day' });
    }

    case 'year':
      if (direction === 'start') {
        return formatExtendedDate({ year: value, month: 1, day: 1, precision: 'day' });
      } else {
        return formatExtendedDate({ year: value, month: 12, day: 31, precision: 'day' });
      }

    case 'decade':
    case 'century':
    case 'millennium':
      if (direction === 'start') {
        return formatExtendedDate({ year: value, month: 1, day: 1, precision: 'day' });
      } else {
        return formatExtendedDate({ year: value - 1, month: 12, day: 31, precision: 'day' });
      }

    default:
      return formatExtendedDate({ year: value, precision: 'year' });
  }
}

/**
 * Calculate timeline bounds from an array of events.
 *
 * Algorithm:
 * 1. Find event bounds: Get earliest startDate and latest endDate
 * 2. Apply 5% padding: Add 5% of the total range to each end
 * 3. Snap to clean boundaries: Round outward to the nearest clean unit
 *
 * @example
 * // Events from March 1939 to August 1947 (~8.4 years)
 * // With 5% padding: ~8.8 years (still in 1-10 year bucket)
 * // Snap to years: January 1, 1939 to December 31, 1947
 */
export function calculateTimelineBounds(events: TimelineEvent[]): TimelineBounds | null {
  if (events.length === 0) {
    return null;
  }

  // Collect all dates (start and end dates)
  const allDates: string[] = [];
  for (const event of events) {
    allDates.push(event.startDate);
    if (event.endDate) {
      allDates.push(event.endDate);
    }
  }

  const dataStart = getMinDate(allDates);
  const dataEnd = getMaxDate(allDates);

  if (!dataStart || !dataEnd) {
    return null;
  }

  // Calculate the range
  const startValue = dateToNumericValue(dataStart);
  const endValue = dateToNumericValue(dataEnd);
  const range = endValue - startValue;

  // Apply 5% padding
  const padding = Math.max(range * 0.05, 0.1); // Minimum padding of 0.1 years (~1 month)
  const paddedStart = startValue - padding;
  const paddedEnd = endValue + padding;
  const paddedRange = paddedEnd - paddedStart;

  // Determine snap unit
  const snapUnit = getSnapUnit(paddedRange);

  // Snap to clean boundaries
  const snappedStart = snapToUnit(paddedStart, snapUnit, 'floor');
  const snappedEnd = snapToUnit(paddedEnd, snapUnit, 'ceil');

  // Convert back to date strings
  const viewStart = snapValueToDateString(snappedStart, snapUnit, 'start');
  const viewEnd = snapValueToDateString(snappedEnd, snapUnit, 'end');

  return {
    dataStart,
    dataEnd,
    viewStart,
    viewEnd,
    snapUnit,
  };
}

/**
 * Generate axis tick values for a given bounds and desired number of ticks.
 */
export function generateAxisTicks(
  bounds: TimelineBounds,
  _minTicks: number = 5,
  maxTicks: number = 15
): { value: number; label: string; dateStr: string }[] {
  const startValue = dateToNumericValue(bounds.viewStart);
  const endValue = dateToNumericValue(bounds.viewEnd);
  const range = endValue - startValue;

  // Determine tick interval based on snap unit and range
  let tickInterval: number;
  let labelPrecision: 'year' | 'month' | 'day';

  switch (bounds.snapUnit) {
    case 'day':
      tickInterval = Math.ceil((range * 365) / maxTicks) / 365;
      labelPrecision = 'day';
      break;
    case 'month':
      tickInterval = Math.ceil((range * 12) / maxTicks) / 12;
      labelPrecision = 'month';
      break;
    case 'year':
      tickInterval = Math.ceil(range / maxTicks);
      labelPrecision = 'year';
      break;
    case 'decade':
      tickInterval = Math.ceil(range / maxTicks / 10) * 10;
      labelPrecision = 'year';
      break;
    case 'century':
      tickInterval = Math.ceil(range / maxTicks / 100) * 100;
      labelPrecision = 'year';
      break;
    case 'millennium':
      tickInterval = Math.ceil(range / maxTicks / 1000) * 1000;
      labelPrecision = 'year';
      break;
    default:
      tickInterval = 1;
      labelPrecision = 'year';
  }

  // Generate ticks
  const ticks: { value: number; label: string; dateStr: string }[] = [];
  const firstTick = Math.ceil(startValue / tickInterval) * tickInterval;

  for (let value = firstTick; value <= endValue; value += tickInterval) {
    const dateStr = numericValueToDate(value, labelPrecision);
    const parsed = parseExtendedDate(dateStr);

    // Format label based on precision
    let label: string;
    if (labelPrecision === 'year') {
      const absYear = Math.abs(parsed.year);
      label = parsed.year < 0 ? `${absYear} BCE` : String(absYear);
    } else if (labelPrecision === 'month') {
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
      label = `${monthNames[(parsed.month || 1) - 1]} ${Math.abs(parsed.year)}`;
    } else {
      label = `${parsed.month}/${parsed.day}`;
    }

    ticks.push({ value, label, dateStr });
  }

  return ticks;
}

/**
 * Calculate the x position (0-1) for a date within the bounds.
 */
export function getDatePosition(date: string, bounds: TimelineBounds): number {
  const value = dateToNumericValue(date);
  const startValue = dateToNumericValue(bounds.viewStart);
  const endValue = dateToNumericValue(bounds.viewEnd);
  const range = endValue - startValue;

  if (range === 0) return 0.5;

  return (value - startValue) / range;
}

/**
 * Calculate the width (0-1) for a date range within the bounds.
 */
export function getDateRangeWidth(
  startDate: string,
  endDate: string,
  bounds: TimelineBounds
): number {
  const startPos = getDatePosition(startDate, bounds);
  const endPos = getDatePosition(endDate, bounds);
  return Math.abs(endPos - startPos);
}
