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
  type: 'income' | 'expense' | 'transfer';
  color: string;
  icon?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId?: string;
  toAccountId?: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  categoryId: string;
  category?: Category;
  account?: Account;
  toAccount?: Account;
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
  // Installment tracking fields for displaying "X of Y"
  installmentNumber?: number; // Current installment position (1-based)
  totalInstallments?: number; // Total number of installments in the series
  // Credit card fields
  creditCardId?: string;
  creditCard?: CreditCard;
  billId?: string;
  isBillPayment?: boolean;
  paidBillId?: string;
  /** Original purchase date (YYYY-MM-DD). `date` holds the bill due date. */
  purchaseDate?: string;
  // Cash payment flag
  isCash?: boolean;
  installments?: number; // Total number of installments (initial request)
  // Shared transaction fields
  isShared?: boolean;
  ownerName?: string;
  ownerUserId?: string;
  // Weekly review
  confirmedAt?: string;
  // FX transfer fields
  amountTo?: number;
  impliedRate?: number;
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
  balanceDate: string;
  isDefault: boolean;
  isCash: boolean;
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

export interface ReportRequest {
  type: 'monthly' | 'category' | 'trend';
  startDate: string;
  endDate: string;
  userId: string;
  format?: 'json' | 'csv' | 'pdf';
}

// Credit Card interfaces
export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  linkedAccountId: string;
  linkedAccount?: Account;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  color?: string;
  isDefault?: boolean;  // Default credit card flag
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardBill {
  id: string;
  userId: string;
  creditCardId: string;
  creditCard?: CreditCard;
  month: number;
  year: number;
  closingDate?: string;
  dueDate: string;
  totalAmount: number;
  isClosed: boolean;
  isPaid: boolean;
  paidAt?: string;
  paidFromAccountId?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreditCardInput = Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt' | 'linkedAccount'>;

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}
