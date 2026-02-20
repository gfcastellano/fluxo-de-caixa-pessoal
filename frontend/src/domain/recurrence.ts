/**
 * Pure function to calculate the next recurrence date.
 *
 * Mirrors the logic in backend/src/routes/transactions.ts (getNextDate).
 * Handles month-end clamping (e.g. Jan 31 → Feb 28).
 */
export function getNextDate(
  currentDate: Date,
  pattern: string | null | undefined,
  recurrenceDay: number | null | undefined
): Date {
  const nextDate = new Date(currentDate);

  switch (pattern) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;

    case 'yearly': {
      const targetDay = recurrenceDay != null ? recurrenceDay : currentDate.getDate();
      // Set day to 1 first to prevent overflow (e.g., Feb 29 in leap → setFullYear non-leap → Mar 1)
      nextDate.setDate(1);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(targetDay, lastDayOfMonth));
      break;
    }

    case 'monthly':
    default: {
      const targetDay = recurrenceDay != null ? recurrenceDay : currentDate.getDate();
      // Set day to 1 first to prevent overflow (e.g., Jan 31 → setMonth(Feb) → Mar 3)
      nextDate.setDate(1);
      nextDate.setMonth(nextDate.getMonth() + 1);
      const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(targetDay, lastDayOfMonth));
      break;
    }
  }

  return nextDate;
}
