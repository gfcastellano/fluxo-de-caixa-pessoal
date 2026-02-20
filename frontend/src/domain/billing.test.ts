import { describe, it, expect } from 'vitest';
import { calculateBillDate } from './billing';

describe('calculateBillDate', () => {
  // ── Closing day boundary ──

  it('transaction before closing day → same month bill', () => {
    // Closing day 5, transaction on day 4 → January bill
    const result = calculateBillDate('2025-01-04', 5, 10);
    expect(result.month).toBe(0); // January (0-based)
    expect(result.year).toBe(2025);
  });

  it('transaction on closing day → next month bill', () => {
    // Closing day 5, transaction on day 5 → February bill
    const result = calculateBillDate('2025-01-05', 5, 10);
    expect(result.month).toBe(1); // February
    expect(result.year).toBe(2025);
  });

  it('transaction after closing day → next month bill', () => {
    // Closing day 5, transaction on day 15 → February bill
    const result = calculateBillDate('2025-01-15', 5, 10);
    expect(result.month).toBe(1); // February
    expect(result.year).toBe(2025);
  });

  // ── Year boundary ──

  it('December transaction after closing → January next year', () => {
    const result = calculateBillDate('2025-12-20', 10, 15);
    expect(result.month).toBe(0); // January
    expect(result.year).toBe(2026);
  });

  it('December transaction before closing → December same year', () => {
    const result = calculateBillDate('2025-12-05', 10, 15);
    expect(result.month).toBe(11); // December
    expect(result.year).toBe(2025);
  });

  // ── Due date calculation ──

  it('due date is in the target month', () => {
    const result = calculateBillDate('2025-03-20', 10, 15);
    // Day 20 >= closing 10 → April bill
    expect(result.month).toBe(3); // April
    expect(result.dueDate).toBe('2025-04-15');
  });

  it('due date for same-month bill', () => {
    const result = calculateBillDate('2025-03-05', 10, 15);
    // Day 5 < closing 10 → March bill
    expect(result.dueDate).toBe('2025-03-15');
  });

  it('due date respects year rollover', () => {
    const result = calculateBillDate('2025-12-15', 10, 5);
    // Day 15 >= closing 10 → January 2026
    expect(result.dueDate).toBe('2026-01-05');
  });

  // ── Edge cases ──

  it('closing day 1: day 1 goes to next month', () => {
    // Day 1 >= closingDay 1 → next month
    const result = calculateBillDate('2025-06-01', 1, 10);
    expect(result.month).toBe(6); // July
    expect(result.year).toBe(2025);
  });

  it('closing day 31: only day 31 triggers next month', () => {
    // Day 30 < closingDay 31 → same month
    const same = calculateBillDate('2025-01-30', 31, 10);
    expect(same.month).toBe(0); // January

    // Day 31 >= closingDay 31 → next month
    const next = calculateBillDate('2025-01-31', 31, 10);
    expect(next.month).toBe(1); // February
  });

  it('due day 31 in month with 30 days → clamps to 30', () => {
    // April has 30 days. dueDay=31 → clamped to April 30
    const result = calculateBillDate('2025-03-20', 10, 31);
    // Target month: April (3)
    expect(result.month).toBe(3);
    expect(result.dueDate).toBe('2025-04-30');
  });
});
