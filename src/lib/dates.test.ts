import { describe, it, expect } from 'vitest';
import {
  parseExtendedDate,
  formatExtendedDate,
  formatDateForDisplay,
  dateToNumericValue,
  compareDates,
  getMinDate,
  getMaxDate,
  isDateInRange,
} from './dates';

describe('parseExtendedDate', () => {
  it('parses CE dates correctly', () => {
    expect(parseExtendedDate('2024-03-15')).toEqual({
      year: 2024,
      month: 3,
      day: 15,
      precision: 'day',
    });
  });

  it('parses BCE dates correctly', () => {
    expect(parseExtendedDate('-0753-04-21')).toEqual({
      year: -753,
      month: 4,
      day: 21,
      precision: 'day',
    });
  });

  it('parses year-only dates', () => {
    expect(parseExtendedDate('2024')).toEqual({
      year: 2024,
      precision: 'year',
    });

    expect(parseExtendedDate('-0500')).toEqual({
      year: -500,
      precision: 'year',
    });
  });

  it('parses datetime format', () => {
    expect(parseExtendedDate('2024-03-15T14:30:00Z')).toEqual({
      year: 2024,
      month: 3,
      day: 15,
      hour: 14,
      minute: 30,
      second: 0,
      precision: 'datetime',
    });
  });
});

describe('formatExtendedDate', () => {
  it('formats CE dates correctly', () => {
    expect(formatExtendedDate({ year: 2024, month: 3, day: 15, precision: 'day' })).toBe(
      '2024-03-15'
    );
  });

  it('formats BCE dates correctly', () => {
    expect(formatExtendedDate({ year: -753, month: 4, day: 21, precision: 'day' })).toBe(
      '-0753-04-21'
    );
  });

  it('formats year-only dates', () => {
    expect(formatExtendedDate({ year: 2024, precision: 'year' })).toBe('2024');
    expect(formatExtendedDate({ year: -500, precision: 'year' })).toBe('-0500');
  });
});

describe('formatDateForDisplay', () => {
  it('displays CE dates without era for modern dates', () => {
    expect(formatDateForDisplay('2024-03-15', 'day')).toBe('March 15, 2024');
  });

  it('displays BCE dates with era', () => {
    expect(formatDateForDisplay('-0044-03-15', 'day')).toBe('March 15, 44 BCE');
  });

  it('displays ancient CE dates with era', () => {
    expect(formatDateForDisplay('0476-09-04', 'day')).toBe('September 4, 476 CE');
  });

  it('displays year-only dates', () => {
    expect(formatDateForDisplay('-0500', 'year')).toBe('500 BCE');
    expect(formatDateForDisplay('2024', 'year')).toBe('2024');
  });
});

describe('dateToNumericValue', () => {
  it('converts dates to numeric values', () => {
    expect(dateToNumericValue('2024')).toBe(2024);
    expect(dateToNumericValue('-0500')).toBe(-500);
  });

  it('orders dates correctly', () => {
    const val1 = dateToNumericValue('-0753-04-21');
    const val2 = dateToNumericValue('0476-09-04');
    const val3 = dateToNumericValue('2024-03-15');

    expect(val1).toBeLessThan(val2);
    expect(val2).toBeLessThan(val3);
  });

  it('handles month precision', () => {
    const jan = dateToNumericValue('2024-01-01');
    const jul = dateToNumericValue('2024-07-01');
    const dec = dateToNumericValue('2024-12-01');

    expect(jan).toBeLessThan(jul);
    expect(jul).toBeLessThan(dec);
    expect(dec - jan).toBeCloseTo(11 / 12, 1);
  });
});

describe('compareDates', () => {
  it('compares dates correctly', () => {
    expect(compareDates('2024-03-15', '2024-03-16')).toBeLessThan(0);
    expect(compareDates('2024-03-16', '2024-03-15')).toBeGreaterThan(0);
    expect(compareDates('2024-03-15', '2024-03-15')).toBe(0);
  });

  it('compares BCE and CE dates', () => {
    expect(compareDates('-0044-03-15', '2024-03-15')).toBeLessThan(0);
  });
});

describe('getMinDate / getMaxDate', () => {
  const dates = ['2024-03-15', '-0753-04-21', '1066-10-14', '-0044-03-15'];

  it('finds minimum date', () => {
    expect(getMinDate(dates)).toBe('-0753-04-21');
  });

  it('finds maximum date', () => {
    expect(getMaxDate(dates)).toBe('2024-03-15');
  });

  it('handles empty array', () => {
    expect(getMinDate([])).toBeUndefined();
    expect(getMaxDate([])).toBeUndefined();
  });
});

describe('isDateInRange', () => {
  it('checks if date is in range', () => {
    expect(isDateInRange('2024-06-15', '2024-01-01', '2024-12-31')).toBe(true);
    expect(isDateInRange('2023-06-15', '2024-01-01', '2024-12-31')).toBe(false);
  });

  it('handles BCE dates', () => {
    expect(isDateInRange('-0100', '-0500', '0500')).toBe(true);
    expect(isDateInRange('-0600', '-0500', '0500')).toBe(false);
  });
});
