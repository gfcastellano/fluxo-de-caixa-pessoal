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
  category?: Category;
  account?: Account;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  category?: Category;
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
  isDefault: boolean;
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

export interface ReportRequest {
  type: 'monthly' | 'category' | 'trend';
  startDate: string;
  endDate: string;
  userId: string;
  format?: 'json' | 'csv' | 'pdf';
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}
