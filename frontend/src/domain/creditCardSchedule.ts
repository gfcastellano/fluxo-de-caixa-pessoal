/**
 * Pure functions for credit card installment (parcelamento) calculations.
 *
 * Builds on top of `calculateBillDate` from billing.ts.
 * No UI, no Firestore — only deterministic math.
 */
import { calculateBillDate } from './billing';

export interface InstallmentInput {
  /** Purchase date in YYYY-MM-DD format */
  purchaseDate: string;
  /** Total purchase amount */
  amount: number;
  /** Number of installments (e.g. 3 for 3x) */
  installments: number;
  /** Card's billing closing day (1–31) */
  closingDay: number;
  /** Card's bill due day (1–31) */
  dueDay: number;
}

export interface Installment {
  /** Position in the series, 1-based */
  index: number;
  /** Amount for this installment (in the same currency as input) */
  amount: number;
  /** Statement month (0-based, matching Date.getMonth()) */
  statementMonth: number;
  /** Statement year */
  statementYear: number;
  /** Due date for this installment in YYYY-MM-DD format */
  dueDate: string;
  /** Deterministic identifier: "{purchaseDate}-i{index}" */
  installmentId: string;
}

/**
 * Generates the full series of installments for a credit card purchase.
 *
 * Amount distribution:
 *   - Each installment = Math.floor(totalCents / n) / 100
 *   - Remainder cents are added to the FIRST installment
 *
 * Due date progression:
 *   - Installment 1: determined by calculateBillDate(purchaseDate, closingDay, dueDay)
 *   - Installment N: bill month of installment 1 + (N - 1) months, dueDay clamped to month's last day
 *
 * @throws {Error} if installments < 1 or amount < 0
 */
export function generateInstallments(input: InstallmentInput): Installment[] {
  const { purchaseDate, amount, installments, closingDay, dueDay } = input;

  if (installments < 1) throw new Error('installments must be >= 1');
  if (amount < 0) throw new Error('amount must be >= 0');

  // First bill: use the same logic as calculateBillDate
  const firstBill = calculateBillDate(purchaseDate, closingDay, dueDay);

  // Amount distribution in integer cents to avoid floating-point drift
  const totalCents = Math.round(amount * 100);
  const basePerInstallmentCents = Math.floor(totalCents / installments);
  const remainderCents = totalCents - basePerInstallmentCents * installments;

  return Array.from({ length: installments }, (_, i) => {
    const index = i + 1; // 1-based

    // Advance bill month by (index - 1) months from the first bill
    let statementMonth = firstBill.month + (index - 1);
    let statementYear = firstBill.year;

    while (statementMonth > 11) {
      statementMonth -= 12;
      statementYear++;
    }

    // Compute due date: if dueDay < closingDay payment falls in the next month
    let dueDateMonth = statementMonth; // 0-based
    let dueDateYear = statementYear;
    if (dueDay < closingDay) {
      dueDateMonth++;
      if (dueDateMonth > 11) {
        dueDateMonth = 0;
        dueDateYear++;
      }
    }
    const lastDayOfMonth = new Date(dueDateYear, dueDateMonth + 1, 0).getDate();
    const clampedDueDay = Math.min(dueDay, lastDayOfMonth);
    const dueDate = `${dueDateYear}-${String(dueDateMonth + 1).padStart(2, '0')}-${String(clampedDueDay).padStart(2, '0')}`;

    // First installment absorbs the remainder cents
    const cents = basePerInstallmentCents + (index === 1 ? remainderCents : 0);
    const installmentAmount = cents / 100;

    return {
      index,
      amount: installmentAmount,
      statementMonth,
      statementYear,
      dueDate,
      installmentId: `${purchaseDate}-i${index}`,
    };
  });
}
