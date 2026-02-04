import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useUserSetup } from '../hooks/useUserSetup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/Card';
import { Button } from '../components/Button';
import { formatCurrency, formatMonthYear, getCurrentMonth } from '../utils/format';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import { getMonthlySummary } from '../services/reportService';
import { getTransactions } from '../services/transactionService';
import { getAccounts, calculateAccountBalance } from '../services/accountService';
import type { MonthlySummary, Transaction, Account } from '../types';
import { TrendingUp, TrendingDown, Wallet, Plus, CreditCard, ArrowRight, Star, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { user } = useAuth();
  useUserSetup();
  const { t } = useTranslation();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
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
      const [summaryData, transactions, accountsData] = await Promise.all([
        getMonthlySummary(user!.uid, year, month),
        getTransactions(user!.uid, {}),
        getAccounts(user!.uid),
      ]);
      setSummary(summaryData);
      setRecentTransactions(transactions.slice(0, 5));
      setAccounts(accountsData);
      
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
            <div className="text-2xl font-bold text-success-600 tabular-nums">
              {formatCurrency(summary?.income || 0)}
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
            <div className="text-2xl font-bold text-danger-600 tabular-nums">
              {formatCurrency(summary?.expenses || 0)}
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
            <div
              className={`text-2xl font-bold tabular-nums ${
                (summary?.balance || 0) >= 0 ? 'text-success-600' : 'text-danger-600'
              }`}
            >
              {formatCurrency(summary?.balance || 0)}
            </div>
            <CardDescription className="mt-1">Net balance</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900">{t('dashboard.myAccounts')}</h2>
          <Link to="/accounts" className="text-sm text-primary-600 hover:text-primary-700 flex items-center font-medium">
            {t('dashboard.viewAllAccounts')}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        
        {accounts.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <CreditCard className="h-6 w-6 text-neutral-400" />
              </div>
              <p className="text-neutral-500 mb-2">{t('dashboard.noAccounts')}</p>
              <Link to="/accounts">
                <Button variant="outline" size="sm">
                  {t('dashboard.addFirstAccount')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <Card
                key={account.id}
                hoverable
                className={`relative ${account.isDefault ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
              >
                {account.isDefault && (
                  <div className="absolute -top-2 -right-2 bg-primary-500 text-white rounded-full p-1.5 shadow-md">
                    <Star className="h-3 w-3 fill-current" />
                  </div>
                )}
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-600 flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-neutral-400" />
                    {account.name}
                  </CardTitle>
                  {account.isDefault && (
                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                      {t('common.default')}
                    </span>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-neutral-900 tabular-nums">
                    {formatCurrency(accountBalances[account.id] ?? account.balance)}
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">{account.currency}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
                      {formatCurrency(transaction.amount)}
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
