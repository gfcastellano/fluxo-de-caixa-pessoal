import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import {
  getMonthlySummary,
  getCategoryBreakdown,
  getTrendData,
} from '../services/reportService';
import { getAccounts, calculateAccountBalance, calculateTotalBalance } from '../services/accountService';
import type { MonthlySummary, CategoryBreakdown, Account } from '../types';
import { formatCurrency, formatMonthYear, getCurrentMonth } from '../utils/format';
import { getCategoryTranslationKey } from '../utils/categoryTranslations';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { Download, TrendingUp, TrendingDown, Calendar, PiggyBank, Calculator, ChevronLeft, ChevronRight } from 'lucide-react';

export function Reports() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [expenseBreakdown, setExpenseBreakdown] = useState<CategoryBreakdown[]>(
    []
  );
  const [incomeBreakdown, setIncomeBreakdown] = useState<CategoryBreakdown[]>(
    []
  );
  const [trendData, setTrendData] = useState<
    { month: string; income: number; expenses: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(getCurrentMonth().year);
  const [month, setMonth] = useState(getCurrentMonth().month);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [calculatedBalance, setCalculatedBalance] = useState<number>(0);
  const [totalAccountBalance, setTotalAccountBalance] = useState<number>(0);
  const [monthlyBalance, setMonthlyBalance] = useState<number>(0);

  // Helper function to get translated category name
  const getTranslatedCategoryName = (categoryName: string): string => {
    const translationKey = getCategoryTranslationKey(categoryName);
    return translationKey ? t(translationKey) : categoryName;
  };

  useEffect(() => {
    if (user) {
      loadAccounts();
      loadData();
    }
  }, [user, year, month]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [selectedAccountId]);

  useEffect(() => {
    if (user) {
      loadCalculatedBalance();
      loadTotalAccountBalance();
    }
  }, [user, selectedAccountId, accounts]);

  useEffect(() => {
    // Calculate monthly balance from summary data
    if (summary) {
      setMonthlyBalance(summary.income - summary.expenses);
    }
  }, [summary]);

  const loadAccounts = async () => {
    try {
      const accountsData = await getAccounts(user!.uid);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const accountId = selectedAccountId || undefined;
      const [summaryData, expenseData, incomeData, trend] = await Promise.all([
        getMonthlySummary(user!.uid, year, month, accountId),
        getCategoryBreakdown(user!.uid, year, month, 'expense', accountId),
        getCategoryBreakdown(user!.uid, year, month, 'income', accountId),
        getTrendData(
          user!.uid,
          year,
          1,
          year,
          12,
          accountId
        ),
      ]);
      setSummary(summaryData);
      setExpenseBreakdown(expenseData);
      setIncomeBreakdown(incomeData);
      setTrendData(trend);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCalculatedBalance = async () => {
    if (!user) return;
    
    try {
      if (selectedAccountId) {
        // Calculate balance for specific account
        const balance = await calculateAccountBalance(selectedAccountId, user.uid);
        setCalculatedBalance(balance);
      } else {
        // Calculate total balance across all accounts
        const totalBalance = await calculateTotalBalance(user.uid);
        setCalculatedBalance(totalBalance);
      }
    } catch (error) {
      console.error('Error loading calculated balance:', error);
    }
  };

  const loadTotalAccountBalance = async () => {
    if (!user) return;
    
    try {
      // Get total balance across all accounts (stored balance without transaction adjustments)
      const accountsData = await getAccounts(user.uid);
      const total = accountsData.reduce((sum, account) => sum + account.balance, 0);
      setTotalAccountBalance(total);
    } catch (error) {
      console.error('Error loading total account balance:', error);
    }
  };

  const handleExport = () => {
    const data = {
      month: formatMonthYear(year, month),
      summary,
      expenseBreakdown,
      incomeBreakdown,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${year}-${String(month).padStart(2, '0')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="" className="text-neutral-900">{t('reports.allAccounts')}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id} className="text-neutral-900">
                {account.name}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
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
              aria-label={t('reports.previousMonth')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
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
              aria-label={t('reports.nextMonth')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="secondary" onClick={handleExport} leftIcon={<Download className="h-4 w-4 flex-shrink-0" />}>
            {t('common.save')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('common.income')}
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
              {t('common.expense')}
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
              {t('reports.monthlyBalance')}
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                monthlyBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(monthlyBalance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('reports.totalBalance')}
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalAccountBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(totalAccountBalance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('reports.calculatedBalance')}
            </CardTitle>
            <Calculator className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                calculatedBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(calculatedBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.expensesByCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('reports.noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) =>
                      `${getTranslatedCategoryName((entry as unknown as CategoryBreakdown).categoryName)}: ${(entry as unknown as CategoryBreakdown).percentage.toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.categoryColor} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => {
                      const categoryName = props?.payload?.categoryName || name;
                      const translatedName = getTranslatedCategoryName(categoryName);
                      return [formatCurrency(Number(value)), translatedName];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Income Composition */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.incomeComposition')}</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeBreakdown.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('reports.noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incomeBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) =>
                      `${getTranslatedCategoryName((entry as unknown as CategoryBreakdown).categoryName)}: ${(entry as unknown as CategoryBreakdown).percentage.toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {incomeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.categoryColor} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => {
                      const categoryName = props?.payload?.categoryName || name;
                      const translatedName = getTranslatedCategoryName(categoryName);
                      return [formatCurrency(Number(value)), translatedName];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.monthlyTrend')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value) =>
                  new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    notation: 'compact',
                  }).format(value)
                }
              />
              <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#22c55e"
                name={t('common.income')}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                name={t('common.expense')}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
