/**
 * Pure function to determine which bill month/year a credit card
 * transaction belongs to, based on the card's closing day.
 *
 * Extracted from frontend/src/services/creditCardBillService.ts.
 *
 * Rules:
 * - If transaction day >= closingDay → bill moves to next month
 * - dueDate is calculated in the target month using dueDay
 * - Month is 0-based (matching Date.getMonth())
 */
export function calculateBillDate(
  transactionDate: string,
  closingDay: number,
  dueDay: number
): { month: number; year: number; dueDate: string } {
  // Parse date string directly to avoid timezone issues
  // (new Date('2025-01-05') is UTC, getDate() returns local → off-by-one in negative UTC offsets)
  const [yearStr, monthStr, dayStr] = transactionDate.split('-');
  const day = parseInt(dayStr, 10);
  const currentMonth = parseInt(monthStr, 10) - 1; // convert 1-based to 0-based
  const currentYear = parseInt(yearStr, 10);

  let targetMonth = currentMonth;
  let targetYear = currentYear;

  if (day >= closingDay) {
    targetMonth++;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear++;
    }
  }

  // Build due date string: if dueDay < closingDay the payment falls in the NEXT month
  // (e.g. closing=20, due=10 → Feb cycle is due March 10, not Feb 10)
  let dueDateMonth = targetMonth; // 0-based
  let dueDateYear = targetYear;
  if (dueDay < closingDay) {
    dueDateMonth++;
    if (dueDateMonth > 11) {
      dueDateMonth = 0;
      dueDateYear++;
    }
  }
  const lastDayOfTarget = new Date(dueDateYear, dueDateMonth + 1, 0).getDate();
  const clampedDueDay = Math.min(dueDay, lastDayOfTarget);
  const dueDate = `${dueDateYear}-${String(dueDateMonth + 1).padStart(2, '0')}-${String(clampedDueDay).padStart(2, '0')}`;

  return {
    month: targetMonth,   // cycle/statement month (0-based), unchanged
    year: targetYear,
    dueDate,
  };
}
