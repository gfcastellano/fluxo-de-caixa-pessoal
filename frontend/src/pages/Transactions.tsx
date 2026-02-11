import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { TransactionModal } from '../components/TransactionModal';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  deleteRecurringTransaction,
  generateMissingRecurringInstances,
} from '../services/transactionService';
import { getCategories } from '../services/categoryService';
import { getAccounts } from '../services/accountService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import type { Transaction, Category, Account } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, Repeat, Copy, Calendar, CalendarDays, List, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { cn } from '../utils/cn';
import { PageDescription } from '../components/PageDescription';

// RecurringGroup interface for grouping recurring transactions
interface RecurringGroup {
  parentId: string;
  description: string;
  recurrencePattern: 'monthly' | 'weekly' | 'yearly';
  totalInstallments: number;
  occurrencesInPeriod: number;
  totalAmountInPeriod: number;
  transactions: Transaction[];
  type: 'income' | 'expense' | 'transfer';
  categoryId: string;
  category?: Category;
  accountId?: string;
  account?: Account;
}

// Filter mode type
type FilterMode = 'all' | 'month' | 'week';

// Helper functions for date calculations
const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfWeek = (date: Date): Date => {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

const formatWeekRange = (date: Date): string => {
  const start = getStartOfWeek(date);
  const end = getEndOfWeek(date);
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  return `${start.toLocaleDateString('pt-BR', options)} - ${end.toLocaleDateString('pt-BR', options)}`;
};

const formatMonthYear = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

// Helper to calculate remaining occurrences for a recurring transaction
const calculateRemainingOccurrences = (parent: Transaction): number => {
  if (!parent.recurrencePattern || !parent.date) return 0;

  const startDate = new Date(parent.date);
  const endDate = parent.recurrenceEndDate
    ? new Date(parent.recurrenceEndDate)
    : new Date(new Date().getFullYear(), 11, 31); // End of current year

  let count = 0;
  const current = new Date(startDate);

  // Start from the next occurrence after the parent date
  if (parent.recurrencePattern === 'monthly') {
    current.setMonth(current.getMonth() + 1);
    while (current <= endDate) {
      count++;
      current.setMonth(current.getMonth() + 1);
    }
  } else if (parent.recurrencePattern === 'weekly') {
    current.setDate(current.getDate() + 7);
    while (current <= endDate) {
      count++;
      current.setDate(current.getDate() + 7);
    }
  } else if (parent.recurrencePattern === 'yearly') {
    current.setFullYear(current.getFullYear() + 1);
    while (current <= endDate) {
      count++;
      current.setFullYear(current.getFullYear() + 1);
    }
  }

  return count;
};

// Helper to format installment display (X de Y)
const formatInstallment = (transaction: Transaction): string | null => {
  if (!transaction.totalInstallments || transaction.totalInstallments <= 1) return null;

  const current = transaction.installmentNumber || 1;
  return `${current} de ${transaction.totalInstallments}`;
};

export function Transactions() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Loading states - separated for better UX
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [autoRecordOnOpen, setAutoRecordOnOpen] = useState(false); // Captures shouldAutoRecord before clear

  // Filter states - NEW: filterMode replaces filterYear/filterMonth
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [currentDate, setCurrentDate] = useState(new Date()); // Reference date for month/week navigation
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');

  /* New state for highlighting */
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Recurring expansion
  const [expandedRecurring, setExpandedRecurring] = useState<Set<string>>(new Set());

  // Voice context
  const { shouldOpenModal, shouldAutoRecord, clearModalRequest } = useVoice();

  // URL params listener
  const [searchParams, setSearchParams] = useSearchParams();

  // Calculate date range based on filter mode
  const dateRange = useMemo(() => {
    if (filterMode === 'all') {
      return { startDate: undefined, endDate: undefined };
    }

    if (filterMode === 'month') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { startDate, endDate };
    }

    if (filterMode === 'week') {
      const start = getStartOfWeek(currentDate);
      const end = getEndOfWeek(currentDate);
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];
      return { startDate, endDate };
    }

    return { startDate: undefined, endDate: undefined };
  }, [filterMode, currentDate]);

  // Load categories and accounts only once
  const loadStaticData = useCallback(async () => {
    if (!user) return;
    try {
      const [categoriesData, accountsData] = await Promise.all([
        getCategories(user.uid),
        getAccounts(user.uid),
      ]);
      setCategories(categoriesData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading static data:', error);
    }
  }, [user]);

  // Load transactions only (called when filters change)
  const loadTransactions = useCallback(async (showFullLoading = false) => {
    if (!user) return;

    if (showFullLoading) {
      setIsInitialLoading(true);
    } else {
      setIsTableLoading(true);
    }

    try {
      // Generate recurring instances in background (don't block UI)
      generateMissingRecurringInstances(user.uid).catch(console.error);

      const transactionsData = await getTransactions(user.uid, dateRange);

      // Enrich transactions with category, account, and toAccount info
      const enrichedTransactions = transactionsData.map((transaction) => ({
        ...transaction,
        category: categories.find((c) => c.id === transaction.categoryId),
        account: accounts.find((a) => a.id === transaction.accountId),
        toAccount: transaction.toAccountId ? accounts.find((a) => a.id === transaction.toAccountId) : undefined,
      }));

      // Sort transactions by date (most recent first)
      const sortedTransactions = enrichedTransactions.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTransactions(sortedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsInitialLoading(false);
      setIsTableLoading(false);
    }
  }, [user, dateRange, categories, accounts]);

  // Initial load - categories, accounts, and transactions
  useEffect(() => {
    if (user && categories.length === 0) {
      loadStaticData();
    }
  }, [user, loadStaticData, categories.length]);

  // Load transactions when filter changes or after static data loads
  useEffect(() => {
    if (user && categories.length > 0 && accounts.length > 0) {
      loadTransactions(isInitialLoading);
    }
  }, [user, dateRange, categories.length, accounts.length]);

  // Voice modal trigger
  useEffect(() => {
    if (shouldOpenModal) {
      // Capture shouldAutoRecord before clearing
      setAutoRecordOnOpen(shouldAutoRecord);
      handleOpenAddModal();
      clearModalRequest();
    }
  }, [shouldOpenModal, shouldAutoRecord, clearModalRequest]);

  // URL action=add handler
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      handleOpenAddModal();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Navigation handlers
  const handlePrevious = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (filterMode === 'month') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (filterMode === 'week') {
        newDate.setDate(newDate.getDate() - 7);
      }
      return newDate;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (filterMode === 'month') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (filterMode === 'week') {
        newDate.setDate(newDate.getDate() + 7);
      }
      return newDate;
    });
  };

  // Mode change handler - reset to current date when changing modes
  const handleModeChange = (mode: FilterMode) => {
    setFilterMode(mode);
    if (mode !== 'all') {
      setCurrentDate(new Date());
    }
  };

  // Save handler - optimistic update for edits, reload for new
  const handleSave = async (data: Partial<Transaction>) => {
    if (!user) return;
    try {
      if (editingTransaction) {
        // Extract editMode from data if present (for recurring transactions)
        const { editMode, ...transactionData } = data as Partial<Transaction> & { editMode?: 'single' | 'forward' | 'all' };
        await updateTransaction(editingTransaction.id, transactionData, editMode);

        // If bulk edit (forward or all), reload all transactions to get updated data
        if (editMode === 'forward' || editMode === 'all') {
          await loadTransactions(false);
        } else {
          // Optimistic update for single transaction edit
          setTransactions(prev => prev.map(t => {
            if (t.id === editingTransaction.id) {
              return {
                ...t,
                ...transactionData,
                category: transactionData.categoryId ? categories.find(c => c.id === transactionData.categoryId) : t.category,
                account: transactionData.accountId ? accounts.find(a => a.id === transactionData.accountId) : t.account,
              };
            }
            return t;
          }));
        }
      } else {
        const newTransaction = await createTransaction(user.uid, data as any);

        // If it's a recurring transaction (including installments), reload to get all generated instances
        if (newTransaction.isRecurring || (data as any).recurringCount > 1) {
          await loadTransactions(false);
        } else {
          // Add to list if within current filter range
          const enrichedTransaction = {
            ...newTransaction,
            category: categories.find((c) => c.id === newTransaction.categoryId),
            account: accounts.find((a) => a.id === newTransaction.accountId),
          };
          setTransactions(prev => [enrichedTransaction, ...prev]);

          // Highlight the new item for 5 seconds
          setHighlightedId(newTransaction.id);
          setTimeout(() => setHighlightedId(null), 5000);
        }
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleDelete = async (transactionId: string, isRecurringParent?: boolean) => {
    const confirmMsg = isRecurringParent
      ? t('transactions.deleteRecurringConfirm')
      : t('transactions.deleteConfirm');

    if (!confirm(confirmMsg)) return;

    try {
      if (isRecurringParent) {
        await deleteRecurringTransaction(transactionId, true);
      } else {
        await deleteTransaction(transactionId);
      }
      // Optimistic remove
      setTransactions(prev => prev.filter(t => t.id !== transactionId && t.parentTransactionId !== transactionId));
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleOpenAddModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setAutoRecordOnOpen(false); // Reset auto-record flag
  };

  const handleVoiceUpdate = (updates: Partial<Transaction>) => {
    if (editingTransaction) {
      setTransactions(prev => prev.map(t => {
        if (t.id === editingTransaction.id) {
          return {
            ...t,
            ...updates,
            category: updates.categoryId ? categories.find(c => c.id === updates.categoryId) : t.category,
            account: updates.accountId ? accounts.find(a => a.id === updates.accountId) : t.account,
          };
        }
        return t;
      }));
    }
  };

  const toggleRecurringExpand = (transactionId: string) => {
    setExpandedRecurring(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) newSet.delete(transactionId);
      else newSet.add(transactionId);
      return newSet;
    });
  };

  // Group transactions for recurring display
  const { recurringGroups, standalone } = useMemo(() => {
    const groups = new Map<string, RecurringGroup>();
    const standalone: Transaction[] = [];

    transactions.forEach(t => {
      // If it's a recurring transaction (parent or child)
      if (t.isRecurring || t.parentTransactionId || t.isRecurringInstance) {
        const parentId = t.isRecurring ? t.id : t.parentTransactionId!;

        if (!groups.has(parentId)) {
          groups.set(parentId, {
            parentId,
            description: t.description,
            recurrencePattern: t.recurrencePattern || 'monthly',
            totalInstallments: t.totalInstallments || 1,
            occurrencesInPeriod: 0,
            totalAmountInPeriod: 0,
            transactions: [],
            type: t.type,
            categoryId: t.categoryId,
            category: t.category,
            accountId: t.accountId,
            account: t.account,
          });
        }

        const group = groups.get(parentId)!;
        group.transactions.push(t);
        group.occurrencesInPeriod++;
        group.totalAmountInPeriod += t.amount;
      } else {
        // Regular transaction (not recurring)
        standalone.push(t);
      }
    });

    // Sort transactions within each group by installmentNumber
    groups.forEach(group => {
      group.transactions.sort((a, b) =>
        (a.installmentNumber || 0) - (b.installmentNumber || 0)
      );
    });

    return {
      recurringGroups: Array.from(groups.values()),
      standalone,
    };
  }, [transactions]);

  // Filter by search and type
  const filteredTransactions = standalone.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const filteredRecurringGroups = recurringGroups.filter((group) => {
    const matchesSearch = group.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || group.type === filterType;
    return matchesSearch && matchesType;
  });

  // Get current period label
  const getPeriodLabel = () => {
    if (filterMode === 'all') return t('common.all');
    if (filterMode === 'month') return formatMonthYear(currentDate);
    if (filterMode === 'week') return formatWeekRange(currentDate);
    return '';
  };

  // Initial loading screen
  if (isInitialLoading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height)-var(--dock-height))] sm:h-auto sm:min-h-0 sm:gap-6 gap-4 sm:p-6 p-4 overflow-x-hidden">
      {/* Header - no add button, Hero handles it */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg sm:text-2xl font-bold text-ink">{t('transactions.title')}</h1>
        <PageDescription pageKey="transactions" />
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        transaction={editingTransaction}
        categories={categories}
        onSave={handleSave}
        onVoiceUpdate={handleVoiceUpdate}
        userId={user?.uid || ''}
        autoStartRecording={autoRecordOnOpen}
      />

      <Card className="bg-white/40 backdrop-blur-xl border-white/60 flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardHeader className="flex-shrink-0 py-2 sm:py-4">
          <div className="flex flex-col gap-2 sm:gap-4">
            {/* Filter Mode Toggle Buttons - Redesigned Layout */}
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              {/* Left side: All button - more prominent */}
              <button
                onClick={() => handleModeChange('all')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm",
                  filterMode === 'all'
                    ? "bg-blue text-white shadow-blue/25"
                    : "bg-white/60 text-slate hover:bg-white hover:text-ink border border-slate/10"
                )}
              >
                <List size={16} className="sm:w-5 sm:h-5" />
                <span>{t('common.all')}</span>
              </button>

              {/* Right side: Month/Week with navigation */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Period label - always visible and not truncated */}
                <span className={cn(
                  "text-xs sm:text-sm font-medium text-ink whitespace-nowrap transition-opacity",
                  filterMode === 'all' ? "opacity-0 pointer-events-none hidden" : "opacity-100"
                )}>
                  {getPeriodLabel()}
                </span>

                {/* Navigation arrows - always visible structure */}
                <div className="flex items-center rounded-xl bg-slate/5 p-0.5 sm:p-1 gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handlePrevious}
                    disabled={filterMode === 'all'}
                    className={cn(
                      "h-7 w-7 sm:h-8 sm:w-8 transition-all",
                      filterMode === 'all'
                        ? "text-slate/30 cursor-not-allowed"
                        : "text-slate hover:bg-blue/10 hover:text-blue"
                    )}
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>

                  {/* Month button */}
                  <button
                    onClick={() => handleModeChange('month')}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all",
                      filterMode === 'month'
                        ? "bg-blue text-white shadow-sm"
                        : "text-slate hover:bg-white/50 hover:text-ink"
                    )}
                  >
                    <Calendar size={14} className="sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('common.month') || 'Mês'}</span>
                  </button>

                  {/* Week button */}
                  <button
                    onClick={() => handleModeChange('week')}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all",
                      filterMode === 'week'
                        ? "bg-blue text-white shadow-sm"
                        : "text-slate hover:bg-white/50 hover:text-ink"
                    )}
                  >
                    <CalendarDays size={14} className="sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('common.week') || 'Semana'}</span>
                  </button>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleNext}
                    disabled={filterMode === 'all'}
                    className={cn(
                      "h-7 w-7 sm:h-8 sm:w-8 transition-all",
                      filterMode === 'all'
                        ? "text-slate/30 cursor-not-allowed"
                        : "text-slate hover:bg-blue/10 hover:text-blue"
                    )}
                  >
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Search and Type Filter */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
                <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate" />
                <input
                  type="text"
                  placeholder={t('common.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate/10 bg-white/50 text-xs sm:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all placeholder:text-slate/60"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="rounded-lg sm:rounded-xl border border-slate/10 bg-white/50 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue cursor-pointer"
              >
                <option value="all">{t('common.all')}</option>
                <option value="income">{t('common.income')}</option>
                <option value="expense">{t('common.expense')}</option>
                <option value="transfer">{t('common.transfer')}</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative flex-1 min-h-0 overflow-hidden p-0 sm:p-4">
          {/* Table loading overlay */}
          {isTableLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue"></div>
            </div>
          )}

          {filteredTransactions.length === 0 && filteredRecurringGroups.length === 0 ? (
            <p className="text-slate text-center py-8 sm:py-12 text-sm">{t('transactions.noTransactions')}</p>
          ) : (
            <>
              {/* ============================================
                  MOBILE: Card Layout (sm-) - Scrollable
                  ============================================ */}
              <div className="sm:hidden h-full overflow-y-auto px-3 pb-2 space-y-2">
                {/* Recurring Groups - Mobile Cards */}
                {filteredRecurringGroups.map((group) => {
                  const isExpanded = expandedRecurring.has(group.parentId);
                  return (
                    <div key={`group-${group.parentId}`} className="space-y-2">
                      {/* Group Header Card */}
                      <div
                        className="card-glass p-3 space-y-2 bg-blue/5 cursor-pointer active:scale-[0.98] transition-all"
                        onClick={() => toggleRecurringExpand(group.parentId)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Repeat className="h-4 w-4 text-blue flex-shrink-0" />
                              <span className="font-semibold text-ink text-xs truncate">
                                {group.description}
                              </span>
                              {isExpanded ? <ChevronUp size={14} className="text-blue" /> : <ChevronDown size={14} className="text-blue" />}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate flex-wrap">
                              <span>
                                {group.occurrencesInPeriod} {group.occurrencesInPeriod === 1 ? 'ocorrência' : 'ocorrências'}
                              </span>
                              <span className="px-1 py-0.5 rounded bg-blue/10 text-blue text-[8px] font-medium">
                                {group.recurrencePattern}
                              </span>
                              <span className={cn(
                                "px-1 py-0.5 rounded text-[8px] font-medium",
                                group.type === 'income'
                                  ? "bg-emerald/10 text-emerald"
                                  : "bg-rose/10 text-rose"
                              )}>
                                {group.occurrencesInPeriod}x
                              </span>
                            </div>
                          </div>
                          <div className={`text-right font-bold text-sm ${group.type === 'income' ? 'text-emerald' : group.type === 'transfer' ? 'text-blue' : 'text-rose'}`}>
                            {group.type === 'income' ? '+' : '-'}{formatCurrency(group.totalAmountInPeriod, group.account?.currency)}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate/10">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded-full bg-slate/5 text-slate">
                              {group.category ? t(getTranslatedCategoryName(group.category.name)) : t('common.category')}
                            </span>
                            <span style={{ color: group.account?.color }}>{group.account?.name}</span>
                          </div>
                          <div className="flex gap-0.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(group.transactions[0]);
                              }}
                              className="p-1.5 text-slate hover:bg-slate/10 rounded-full touch-target"
                              title="Editar série"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(group.parentId, true);
                              }}
                              className="p-1.5 text-rose hover:bg-rose/10 rounded-full touch-target"
                              title="Deletar série"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Instance Cards */}
                      {isExpanded && group.transactions.map((transaction) => {
                        const installmentDisplay = formatInstallment(transaction);
                        return (
                          <div
                            key={transaction.id}
                            className="card-glass p-3 space-y-2 bg-blue/5 ml-4 border-l-2 border-blue/20"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <FileText className="h-3 w-3 text-blue flex-shrink-0" />
                                  <span className="font-medium text-ink text-xs truncate">
                                    {transaction.description}
                                    {installmentDisplay && <span className="text-blue ml-1">{installmentDisplay}</span>}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate">
                                  <span>{formatDate(transaction.date)}</span>
                                </div>
                              </div>
                              <div className={`text-right font-bold text-sm ${transaction.type === 'income' ? 'text-emerald' : transaction.type === 'transfer' ? 'text-blue' : 'text-rose'}`}>
                                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, transaction.account?.currency)}
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate/10">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="px-1.5 py-0.5 rounded-full bg-slate/5 text-slate">
                                  {transaction.category ? t(getTranslatedCategoryName(transaction.category.name)) : t('common.category')}
                                </span>
                                <span style={{ color: transaction.account?.color }}>{transaction.account?.name}</span>
                              </div>
                              <div className="flex gap-0.5">
                                <button
                                  onClick={() => handleOpenEditModal(transaction)}
                                  className="p-1.5 text-slate hover:bg-slate/10 rounded-full touch-target"
                                  title="Editar esta ocorrência"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(transaction.id)}
                                  className="p-1.5 text-rose hover:bg-rose/10 rounded-full touch-target"
                                  title="Deletar esta ocorrência"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Regular Transactions - Mobile Cards */}
                {filteredTransactions
                  .filter(t => !t.isRecurringInstance && !t.parentTransactionId)
                  .map((transaction) => {
                    const installmentDisplay = formatInstallment(transaction);
                    return (
                      <div
                        key={transaction.id}
                        className={cn(
                          "card-glass p-3 space-y-2 hover:shadow-glass-hover transition-all duration-1000",
                          highlightedId === transaction.id ? "animate-highlight scale-[1.02]" : ""
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-ink text-xs truncate">
                              {transaction.description}
                              {installmentDisplay && <span className="text-blue ml-1">({installmentDisplay})</span>}
                            </p>
                            <p className="text-[10px] text-slate mt-0.5">{formatDate(transaction.date)}</p>
                          </div>
                          <div className={`text-right font-bold text-sm ${transaction.type === 'income' ? 'text-emerald' : transaction.type === 'transfer' ? 'text-blue' : 'text-rose'}`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, transaction.account?.currency)}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate/10">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded-full bg-slate/5 text-slate">
                              {transaction.category ? t(getTranslatedCategoryName(transaction.category.name)) : t('common.category')}
                            </span>
                            <span style={{ color: transaction.account?.color }}>{transaction.account?.name}</span>
                          </div>
                          <div className="flex gap-0.5">
                            <button onClick={() => handleOpenEditModal(transaction)} className="p-1.5 text-slate hover:bg-slate/10 rounded-full touch-target">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(transaction.id)} className="p-1.5 text-rose hover:bg-rose/10 rounded-full touch-target">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* ============================================
                  TABLET/DESKTOP: Table Layout (sm+)
                  ============================================ */}
              <div className="hidden sm:block overflow-x-auto h-full">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate/5">
                      <th className="text-left py-3 px-4 font-medium text-slate text-xs uppercase tracking-wider">{t('common.date')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate text-xs uppercase tracking-wider">{t('transactions.form.title')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate text-xs uppercase tracking-wider hidden md:table-cell">{t('common.category')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate text-xs uppercase tracking-wider hidden lg:table-cell">{t('transactions.form.account')}</th>
                      <th className="text-right py-3 px-4 font-medium text-slate text-xs uppercase tracking-wider">{t('common.amount')}</th>
                      <th className="text-right py-3 px-4 font-medium text-slate text-xs uppercase tracking-wider">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate/5">
                    {/* Recurring Groups */}
                    {filteredRecurringGroups.map((group) => {
                      const isExpanded = expandedRecurring.has(group.parentId);
                      return (
                        <>
                          {/* Group Header Row */}
                          <tr
                            key={`group-${group.parentId}`}
                            className="bg-blue/5 hover:bg-blue/10 cursor-pointer transition-all"
                          >
                            <td className="py-3 px-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Repeat className="h-5 w-5 text-blue flex-shrink-0" />
                                <button
                                  onClick={() => toggleRecurringExpand(group.parentId)}
                                  className="text-blue hover:text-blue-hover font-medium flex items-center gap-1"
                                >
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-ink">{group.description}</span>
                                <span className="text-xs text-slate">
                                  ({group.occurrencesInPeriod} {group.occurrencesInPeriod === 1 ? 'ocorrência' : 'ocorrências'})
                                </span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue/10 text-blue-hover border border-blue/20">
                                  {group.recurrencePattern}
                                </span>
                                <span className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                                  group.type === 'income'
                                    ? "bg-emerald/10 text-emerald border-emerald/20"
                                    : "bg-rose/10 text-rose border-rose/20"
                                )}>
                                  {group.occurrencesInPeriod}x
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 hidden md:table-cell">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate/5 text-slate">
                                {group.category ? t(getTranslatedCategoryName(group.category.name)) : t('common.category')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-slate hidden lg:table-cell" style={{ color: group.account?.color }}>
                              {group.account?.name || '-'}
                            </td>
                            <td className={`py-3 px-4 text-right font-bold text-base ${group.type === 'income' ? 'text-emerald' : group.type === 'transfer' ? 'text-blue' : 'text-rose'}`}>
                              {group.type === 'income' ? '+' : '-'}{formatCurrency(group.totalAmountInPeriod, group.account?.currency)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-1 items-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(group.transactions[0]);
                                  }}
                                  className="p-2 text-slate hover:bg-slate/10 rounded-full transition-colors"
                                  title="Editar série"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(group.parentId, true);
                                  }}
                                  className="p-2 text-rose hover:bg-rose/10 rounded-full transition-colors"
                                  title="Deletar série"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Instance Rows */}
                          {isExpanded && group.transactions.map((transaction) => {
                            const installmentDisplay = formatInstallment(transaction);
                            return (
                              <tr key={transaction.id} className="bg-blue/5 border-b border-white/20">
                                <td className="py-2 px-4 pl-10 text-sm text-slate">
                                  <div className="flex items-center gap-2">
                                    <FileText size={12} className="text-blue" />
                                    {formatDate(transaction.date)}
                                  </div>
                                </td>
                                <td className="py-2 px-4 text-sm text-slate">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {transaction.description}
                                    {installmentDisplay && (
                                      <span className="text-blue text-xs">{installmentDisplay}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-4 hidden md:table-cell">
                                  <span className="text-xs text-slate opacity-70">
                                    {transaction.category ? t(getTranslatedCategoryName(transaction.category.name)) : '-'}
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-sm text-slate opacity-70 hidden lg:table-cell" style={{ color: transaction.account?.color }}>
                                  {transaction.account?.name}
                                </td>
                                <td className={`py-2 px-4 text-right text-sm ${transaction.type === 'income' ? 'text-emerald' : transaction.type === 'transfer' ? 'text-blue' : 'text-rose'}`}>
                                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, transaction.account?.currency)}
                                </td>
                                <td className="py-2 px-4 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button
                                      onClick={() => handleOpenEditModal(transaction)}
                                      className="p-1.5 text-slate hover:bg-slate/10 rounded-full transition-colors"
                                      title="Editar esta ocorrência"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(transaction.id)}
                                      className="p-1.5 text-rose hover:bg-rose/10 rounded-full"
                                      title="Deletar esta ocorrência"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      );
                    })}

                    {/* Regular Transactions */}
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className={cn(
                        "hover:bg-white/40 transition-all duration-1000 group",
                        highlightedId === transaction.id ? "animate-highlight shadow-lg scale-[1.01] relative z-10" : "transition-colors",
                        (transaction.isRecurringInstance || transaction.parentTransactionId) ? "bg-blue/5" : ""
                      )}>
                        <td className="py-3 px-4 text-sm text-slate group-hover:text-ink transition-colors">
                          <div className="flex items-center gap-2">
                            {(transaction.isRecurringInstance || transaction.parentTransactionId) && (
                              <Copy className="h-4 w-4 text-blue" />
                            )}
                            {formatDate(transaction.date)}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-ink">
                          <div className="flex items-center gap-2 flex-wrap">
                            {transaction.description}
                            {formatInstallment(transaction) && (
                              <span className="text-blue text-sm">{formatInstallment(transaction)}</span>
                            )}
                            {(transaction.isRecurringInstance || transaction.parentTransactionId) && transaction.recurrencePattern && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue/10 text-blue-hover border border-blue/20">
                                {transaction.recurrencePattern}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate/5 text-slate border border-transparent group-hover:border-slate/10 transition-colors">
                            {transaction.category ? t(getTranslatedCategoryName(transaction.category.name)) : t('common.category')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate hidden lg:table-cell" style={{ color: transaction.account?.color }}>{transaction.account?.name || '-'}</td>
                        <td className={`py-3 px-4 text-right font-medium text-base ${transaction.type === 'income' ? 'text-emerald' : transaction.type === 'transfer' ? 'text-blue' : 'text-rose'}`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, transaction.account?.currency)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1 sm:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenEditModal(transaction)} className="p-2 text-slate hover:bg-slate/10 rounded-full transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(transaction.id)} className="p-2 text-rose hover:bg-rose/10 rounded-full transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
