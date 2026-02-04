import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { VoiceTransactionButton } from '../components/VoiceTransactionButton';
import { TransactionModal } from '../components/TransactionModal';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../services/transactionService';
import { getCategories } from '../services/categoryService';
import { getAccounts } from '../services/accountService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import type { Transaction, Category, Account } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

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

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transactionsData, categoriesData, accountsData] = await Promise.all([
        getTransactions(user!.uid, {}),
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

  const handleDelete = async (transactionId: string) => {
    if (!confirm(t('transactions.deleteConfirm'))) return;

    try {
      await deleteTransaction(transactionId);
      await loadData();
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
    setEditingTransaction(null);
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

  const filteredTransactions = transactions.filter((t) => {
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('transactions.title')}</h1>
        <div className="flex items-center gap-3">
          <VoiceTransactionButton
            onTransactionCreated={(transaction) => {
              setTransactions((prev) => [transaction, ...prev]);
            }}
          />
          <Button onClick={handleOpenAddModal}>
            <Plus className="mr-2 h-4 w-4" />
            {t('transactions.addNew')}
          </Button>
        </div>
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
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('common.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as 'all' | 'income' | 'expense')
                }
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">{t('common.all')}</option>
                <option value="income">{t('common.income')}</option>
                <option value="expense">{t('common.expense')}</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('transactions.noTransactions')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {t('common.date')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {t('transactions.form.title')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {t('common.category')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {t('transactions.form.account')}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">
                      {t('common.amount')}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-sm">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="py-3 px-4">{transaction.description}</td>
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
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {transaction.account?.name || '-'}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium ${
                          transaction.type === 'income'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(transaction)}
                            className="p-2 text-gray-600 hover:bg-gray-200 rounded-md"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-md"
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
