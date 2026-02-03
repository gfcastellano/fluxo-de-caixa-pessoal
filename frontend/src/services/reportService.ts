import type { MonthlySummary, CategoryBreakdown } from '../types';
import { getTransactions } from './transactionService';
import { getCategories } from './categoryService';

export async function getMonthlySummary(
  userId: string,
  year: number,
  month: number
): Promise<MonthlySummary> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const transactions = await getTransactions(userId, { startDate, endDate });

  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    income,
    expenses,
    balance: income - expenses,
    month: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
    year,
  };
}

export async function getCategoryBreakdown(
  userId: string,
  year: number,
  month: number,
  type: 'income' | 'expense'
): Promise<CategoryBreakdown[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const [transactions, categories] = await Promise.all([
    getTransactions(userId, { startDate, endDate, type }),
    getCategories(userId),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const categoryTotals = new Map<string, number>();

  transactions.forEach((t) => {
    const current = categoryTotals.get(t.categoryId) || 0;
    categoryTotals.set(t.categoryId, current + t.amount);
  });

  const total = Array.from(categoryTotals.values()).reduce((sum, amount) => sum + amount, 0);

  const breakdown: CategoryBreakdown[] = Array.from(categoryTotals.entries()).map(
    ([categoryId, amount]) => {
      const category = categoryMap.get(categoryId);
      return {
        categoryId,
        categoryName: category?.name || 'Unknown',
        categoryColor: category?.color || '#999999',
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      };
    }
  );

  return breakdown.sort((a, b) => b.amount - a.amount);
}

export async function getTrendData(
  userId: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): Promise<{ month: string; income: number; expenses: number }[]> {
  const data: { month: string; income: number; expenses: number }[] = [];

  let currentYear = startYear;
  let currentMonth = startMonth;

  while (
    currentYear < endYear ||
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    const summary = await getMonthlySummary(userId, currentYear, currentMonth);
    data.push({
      month: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
      income: summary.income,
      expenses: summary.expenses,
    });

    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  return data;
}
