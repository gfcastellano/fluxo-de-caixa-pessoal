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
  // Credit Card fields
  creditCardId?: string;          // ID do cartão usado (para compras no crédito)
  billId?: string;                // ID da fatura vinculada
  isBillPayment?: boolean;        // true = esta transação é pagamento de fatura
  paidBillId?: string;            // ID da fatura paga (se isBillPayment=true)
  purchaseDate?: string;          // Data real da compra; `date` guarda o vencimento da fatura
  installments?: number;          // Total number of installments (initial request)
  installmentNumber?: number;     // Current installment number (1, 2, 3...)
  totalInstallments?: number;     // Total number of installments in the series
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

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

// Credit Card interfaces
export interface CreditCard {
  id: string;
  userId: string;
  name: string;                   // Nome do cartão (ex: "Nubank", "Itaú")
  linkedAccountId: string;        // Conta bancária vinculada (para pagamento)
  creditLimit: number;            // Limite total do cartão
  closingDay: number;             // Dia do fechamento (1-31)
  dueDay: number;                 // Dia do vencimento (1-31)
  color?: string;                 // Cor para identificação visual
  isDefault?: boolean;            // Cartão padrão
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardBill {
  id: string;
  userId: string;
  creditCardId: string;           // ID do cartão
  month: number;                  // Mês da fatura (1-12)
  year: number;                   // Ano da fatura
  closingDate?: string;           // Data de fechamento (quando usuário fechar)
  dueDate: string;                // Data de vencimento calculada
  totalAmount: number;            // Valor total da fatura
  isClosed: boolean;              // Fatura foi fechada?
  isPaid: boolean;                // Fatura foi paga?
  paidAt?: string;                // Data do pagamento
  paidFromAccountId?: string;     // Conta usada para pagar
  createdAt: string;
  updatedAt: string;
}

// Extended Transaction interface with credit card support
export interface TransactionWithCreditCard extends Transaction {
  // Credit card fields
  creditCardId?: string;          // ID do cartão usado (para compras no crédito)
  billId?: string;                // ID da fatura vinculada
  isBillPayment?: boolean;        // true = esta transação é pagamento de fatura
  paidBillId?: string;            // ID da fatura paga (se isBillPayment=true)
  // Cash payment flag
  isCash?: boolean;               // true = pagamento em dinheiro/efetivo
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
