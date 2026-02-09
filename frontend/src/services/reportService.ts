import type { MonthlySummary, CategoryBreakdown, Transaction } from '../types';
import { getTransactions } from './transactionService';
import { getCategories } from './categoryService';

export async function getMonthlySummary(
  userId: string,
  year: number,
  month: number,
  accountId?: string
): Promise<MonthlySummary> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  // Fetch transactions for this account (outgoing)
  const transactions = await getTransactions(userId, { startDate, endDate, accountId });

  // Fetch all user transactions to find incoming transfers to this account
  const allTransactions = await getTransactions(userId, { startDate, endDate });
  const incomingTransfers = allTransactions.filter(
    (t) => t.type === 'transfer' && t.toAccountId === accountId
  );

  // Income includes: income transactions + incoming transfers
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
    + incomingTransfers.reduce((sum, t) => sum + t.amount, 0);

  // Expenses include: expenses + outgoing transfers (from this account)
  const expenses = transactions
    .filter((t) => t.type === 'expense' || t.type === 'transfer')
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
  type: 'income' | 'expense',
  accountId?: string
): Promise<CategoryBreakdown[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  // For expense type, include both expenses and transfers (outgoing)
  // For income type, include income and also fetch incoming transfers
  const transactionTypes = type === 'expense' 
    ? ['expense', 'transfer'] 
    : ['income'];

  const [transactions, categories, allUserTransactions] = await Promise.all([
    getTransactions(userId, { startDate, endDate, accountId }),
    getCategories(userId),
    // Fetch all transactions to find incoming transfers when needed
    type === 'income' && accountId 
      ? getTransactions(userId, { startDate, endDate })
      : Promise.resolve([]),
  ]);

  // Filter transactions by type
  const filteredTransactions = transactions.filter(t => transactionTypes.includes(t.type));

  // Find incoming transfers to this account
  const incomingTransfers = type === 'income' && accountId
    ? (allUserTransactions as Transaction[]).filter(
        t => t.type === 'transfer' && t.toAccountId === accountId
      )
    : [];

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const categoryTotals = new Map<string, number>();

  // Add regular transactions
  filteredTransactions.forEach((t) => {
    const current = categoryTotals.get(t.categoryId) || 0;
    categoryTotals.set(t.categoryId, current + t.amount);
  });

  // Add incoming transfers to a special category
  if (incomingTransfers.length > 0) {
    const transferTotal = incomingTransfers.reduce((sum, t) => sum + t.amount, 0);
    const transferCategoryId = 'incoming-transfer';
    categoryTotals.set(transferCategoryId, transferTotal);
  }

  const total = Array.from(categoryTotals.values()).reduce((sum, amount) => sum + amount, 0);

  const breakdown: CategoryBreakdown[] = Array.from(categoryTotals.entries()).map(
    ([categoryId, amount]) => {
      const category = categoryMap.get(categoryId);
      const isTransferCategory = categoryId === 'incoming-transfer';
      return {
        categoryId,
        categoryName: isTransferCategory ? 'Transferências Recebidas' : (category?.name || 'Unknown'),
        categoryColor: isTransferCategory ? '#10B981' : (category?.color || '#999999'),
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
  endMonth: number,
  accountId?: string
): Promise<{ month: string; income: number; expenses: number }[]> {
  const data: { month: string; income: number; expenses: number }[] = [];

  let currentYear = startYear;
  let currentMonth = startMonth;

  while (
    currentYear < endYear ||
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    const summary = await getMonthlySummary(userId, currentYear, currentMonth, accountId);
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
