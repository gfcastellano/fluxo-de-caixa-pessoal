import { describe, it, expect } from 'vitest';
import { generateInstallments } from './creditCardSchedule';

// Helper: closingDay=10, dueDay=15 throughout most tests
const CLOSING = 10;
const DUE = 15;

describe('generateInstallments', () => {
  // ── Closing day boundary ─────────────────────────────────────────────────

  it('purchase 1 day before closing → bill in same month', () => {
    // Jan 9, closingDay=10 → day 9 < 10 → bill month = January (0)
    const result = generateInstallments({
      purchaseDate: '2025-01-09',
      amount: 100,
      installments: 1,
      closingDay: CLOSING,
      dueDay: DUE,
    });
    expect(result).toHaveLength(1);
    expect(result[0].statementMonth).toBe(0); // January (0-based)
    expect(result[0].statementYear).toBe(2025);
    expect(result[0].dueDate).toBe('2025-01-15');
  });

  it('purchase on closing day → bill in next month', () => {
    // Jan 10, closingDay=10 → day 10 >= 10 → bill month = February (1)
    const result = generateInstallments({
      purchaseDate: '2025-01-10',
      amount: 100,
      installments: 1,
      closingDay: CLOSING,
      dueDay: DUE,
    });
    expect(result[0].statementMonth).toBe(1); // February
    expect(result[0].dueDate).toBe('2025-02-15');
  });

  it('purchase 1 day after closing → bill in next month', () => {
    // Jan 11 → February bill
    const result = generateInstallments({
      purchaseDate: '2025-01-11',
      amount: 100,
      installments: 1,
      closingDay: CLOSING,
      dueDay: DUE,
    });
    expect(result[0].statementMonth).toBe(1); // February
    expect(result[0].dueDate).toBe('2025-02-15');
  });

  // ── Multi-installment sequential progression ─────────────────────────────

  it('3 installments advance by 1 month each', () => {
    // Jan 5, closingDay=10 → first bill = January
    const result = generateInstallments({
      purchaseDate: '2025-01-05',
      amount: 300,
      installments: 3,
      closingDay: CLOSING,
      dueDay: DUE,
    });
    expect(result).toHaveLength(3);
    expect(result[0].statementMonth).toBe(0); // Jan
    expect(result[1].statementMonth).toBe(1); // Feb
    expect(result[2].statementMonth).toBe(2); // Mar
    expect(result[0].dueDate).toBe('2025-01-15');
    expect(result[1].dueDate).toBe('2025-02-15');
    expect(result[2].dueDate).toBe('2025-03-15');
    // Index correctness
    expect(result[0].index).toBe(1);
    expect(result[1].index).toBe(2);
    expect(result[2].index).toBe(3);
  });

  // ── Year boundary ────────────────────────────────────────────────────────

  it('December purchase (before closing) → first bill in December, 3x wraps into new year', () => {
    // Dec 5, closingDay=10 → first bill = December (11)
    const result = generateInstallments({
      purchaseDate: '2025-12-05',
      amount: 300,
      installments: 3,
      closingDay: CLOSING,
      dueDay: DUE,
    });
    expect(result[0].statementMonth).toBe(11); // December
    expect(result[0].statementYear).toBe(2025);
    expect(result[1].statementMonth).toBe(0);  // January
    expect(result[1].statementYear).toBe(2026);
    expect(result[2].statementMonth).toBe(1);  // February
    expect(result[2].statementYear).toBe(2026);
  });

  it('December purchase (on closing day) → first bill in January, crosses year', () => {
    // Dec 10, closingDay=10 → next month = January 2026
    const result = generateInstallments({
      purchaseDate: '2025-12-10',
      amount: 200,
      installments: 2,
      closingDay: CLOSING,
      dueDay: DUE,
    });
    expect(result[0].statementMonth).toBe(0);  // January
    expect(result[0].statementYear).toBe(2026);
    expect(result[1].statementMonth).toBe(1);  // February
    expect(result[1].statementYear).toBe(2026);
  });

  // ── February edge cases ───────────────────────────────────────────────────

  it('dueDay=31 in February 2025 (non-leap) → clamped to Feb 28', () => {
    // Jan 5, closingDay=10 → first bill = January... wait, to get Feb we need Jan 10+
    // Jan 15, closingDay=10 → first bill = February 2025 (28 days)
    const result = generateInstallments({
      purchaseDate: '2025-01-15',
      amount: 100,
      installments: 1,
      closingDay: CLOSING,
      dueDay: 31,
    });
    expect(result[0].dueDate).toBe('2025-02-28');
  });

  it('dueDay=31 in February 2028 (leap year) → clamped to Feb 29', () => {
    // Jan 15 2028, closingDay=10 → first bill = February 2028 (29 days)
    const result = generateInstallments({
      purchaseDate: '2028-01-15',
      amount: 100,
      installments: 1,
      closingDay: CLOSING,
      dueDay: 31,
    });
    expect(result[0].dueDate).toBe('2028-02-29');
  });

  // ── Months without 31 days ────────────────────────────────────────────────

  it('dueDay=31 in April (30 days) → clamped to Apr 30', () => {
    // Mar 15, closingDay=10 → first bill = April (3)
    const result = generateInstallments({
      purchaseDate: '2025-03-15',
      amount: 100,
      installments: 1,
      closingDay: CLOSING,
      dueDay: 31,
    });
    expect(result[0].statementMonth).toBe(3); // April
    expect(result[0].dueDate).toBe('2025-04-30');
  });

  // ── Amount distribution ───────────────────────────────────────────────────

  it('amount with indivisible cents: remainder on first installment', () => {
    // R$ 100 / 3 = R$ 33.33... → 34 + 33 + 33
    const result = generateInstallments({
      purchaseDate: '2025-01-05',
      amount: 100,
      installments: 3,
      closingDay: CLOSING,
      dueDay: DUE,
    });
    const total = result.reduce((sum, i) => sum + i.amount, 0);
    expect(Math.round(total * 100)).toBe(10000); // sum = R$ 100.00

    // First installment has the extra cent
    expect(result[0].amount).toBeGreaterThanOrEqual(result[1].amount);
    expect(result[1].amount).toBe(result[2].amount);
  });

  it('even division: all installments equal', () => {
    // R$ 90 / 3 = R$ 30.00 each
    const result = generateInstallments({
      purchaseDate: '2025-01-05',
      amount: 90,
      installments: 3,
      closingDay: CLOSING,
      dueDay: DUE,
    });
    expect(result[0].amount).toBe(30);
    expect(result[1].amount).toBe(30);
    expect(result[2].amount).toBe(30);
  });

  // ── 12 installments (full year coverage) ─────────────────────────────────

  it('12 installments cover all 12 months without gaps or repeats', () => {
    // Jan 5, closingDay=10 → first bill = Jan (0), then Feb, Mar, ... Dec
    const result = generateInstallments({
      purchaseDate: '2025-01-05',
      amount: 1200,
      installments: 12,
      closingDay: CLOSING,
      dueDay: DUE,
    });
    expect(result).toHaveLength(12);

    const months = result.map((i) => i.statementMonth);
    expect(months).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

    // All in same year
    const years = new Set(result.map((i) => i.statementYear));
    expect(years.size).toBe(1);
  });

  it('12 installments starting near year-end wrap correctly', () => {
    // Nov 5, closingDay=10 → first bill = Nov (10), then Dec, Jan, Feb, ...
    const result = generateInstallments({
      purchaseDate: '2025-11-05',
      amount: 1200,
      installments: 12,
      closingDay: CLOSING,
      dueDay: DUE,
    });
    expect(result[0].statementMonth).toBe(10); // November
    expect(result[0].statementYear).toBe(2025);
    expect(result[1].statementMonth).toBe(11); // December 2025
    expect(result[2].statementMonth).toBe(0);  // January 2026
    expect(result[2].statementYear).toBe(2026);
    expect(result[11].statementMonth).toBe(9); // October 2026
    expect(result[11].statementYear).toBe(2026);
  });

  // ── installmentId format ──────────────────────────────────────────────────

  it('installmentIds are deterministic and follow pattern', () => {
    const result = generateInstallments({
      purchaseDate: '2025-06-01',
      amount: 100,
      installments: 3,
      closingDay: CLOSING,
      dueDay: DUE,
    });
    expect(result[0].installmentId).toBe('2025-06-01-i1');
    expect(result[1].installmentId).toBe('2025-06-01-i2');
    expect(result[2].installmentId).toBe('2025-06-01-i3');
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('throws if installments < 1', () => {
    expect(() =>
      generateInstallments({
        purchaseDate: '2025-01-01',
        amount: 100,
        installments: 0,
        closingDay: CLOSING,
        dueDay: DUE,
      })
    ).toThrow();
  });
});
