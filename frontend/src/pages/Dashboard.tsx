import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useUserSetup } from '../hooks/useUserSetup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/Card';
import { Button } from '../components/Button';
import { formatCurrency, formatMonthYear, getCurrentMonth } from '../utils/format';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import { getTransactions } from '../services/transactionService';
import { getAccounts, calculateAccountBalance } from '../services/accountService';
import type { Transaction, Account } from '../types';
import { TrendingUp, TrendingDown, Wallet, Plus, CreditCard, ArrowRight, Star, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CurrencySummary {
  income: number;
  expenses: number;
  balance: number;
}

export function Dashboard() {
  const { user } = useAuth();
  useUserSetup();
  const { t } = useTranslation();
  const [currencySummaries, setCurrencySummaries] = useState<Record<string, CurrencySummary>>({});
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [accountCurrencyMap, setAccountCurrencyMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { year, month } = getCurrentMonth();
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const [transactions, accountsData] = await Promise.all([
        getTransactions(user!.uid, { startDate, endDate }),
        getAccounts(user!.uid),
      ]);

      // Create a map of accountId to currency
      const accountCurrencyMap: Record<string, string> = {};
      accountsData.forEach((account) => {
        accountCurrencyMap[account.id] = account.currency;
      });

      // Calculate summaries per currency
      const summaries: Record<string, CurrencySummary> = {};

      transactions.forEach((transaction) => {
        const currency = accountCurrencyMap[transaction.accountId || ''] || 'BRL';

        if (!summaries[currency]) {
          summaries[currency] = { income: 0, expenses: 0, balance: 0 };
        }

        if (transaction.type === 'income') {
          summaries[currency].income += transaction.amount;
        } else {
          summaries[currency].expenses += transaction.amount;
        }
      });

      // Calculate balance for each currency
      Object.keys(summaries).forEach((currency) => {
        summaries[currency].balance = summaries[currency].income - summaries[currency].expenses;
      });

      setCurrencySummaries(summaries);
      setRecentTransactions(transactions.slice(0, 5));
      setAccounts(accountsData);

      // Store accountCurrencyMap in state for use in render
      setAccountCurrencyMap(accountCurrencyMap);

      // Calculate balances for all accounts
      const balances: Record<string, number> = {};
      for (const account of accountsData) {
        const calculatedBalance = await calculateAccountBalance(account.id, user!.uid);
        balances[account.id] = calculatedBalance;
      }
      setAccountBalances(balances);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const { year, month } = getCurrentMonth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">{t('dashboard.title')}</h1>
          <div className="flex items-center gap-2 text-neutral-500 mt-1">
            <Calendar className="h-4 w-4" />
            <span>{formatMonthYear(year, month)}</span>
          </div>
        </div>
        <Link to="/transactions" className="w-full sm:w-auto">
          <Button leftIcon={<Plus className="h-4 w-4 flex-shrink-0" />} className="w-full sm:w-auto">
            {t('transactions.addNew')}
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hoverable className="border-l-4 border-l-success-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">
              {t('dashboard.totalIncome')}
            </CardTitle>
            <div className="p-2 bg-success-100 rounded-lg">
              <TrendingUp className="h-4 w-4 text-success-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.keys(currencySummaries).length === 0 ? (
                <div className="text-2xl font-bold text-success-600 tabular-nums">
                  {formatCurrency(0)}
                </div>
              ) : (
                Object.entries(currencySummaries).map(([currency, summary]) => (
                  <div key={currency} className="text-2xl font-bold text-success-600 tabular-nums">
                    {formatCurrency(summary.income, currency)}
                  </div>
                ))
              )}
            </div>
            <CardDescription className="mt-1">Monthly income</CardDescription>
          </CardContent>
        </Card>

        <Card hoverable className="border-l-4 border-l-danger-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">
              {t('dashboard.totalExpenses')}
            </CardTitle>
            <div className="p-2 bg-danger-100 rounded-lg">
              <TrendingDown className="h-4 w-4 text-danger-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.keys(currencySummaries).length === 0 ? (
                <div className="text-2xl font-bold text-danger-600 tabular-nums">
                  {formatCurrency(0)}
                </div>
              ) : (
                Object.entries(currencySummaries).map(([currency, summary]) => (
                  <div key={currency} className="text-2xl font-bold text-danger-600 tabular-nums">
                    {formatCurrency(summary.expenses, currency)}
                  </div>
                ))
              )}
            </div>
            <CardDescription className="mt-1">Monthly expenses</CardDescription>
          </CardContent>
        </Card>

        <Card hoverable className="border-l-4 border-l-primary-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">
              {t('dashboard.currentBalance')}
            </CardTitle>
            <div className="p-2 bg-primary-100 rounded-lg">
              <Wallet className="h-4 w-4 text-primary-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.keys(currencySummaries).length === 0 ? (
                <div className="text-2xl font-bold text-success-600 tabular-nums">
                  {formatCurrency(0)}
                </div>
              ) : (
                Object.entries(currencySummaries).map(([currency, summary]) => (
                  <div
                    key={currency}
                    className={`text-2xl font-bold tabular-nums ${
                      summary.balance >= 0 ? 'text-success-600' : 'text-danger-600'
                    }`}
                  >
                    {formatCurrency(summary.balance, currency)}
                  </div>
                ))
              )}
            </div>
            <CardDescription className="mt-1">Net balance</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentTransactions')}</CardTitle>
          <CardDescription>Your latest financial activities</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <Wallet className="h-6 w-6 text-neutral-400" />
              </div>
              <p className="text-neutral-500 mb-2">{t('dashboard.noTransactions')}</p>
              <Link to="/transactions">
                <Button variant="outline" size="sm">
                  {t('transactions.addFirst')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'income' 
                        ? 'bg-success-100 text-success-600' 
                        : 'bg-danger-100 text-danger-600'
                    }`}>
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {transaction.category ? t(getTranslatedCategoryName(transaction.category.name)) : t('common.category')}
                        {transaction.accountId && accounts.find(a => a.id === transaction.accountId)?.name && (
                          <span className="ml-2">
                            • <span className="font-medium text-neutral-600">{accounts.find(a => a.id === transaction.accountId)?.name}</span>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold tabular-nums ${
                        transaction.type === 'income'
                          ? 'text-success-600'
                          : 'text-danger-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount, accountCurrencyMap[transaction.accountId || ''] || 'BRL')}
                    </p>
                    <p className="text-sm text-neutral-400">
                      {new Date(transaction.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
