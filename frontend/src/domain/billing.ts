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

  // Build due date string directly to avoid timezone issues
  const lastDayOfTarget = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDueDay = Math.min(dueDay, lastDayOfTarget);
  const dueDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(clampedDueDay).padStart(2, '0')}`;

  return {
    month: targetMonth,
    year: targetYear,
    dueDate,
  };
}
