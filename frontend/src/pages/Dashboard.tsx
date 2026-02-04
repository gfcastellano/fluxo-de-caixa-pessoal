import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useUserSetup } from '../hooks/useUserSetup';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { formatCurrency, formatMonthYear, getCurrentMonth } from '../utils/format';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import { getMonthlySummary } from '../services/reportService';
import { getTransactions } from '../services/transactionService';
import { getAccounts } from '../services/accountService';
import type { MonthlySummary, Transaction, Account } from '../types';
import { TrendingUp, TrendingDown, Wallet, Plus, CreditCard, ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { user } = useAuth();
  useUserSetup();
  const { t } = useTranslation();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-500">{formatMonthYear(year, month)}</p>
        </div>
        <Link to="/transactions">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('transactions.addNew')}
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('dashboard.totalIncome')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.income || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('dashboard.totalExpenses')}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary?.expenses || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('dashboard.currentBalance')}
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (summary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(summary?.balance || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.myAccounts')}</h2>
          <Link to="/accounts" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
            {t('dashboard.viewAllAccounts')}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">{t('dashboard.noAccounts')}</p>
              <Link to="/accounts" className="text-primary-600 hover:underline mt-2 inline-block">
                {t('dashboard.addFirstAccount')}
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <Card
                key={account.id}
                className={`relative ${account.isDefault ? 'ring-2 ring-primary-500' : ''}`}
              >
                {account.isDefault && (
                  <div className="absolute -top-2 -right-2 bg-primary-500 text-white rounded-full p-1">
                    <Star className="h-3 w-3 fill-current" />
                  </div>
                )}
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    {account.name}
                    {account.isDefault && (
                      <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                        {t('common.default')}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(account.balance)}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{account.currency}</p>
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
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {t('dashboard.noTransactions')}.{' '}
              <Link to="/transactions" className="text-primary-600 hover:underline">
                {t('transactions.addFirst')}
              </Link>
            </p>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {transaction.description}
                    </p>
                    <p className="text-sm text-gray-500">
                      {transaction.category ? t(getTranslatedCategoryName(transaction.category.name)) : t('common.category')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        transaction.type === 'income'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-gray-500">
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
