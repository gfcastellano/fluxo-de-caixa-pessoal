export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  settings?: Record<string, unknown>;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId?: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  // Recurring transaction fields
  isRecurring?: boolean;
  recurrencePattern?: 'monthly' | 'weekly' | 'yearly' | null;
  recurrenceDay?: number | null;
  recurrenceEndDate?: string | null;
  parentTransactionId?: string | null;
  isRecurringInstance?: boolean; // true = generated child instance
  // Recurring count for initial creation
  recurringCount?: number; // Number of recurring instances to create initially
  createdFromRecurring?: boolean; // true = this transaction was created as part of a recurring series
  // Installment tracking for recurring transactions
  installmentNumber?: number; // Current installment number (1, 2, 3...)
  totalInstallments?: number; // Total number of installments in the series
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  period: 'monthly' | 'yearly';
  startDate: string;
  createdAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  currency: string;
  balance: number;
  initialBalance: number;
  balanceDate: string;
  isDefault: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export type AccountInput = Omit<Account, 'id' | 'createdAt' | 'updatedAt'>;

export interface MonthlySummary {
  income: number;
  expenses: number;
  balance: number;
  month: string;
  year: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  percentage: number;
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
