import { describe, it, expect } from 'vitest';
import { getNextDate } from './recurrence';

/** Format a local Date as YYYY-MM-DD without timezone shift */
function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Create a local Date (avoids UTC parsing of date-only strings) */
function localDate(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d); // m is 1-based for readability
}

describe('getNextDate', () => {
  // ── Weekly ──

  it('weekly: advances 7 days', () => {
    const result = getNextDate(localDate(2025, 1, 10), 'weekly', null);
    expect(fmt(result)).toBe('2025-01-17');
  });

  it('weekly: crosses month boundary', () => {
    const result = getNextDate(localDate(2025, 1, 28), 'weekly', null);
    expect(fmt(result)).toBe('2025-02-04');
  });

  it('weekly: crosses year boundary', () => {
    const result = getNextDate(localDate(2025, 12, 29), 'weekly', null);
    expect(fmt(result)).toBe('2026-01-05');
  });

  // ── Monthly ──

  it('monthly: advances 1 month', () => {
    const result = getNextDate(localDate(2025, 1, 15), 'monthly', null);
    expect(fmt(result)).toBe('2025-02-15');
  });

  it('monthly: uses recurrenceDay when specified', () => {
    const result = getNextDate(localDate(2025, 1, 15), 'monthly', 20);
    expect(fmt(result)).toBe('2025-02-20');
  });

  it('monthly: clamps Jan 31 → Feb 28 (short month)', () => {
    const result = getNextDate(localDate(2025, 1, 31), 'monthly', null);
    expect(fmt(result)).toBe('2025-02-28');
  });

  it('monthly: Jan 31 → Mar 31 (long month preserves day via recurrenceDay)', () => {
    // First hop: Jan 31 → Feb 28
    const feb = getNextDate(localDate(2025, 1, 31), 'monthly', 31);
    expect(fmt(feb)).toBe('2025-02-28');

    // Second hop from Feb 28 with recurrenceDay=31: → Mar 31
    const mar = getNextDate(feb, 'monthly', 31);
    expect(fmt(mar)).toBe('2025-03-31');
  });

  it('monthly: Feb 29 leap year → Mar 29', () => {
    const result = getNextDate(localDate(2024, 2, 29), 'monthly', null);
    expect(fmt(result)).toBe('2024-03-29');
  });

  it('monthly: crosses year boundary (Dec → Jan)', () => {
    const result = getNextDate(localDate(2025, 12, 15), 'monthly', null);
    expect(fmt(result)).toBe('2026-01-15');
  });

  // ── Yearly ──

  it('yearly: advances 1 year', () => {
    const result = getNextDate(localDate(2025, 3, 15), 'yearly', null);
    expect(fmt(result)).toBe('2026-03-15');
  });

  it('yearly: Feb 29 leap → Feb 28 non-leap', () => {
    const result = getNextDate(localDate(2024, 2, 29), 'yearly', null);
    expect(fmt(result)).toBe('2025-02-28');
  });

  it('yearly: uses recurrenceDay when specified', () => {
    const result = getNextDate(localDate(2025, 6, 10), 'yearly', 25);
    expect(fmt(result)).toBe('2026-06-25');
  });

  // ── Default pattern ──

  it('null pattern defaults to monthly', () => {
    const result = getNextDate(localDate(2025, 5, 10), null, null);
    expect(fmt(result)).toBe('2025-06-10');
  });

  it('undefined pattern defaults to monthly', () => {
    const result = getNextDate(localDate(2025, 5, 10), undefined, null);
    expect(fmt(result)).toBe('2025-06-10');
  });

  // ── Series generation (12 monthly installments) ──

  it('generates 12 monthly dates correctly', () => {
    const dates: string[] = [];
    let current = localDate(2025, 1, 15);
    for (let i = 0; i < 12; i++) {
      current = getNextDate(current, 'monthly', 15);
      dates.push(fmt(current));
    }

    expect(dates).toEqual([
      '2025-02-15',
      '2025-03-15',
      '2025-04-15',
      '2025-05-15',
      '2025-06-15',
      '2025-07-15',
      '2025-08-15',
      '2025-09-15',
      '2025-10-15',
      '2025-11-15',
      '2025-12-15',
      '2026-01-15',
    ]);
  });

  it('generates 12 monthly dates with day 31 (clamping)', () => {
    const dates: string[] = [];
    let current = localDate(2025, 1, 31);
    for (let i = 0; i < 12; i++) {
      current = getNextDate(current, 'monthly', 31);
      dates.push(fmt(current));
    }

    expect(dates).toEqual([
      '2025-02-28', // Feb has 28 days in 2025
      '2025-03-31',
      '2025-04-30',
      '2025-05-31',
      '2025-06-30',
      '2025-07-31',
      '2025-08-31',
      '2025-09-30',
      '2025-10-31',
      '2025-11-30',
      '2025-12-31',
      '2026-01-31',
    ]);
  });
});
