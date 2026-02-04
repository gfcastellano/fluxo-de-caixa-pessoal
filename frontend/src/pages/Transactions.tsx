import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { TransactionModal } from '../components/TransactionModal';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  deleteRecurringTransaction,
} from '../services/transactionService';
import { getCategories } from '../services/categoryService';
import { getAccounts } from '../services/accountService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import type { Transaction, Category, Account } from '../types';
import { formatCurrency, formatDate, getCurrentMonth } from '../utils/format';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, Repeat, Calendar } from 'lucide-react';

export function Transactions() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [expandedRecurring, setExpandedRecurring] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filterYear, filterMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Build date filters if year/month are selected
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (filterYear !== 'all') {
        if (filterMonth !== 'all') {
          // Specific month and year
          startDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
          const lastDay = new Date(filterYear, filterMonth, 0).getDate();
          endDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        } else {
          // Entire year
          startDate = `${filterYear}-01-01`;
          endDate = `${filterYear}-12-31`;
        }
      }

      const [transactionsData, categoriesData, accountsData] = await Promise.all([
        getTransactions(user!.uid, { startDate, endDate }),
        getCategories(user!.uid),
        getAccounts(user!.uid),
      ]);

      // Join transactions with their categories and accounts
      const transactionsWithCategories = transactionsData.map((transaction) => {
        const category = categoriesData.find((c) => c.id === transaction.categoryId);
        const account = accountsData.find((a) => a.id === transaction.accountId);
        return {
          ...transaction,
          category,
          account,
        };
      });

      setTransactions(transactionsWithCategories);
      setCategories(categoriesData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: Partial<Transaction>) => {
    if (!user) return;

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, data);
        // Update the local state immediately for better UX
        setTransactions(prev => prev.map(t => {
          if (t.id === editingTransaction.id) {
            const updatedCategory = data.categoryId
              ? categories.find(c => c.id === data.categoryId)
              : t.category;
            const updatedAccount = data.accountId
              ? accounts.find(a => a.id === data.accountId)
              : t.account;
            return {
              ...t,
              ...data,
              category: updatedCategory,
              account: updatedAccount,
              // Ensure these fields are properly typed
              amount: data.amount ?? t.amount,
              description: data.description ?? t.description,
              type: data.type ?? t.type,
              date: data.date ?? t.date,
              categoryId: data.categoryId ?? t.categoryId,
              accountId: data.accountId ?? t.accountId,
            };
          }
          return t;
        }));
      } else {
        // Cast to the expected type for new transactions
        await createTransaction(user.uid, data as Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
        await loadData();
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleDelete = async (transactionId: string, isRecurringParent?: boolean) => {
    if (isRecurringParent) {
      if (!confirm(t('transactions.deleteRecurringConfirm') || 'Are you sure you want to delete this recurring transaction and all its instances?')) return;
      
      try {
        await deleteRecurringTransaction(transactionId, true);
        await loadData();
      } catch (error) {
        console.error('Error deleting recurring transaction:', error);
      }
    } else {
      if (!confirm(t('transactions.deleteConfirm'))) return;

      try {
        await deleteTransaction(transactionId);
        await loadData();
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
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
    setEditingTransaction(null);
  };

  const handlePreviousMonth = () => {
    if (filterYear === 'all') {
      const current = getCurrentMonth();
      setFilterYear(current.year);
      setFilterMonth(current.month === 1 ? 12 : current.month - 1);
      if (current.month === 1) {
        setFilterYear(current.year - 1);
      }
    } else if (filterMonth === 'all') {
      setFilterYear(filterYear - 1);
    } else if (filterMonth === 1) {
      setFilterMonth(12);
      setFilterYear(filterYear - 1);
    } else {
      setFilterMonth(filterMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (filterYear === 'all') {
      const current = getCurrentMonth();
      setFilterYear(current.year);
      setFilterMonth(current.month === 12 ? 1 : current.month + 1);
      if (current.month === 12) {
        setFilterYear(current.year + 1);
      }
    } else if (filterMonth === 'all') {
      setFilterYear(filterYear + 1);
    } else if (filterMonth === 12) {
      setFilterMonth(1);
      setFilterYear(filterYear + 1);
    } else {
      setFilterMonth(filterMonth + 1);
    }
  };

  const handleVoiceUpdate = (updates: Partial<Transaction>) => {
    console.log('handleVoiceUpdate called with:', updates);
    console.log('Current editingTransaction:', editingTransaction);
    
    // Update the local state immediately when voice changes are applied
    if (editingTransaction) {
      console.log('Updating transaction in local state:', editingTransaction.id);
      setTransactions(prev => {
        console.log('Previous transactions count:', prev.length);
        const newTransactions = prev.map(t => {
          if (t.id === editingTransaction.id) {
            const updatedCategory = updates.categoryId
              ? categories.find(c => c.id === updates.categoryId)
              : t.category;
            const updatedAccount = updates.accountId
              ? accounts.find(a => a.id === updates.accountId)
              : t.account;
            console.log('Found transaction to update:', t.id);
            console.log('Updated category:', updatedCategory?.name || 'unchanged');
            const updatedTransaction = {
              ...t,
              ...updates,
              category: updatedCategory,
              account: updatedAccount,
            };
            console.log('Updated transaction:', updatedTransaction);
            return updatedTransaction;
          }
          return t;
        });
        console.log('New transactions count:', newTransactions.length);
        return newTransactions;
      });
    } else {
      console.log('No editingTransaction found, cannot update state');
    }
  };

  const toggleRecurringExpand = (transactionId: string) => {
    setExpandedRecurring(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  // Group transactions by parent for recurring display
  const groupTransactions = (transactions: Transaction[]) => {
    const parentMap = new Map<string, Transaction[]>();
    const standalone: Transaction[] = [];

    transactions.forEach(t => {
      if (t.parentTransactionId) {
        if (!parentMap.has(t.parentTransactionId)) {
          parentMap.set(t.parentTransactionId, []);
        }
        parentMap.get(t.parentTransactionId)!.push(t);
      } else if (!t.isRecurring) {
        standalone.push(t);
      }
    });

    return { parentMap, standalone };
    };

  // Get recurring parent transactions
  const recurringParents = transactions.filter(t => t.isRecurring);

  const { parentMap, standalone } = groupTransactions(transactions);

  const filteredTransactions = standalone.filter((t) => {
    const matchesSearch = t.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  // Filter recurring parents
  const filteredRecurringParents = recurringParents.filter((t) => {
    const matchesSearch = t.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-neutral-900">{t('transactions.title')}</h1>
        <Button onClick={handleOpenAddModal} className="w-full sm:w-auto whitespace-nowrap" leftIcon={<Plus className="h-4 w-4 flex-shrink-0" />}>
          {t('transactions.addNew')}
        </Button>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        transaction={editingTransaction}
        categories={categories}
        onSave={handleSave}
        onVoiceUpdate={handleVoiceUpdate}
        userId={user?.uid || ''}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>{t('transactions.title')}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder={t('common.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-md border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as 'all' | 'income' | 'expense')
                }
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all" className="text-neutral-900">{t('common.all')}</option>
                <option value="income" className="text-neutral-900">{t('common.income')}</option>
                <option value="expense" className="text-neutral-900">{t('common.expense')}</option>
              </select>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all" className="text-neutral-900">{t('transactions.filters.allYears')}</option>
                {[2023, 2024, 2025, 2026].map((y) => (
                  <option key={y} value={y} className="text-neutral-900">
                    {y}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handlePreviousMonth}
                  aria-label={t('transactions.filters.previousMonth')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all" className="text-neutral-900">{t('transactions.filters.allMonths')}</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m} className="text-neutral-900">
                      {new Date(2000, m - 1).toLocaleString('default', {
                        month: 'long',
                      })}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleNextMonth}
                  aria-label={t('transactions.filters.nextMonth')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 && filteredRecurringParents.length === 0 ? (
            <p className="text-neutral-500 text-center py-8">{t('transactions.noTransactions')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 px-4 font-medium text-neutral-700">
                      {t('common.date')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-neutral-700">
                      {t('transactions.form.title')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-neutral-700">
                      {t('common.category')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-neutral-700">
                      {t('transactions.form.account')}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-neutral-700">
                      {t('common.amount')}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-neutral-700">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Recurring Parent Transactions */}
                  {filteredRecurringParents.map((parent) => {
                    const instances = parentMap.get(parent.id) || [];
                    const isExpanded = expandedRecurring.has(parent.id);
                    
                    return (
                      <>
                        <tr
                          key={parent.id}
                          className="border-b border-neutral-100 hover:bg-neutral-50 bg-primary-50/30"
                        >
                          <td className="py-3 px-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Repeat className="h-4 w-4 text-primary-500" />
                              <button
                                onClick={() => toggleRecurringExpand(parent.id)}
                                className="text-primary-600 hover:text-primary-800 font-medium"
                              >
                                {formatDate(parent.date)}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-neutral-900">{parent.description}</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                                <Repeat className="h-3 w-3 mr-1" />
                                {parent.recurrencePattern === 'monthly' && (t('common.monthly') || 'Monthly')}
                                {parent.recurrencePattern === 'weekly' && (t('common.weekly') || 'Weekly')}
                                {parent.recurrencePattern === 'yearly' && (t('common.yearly') || 'Yearly')}
                              </span>
                              {instances.length > 0 && (
                                <span className="text-xs text-neutral-500">
                                  ({instances.length} {t('transactions.instances') || 'instances'})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${parent.category?.color}20`,
                                color: parent.category?.color,
                              }}
                            >
                              {parent.category ? t(getTranslatedCategoryName(parent.category.name)) : t('common.category')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span
                              className="font-medium"
                              style={{ color: parent.account?.color || '#4F46E5' }}
                            >
                              {parent.account?.name || '-'}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-medium ${
                              parent.type === 'income'
                                ? 'text-success-600'
                                : 'text-danger-600'
                            }`}
                          >
                            {parent.type === 'income' ? '+' : '-'}
                            {formatCurrency(parent.amount, parent.account?.currency)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditModal(parent)}
                                className="p-2 text-neutral-600 hover:bg-neutral-200 rounded-md"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(parent.id, true)}
                                className="p-2 text-danger-600 hover:bg-danger-100 rounded-md"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded instances */}
                        {isExpanded && instances.map((instance) => (
                          <tr
                            key={instance.id}
                            className="border-b border-neutral-100 bg-neutral-50/50"
                          >
                            <td className="py-2 px-4 text-sm pl-10">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-neutral-400" />
                                {formatDate(instance.date)}
                              </div>
                            </td>
                            <td className="py-2 px-4 text-sm text-neutral-600">
                              {instance.description}
                            </td>
                            <td className="py-2 px-4">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: `${instance.category?.color}20`,
                                  color: instance.category?.color,
                                }}
                              >
                                {instance.category ? t(getTranslatedCategoryName(instance.category.name)) : t('common.category')}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-sm">
                              <span
                                className="font-medium"
                                style={{ color: instance.account?.color || '#4F46E5' }}
                              >
                                {instance.account?.name || '-'}
                              </span>
                            </td>
                            <td
                              className={`py-2 px-4 text-right text-sm font-medium ${
                                instance.type === 'income'
                                  ? 'text-success-600'
                                  : 'text-danger-600'
                              }`}
                            >
                              {instance.type === 'income' ? '+' : '-'}
                              {formatCurrency(instance.amount, instance.account?.currency)}
                            </td>
                            <td className="py-2 px-4 text-right">
                              <button
                                onClick={() => handleDelete(instance.id)}
                                className="p-1.5 text-danger-600 hover:bg-danger-100 rounded-md"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })}
                  
                  {/* Regular Transactions */}
                  {filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-neutral-100 hover:bg-neutral-50"
                    >
                      <td className="py-3 px-4 text-sm text-neutral-900">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="py-3 px-4 text-neutral-900">{transaction.description}</td>
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${transaction.category?.color}20`,
                            color: transaction.category?.color,
                          }}
                        >
                          {transaction.category ? t(getTranslatedCategoryName(transaction.category.name)) : t('common.category')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span
                          className="font-medium"
                          style={{ color: transaction.account?.color || '#4F46E5' }}
                        >
                          {transaction.account?.name || '-'}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium ${
                          transaction.type === 'income'
                            ? 'text-success-600'
                            : 'text-danger-600'
                        }`}
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount, transaction.account?.currency)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(transaction)}
                            className="p-2 text-neutral-600 hover:bg-neutral-200 rounded-md"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            className="p-2 text-danger-600 hover:bg-danger-100 rounded-md"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
