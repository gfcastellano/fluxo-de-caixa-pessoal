import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import {
  getMonthlySummary,
  getCategoryBreakdown,
  getTrendData,
} from '../services/reportService';
import { getAccounts } from '../services/accountService';
import { getTransactions } from '../services/transactionService';
import { getCategories } from '../services/categoryService';
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
    { month: string; income: number; expenses: number; projectedBalance: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(getCurrentMonth().year);
  const [month, setMonth] = useState(getCurrentMonth().month);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [calculatedBalance, setCalculatedBalance] = useState<number>(0);
  const [totalAccountBalance, setTotalAccountBalance] = useState<number>(0);
  const [monthlyBalance, setMonthlyBalance] = useState<number>(0);

  // Get unique currencies from accounts
  const availableCurrencies = useMemo(() => {
    const currencies = new Set(accounts.map(account => account.currency));
    return Array.from(currencies).sort();
  }, [accounts]);

  // Get filtered accounts based on selected currency
  const filteredAccounts = useMemo(() => {
    if (!selectedCurrency) return accounts;
    return accounts.filter(account => account.currency === selectedCurrency);
  }, [accounts, selectedCurrency]);

  // Get account IDs for the selected currency (for API filtering)
  const filteredAccountIds = useMemo(() => {
    return filteredAccounts.map(account => account.id);
  }, [filteredAccounts]);

  // Helper function to get translated category name
  const getTranslatedCategoryName = (categoryName: string): string => {
    const translationKey = getCategoryTranslationKey(categoryName);
    return translationKey ? t(translationKey) : categoryName;
  };

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (user && accounts.length > 0) {
      // Set default currency if not set and currencies are available
      if (!selectedCurrency && availableCurrencies.length > 0) {
        setSelectedCurrency(availableCurrencies[0]);
      }
      loadData();
    }
  }, [user, year, month, selectedAccountId, selectedCurrency, accounts]);

  useEffect(() => {
    if (user && accounts.length > 0) {
      loadCalculatedBalance();
      loadTotalAccountBalance();
    }
  }, [user, selectedAccountId, selectedCurrency, accounts, year, month]);

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
      // If a specific account is selected, use that
      // Otherwise, if a currency is selected, we need to aggregate data from all accounts with that currency
      const accountId = selectedAccountId || undefined;

      // Fetch summary and breakdown data
      const [summaryData, expenseData, incomeData] = await Promise.all([
        getMonthlySummary(user!.uid, year, month, accountId),
        getCategoryBreakdown(user!.uid, year, month, 'expense', accountId),
        getCategoryBreakdown(user!.uid, year, month, 'income', accountId),
      ]);

      // Filter breakdown data by currency if a currency is selected and no specific account
      if (selectedCurrency && !selectedAccountId) {
        // When currency is selected but no specific account, we need to fetch transactions
        // for all accounts with that currency and calculate category breakdowns client-side
        const accountIdsInCurrency = new Set(filteredAccountIds);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        // Fetch transactions and categories for all accounts with the selected currency
        const [allTransactions, categories] = await Promise.all([
          Promise.all(
            Array.from(accountIdsInCurrency).map(accountId =>
              getTransactions(user!.uid, { startDate, endDate, accountId })
            )
          ).then(results => results.flat()),
          getCategories(user!.uid),
        ]);

        // Create category map for lookup
        const categoryMap = new Map(categories.map(c => [c.id, c]));

        // Calculate expense breakdown from filtered transactions
        const expenseTransactions = allTransactions.filter(t => t.type === 'expense');
        const expenseCategoryTotals = new Map<string, number>();
        expenseTransactions.forEach(t => {
          const current = expenseCategoryTotals.get(t.categoryId) || 0;
          expenseCategoryTotals.set(t.categoryId, current + t.amount);
        });
        const totalExpenses = Array.from(expenseCategoryTotals.values()).reduce((sum, amount) => sum + amount, 0);
        const filteredExpenseBreakdown: CategoryBreakdown[] = Array.from(expenseCategoryTotals.entries())
          .map(([categoryId, amount]) => {
            const category = categoryMap.get(categoryId);
            return {
              categoryId,
              categoryName: category?.name || 'Unknown',
              categoryColor: category?.color || '#999999',
              amount,
              percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
            };
          })
          .sort((a, b) => b.amount - a.amount);

        // Calculate income breakdown from filtered transactions
        const incomeTransactions = allTransactions.filter(t => t.type === 'income');
        const incomeCategoryTotals = new Map<string, number>();
        incomeTransactions.forEach(t => {
          const current = incomeCategoryTotals.get(t.categoryId) || 0;
          incomeCategoryTotals.set(t.categoryId, current + t.amount);
        });
        const totalIncome = Array.from(incomeCategoryTotals.values()).reduce((sum, amount) => sum + amount, 0);
        const filteredIncomeBreakdown: CategoryBreakdown[] = Array.from(incomeCategoryTotals.entries())
          .map(([categoryId, amount]) => {
            const category = categoryMap.get(categoryId);
            return {
              categoryId,
              categoryName: category?.name || 'Unknown',
              categoryColor: category?.color || '#999999',
              amount,
              percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
            };
          })
          .sort((a, b) => b.amount - a.amount);

        setExpenseBreakdown(filteredExpenseBreakdown);
        setIncomeBreakdown(filteredIncomeBreakdown);

        // Calculate summary from filtered transactions for the selected currency
        const filteredIncome = allTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        const filteredExpenses = allTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        const filteredSummary: MonthlySummary = {
          income: filteredIncome,
          expenses: filteredExpenses,
          balance: filteredIncome - filteredExpenses,
          month: `${year}-${String(month).padStart(2, '0')}`,
          year: year,
        };
        setSummary(filteredSummary);
      } else {
        setExpenseBreakdown(expenseData);
        setIncomeBreakdown(incomeData);
        setSummary(summaryData);
      }

      // Fetch trend data - handle currency filtering by aggregating multiple account trends
      let trend: { month: string; income: number; expenses: number }[] = [];

      if (selectedCurrency && !selectedAccountId) {
        // When currency is selected but no specific account, fetch trend for each account with that currency
        // and aggregate the results
        const accountsWithCurrency = accounts.filter(a => a.currency === selectedCurrency);

        if (accountsWithCurrency.length > 0) {
          // Fetch trend data for each account
          const trendPromises = accountsWithCurrency.map(account =>
            getTrendData(user!.uid, year, 1, year, 12, account.id)
          );

          const trendsPerAccount = await Promise.all(trendPromises);

          // Aggregate trends by month
          const monthlyData = new Map<string, { income: number; expenses: number }>();

          trendsPerAccount.forEach(accountTrend => {
            accountTrend.forEach(monthData => {
              const existing = monthlyData.get(monthData.month) || { income: 0, expenses: 0 };
              monthlyData.set(monthData.month, {
                income: existing.income + monthData.income,
                expenses: existing.expenses + monthData.expenses,
              });
            });
          });

          // Convert map to array and sort by month
          trend = Array.from(monthlyData.entries())
            .map(([month, data]) => ({
              month,
              income: data.income,
              expenses: data.expenses,
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
        } else {
          // No accounts with selected currency, return empty trend
          trend = [];
        }
      } else {
        // Use the standard trend data fetch (either all accounts or specific account)
        trend = await getTrendData(
          user!.uid,
          year,
          1,
          year,
          12,
          accountId
        );
      }

      // Calculate projected balance for each month
      // Get stored balance for the filtered accounts
      let accountsToCalculate = accounts;
      if (selectedAccountId) {
        accountsToCalculate = accounts.filter(a => a.id === selectedAccountId);
      } else if (selectedCurrency) {
        accountsToCalculate = accounts.filter(a => a.currency === selectedCurrency);
      }
      const storedBalance = accountsToCalculate.reduce((sum, account) => sum + account.balance, 0);

      // Calculate cumulative projected balance for each month
      let runningBalance = storedBalance;
      const trendWithProjectedBalance = trend.map(monthData => {
        const monthlyNetBalance = monthData.income - monthData.expenses;
        runningBalance += monthlyNetBalance;
        return {
          ...monthData,
          projectedBalance: runningBalance,
        };
      });

      setTrendData(trendWithProjectedBalance);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCalculatedBalance = async () => {
    if (!user) return;

    try {
      // Get accounts to calculate stored balance
      let accountsToCalculate = accounts;
      if (selectedAccountId) {
        accountsToCalculate = accounts.filter(a => a.id === selectedAccountId);
      } else if (selectedCurrency) {
        accountsToCalculate = accounts.filter(a => a.currency === selectedCurrency);
      }

      // Calculate stored balance (sum of account balances)
      const storedBalance = accountsToCalculate.reduce((sum, account) => sum + account.balance, 0);

      // Find the earliest balanceDate among the accounts we're calculating for
      // This is the date from which we need to start calculating monthly balances
      const balanceDates = accountsToCalculate
        .map(a => a.balanceDate)
        .filter((date): date is string => !!date);

      // If no balance dates exist, use the earliest possible date
      const earliestBalanceDate = balanceDates.length > 0
        ? balanceDates.reduce((earliest, current) => current < earliest ? current : earliest)
        : '1970-01-01';

      // Calculate the end date (last day of the current selected month)
      const currentMonthEndDate = `${year}-${String(month).padStart(2, '0')}-31`;

      // Import getTransactions
      const { getTransactions } = await import('../services/transactionService');

      // Fetch ALL transactions from balanceDate up to the end of the current month
      const transactions = await getTransactions(user.uid, {
        startDate: earliestBalanceDate,
        endDate: currentMonthEndDate,
        accountId: selectedAccountId || undefined,
      });

      // If currency filter is applied (but not specific account), filter by account IDs
      let filteredTransactions = transactions;
      if (selectedCurrency && !selectedAccountId) {
        const accountIdsInCurrency = new Set(accountsToCalculate.map(a => a.id));
        filteredTransactions = transactions.filter(t => t.accountId && accountIdsInCurrency.has(t.accountId));
      }

      // Group transactions by month and calculate net balance for each month
      const monthlyNetBalances = new Map<string, number>();

      filteredTransactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;

        const currentBalance = monthlyNetBalances.get(monthKey) || 0;
        const transactionAmount = transaction.type === 'income' ? transaction.amount : -transaction.amount;
        monthlyNetBalances.set(monthKey, currentBalance + transactionAmount);
      });

      // Sum all monthly net balances
      const totalMonthlyNetBalance = Array.from(monthlyNetBalances.values())
        .reduce((sum, balance) => sum + balance, 0);

      // Calculate: stored balance + sum of all monthly net balances
      const calculatedBalance = storedBalance + totalMonthlyNetBalance;

      setCalculatedBalance(calculatedBalance);
    } catch (error) {
      console.error('Error loading calculated balance:', error);
    }
  };

  const loadTotalAccountBalance = async () => {
    if (!user) return;

    try {
      // Get accounts to calculate based on filter
      let accountsToCalculate = accounts;
      if (selectedAccountId) {
        accountsToCalculate = accounts.filter(a => a.id === selectedAccountId);
      } else if (selectedCurrency) {
        accountsToCalculate = accounts.filter(a => a.currency === selectedCurrency);
      }

      // Calculate stored balance (sum of account balances)
      const storedBalance = accountsToCalculate.reduce((sum, account) => sum + account.balance, 0);

      // Find the earliest balanceDate among the accounts we're calculating for
      const balanceDates = accountsToCalculate
        .map(a => a.balanceDate)
        .filter((date): date is string => !!date);

      // If no balance dates exist, use the earliest possible date
      const earliestBalanceDate = balanceDates.length > 0
        ? balanceDates.reduce((earliest, current) => current < earliest ? current : earliest)
        : '1970-01-01';

      // Calculate the end date (last day of the month BEFORE the current selected month)
      // This gives us the balance at the start of the current month
      let previousYear = year;
      let previousMonth = month - 1;
      if (previousMonth === 0) {
        previousMonth = 12;
        previousYear = year - 1;
      }
      const previousMonthEndDate = `${previousYear}-${String(previousMonth).padStart(2, '0')}-31`;

      // Import getTransactions
      const { getTransactions } = await import('../services/transactionService');

      // Fetch ALL transactions from balanceDate up to the end of the previous month
      const transactions = await getTransactions(user.uid, {
        startDate: earliestBalanceDate,
        endDate: previousMonthEndDate,
        accountId: selectedAccountId || undefined,
      });

      // If currency filter is applied (but not specific account), filter by account IDs
      let filteredTransactions = transactions;
      if (selectedCurrency && !selectedAccountId) {
        const accountIdsInCurrency = new Set(accountsToCalculate.map(a => a.id));
        filteredTransactions = transactions.filter(t => t.accountId && accountIdsInCurrency.has(t.accountId));
      }

      // Calculate total net balance from all transactions up to end of previous month
      const totalNetBalance = filteredTransactions.reduce((sum, transaction) => {
        const transactionAmount = transaction.type === 'income' ? transaction.amount : -transaction.amount;
        return sum + transactionAmount;
      }, 0);

      // Calculate: stored balance + sum of all net balances up to previous month
      // This gives us the balance at the START of the current month
      const monthStartBalance = storedBalance + totalNetBalance;

      setTotalAccountBalance(monthStartBalance);
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

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
    // Clear account selection when currency changes
    setSelectedAccountId('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:gap-6 gap-4 sm:p-6 p-4 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 lg:gap-4">
        <h1 className="text-lg lg:text-2xl font-bold text-ink">{t('reports.title')}</h1>
        <div className="flex flex-wrap gap-2 lg:gap-3">
          {/* Currency Filter Toggle Buttons */}
          {availableCurrencies.length > 0 && (
            <div className="flex items-center gap-0.5 lg:gap-1 bg-white/50 backdrop-blur-sm p-0.5 lg:p-1 rounded-lg lg:rounded-xl border border-white/40">
              {availableCurrencies.map((currency) => (
                <Button
                  key={currency}
                  variant={selectedCurrency === currency ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleCurrencyChange(currency)}
                  className="text-[10px] lg:text-xs px-2 lg:px-3 py-1 h-7 lg:h-8"
                >
                  {currency}
                </Button>
              ))}
            </div>
          )}
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="rounded-lg lg:rounded-xl border border-white/40 bg-white/50 backdrop-blur-sm px-2 lg:px-3 py-1 lg:py-2 text-xs lg:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue h-7 lg:h-auto"
          >
            <option value="" className="text-ink">{t('reports.allAccounts')}</option>
            {filteredAccounts.map((account) => (
              <option key={account.id} value={account.id} className="text-ink">
                {account.name} ({account.currency})
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded-lg lg:rounded-xl border border-white/40 bg-white/50 backdrop-blur-sm px-2 lg:px-3 py-1 lg:py-2 text-xs lg:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue h-7 lg:h-auto"
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y} className="text-ink">
                {y}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-0.5 lg:gap-1 bg-white/50 backdrop-blur-sm p-0.5 lg:p-1 rounded-lg lg:rounded-xl border border-white/40">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handlePreviousMonth}
              aria-label={t('reports.previousMonth')}
              className="h-6 w-6 lg:h-8 lg:w-8"
            >
              <ChevronLeft className="h-3 w-3 lg:h-4 lg:w-4" />
            </Button>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="bg-transparent border-none text-xs lg:text-sm text-ink focus:outline-none cursor-pointer py-0.5 lg:py-1"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m} className="text-ink">
                  {new Date(2000, m - 1).toLocaleString('default', {
                    month: 'short',
                  })}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleNextMonth}
              aria-label={t('reports.nextMonth')}
              className="h-6 w-6 lg:h-8 lg:w-8"
            >
              <ChevronRight className="h-3 w-3 lg:h-4 lg:w-4" />
            </Button>
          </div>
          <Button 
            variant="secondary" 
            onClick={handleExport} 
            leftIcon={<Download className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />}
            className="text-xs lg:text-sm px-2 lg:px-4 py-1 lg:py-2 h-7 lg:h-auto whitespace-nowrap"
          >
            {t('common.save')}
          </Button>
        </div>
      </div>

      {/* Linha 1: Cards de Receita e Despesa com gráficos internos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Card de Receita com Composição */}
        <Card className="bg-white/40 backdrop-blur-xl border-white/60 border-l-4 border-l-emerald">
          <CardHeader className="pb-2 lg:pb-4">
            <div className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs lg:text-sm font-medium text-slate">
                  {t('common.income')}
                </CardTitle>
                <div className="text-lg lg:text-2xl font-bold text-emerald mt-1">
                  {formatCurrency(summary?.income || 0, selectedCurrency || 'BRL')}
                </div>
              </div>
              <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-emerald flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="border-t border-white/30 pt-4 mt-2">
              <h4 className="text-xs lg:text-sm font-medium text-ink mb-3">{t('reports.incomeComposition')}</h4>
              {incomeBreakdown.length === 0 ? (
                <p className="text-slate text-center py-4 lg:py-6 text-xs lg:text-sm">{t('reports.noData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={incomeBreakdown.slice(0, 5)} layout="vertical" margin={{ left: -20, right: 20, top: 5, bottom: 5 }} barSize={24}>
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="categoryName" 
                      width={90}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        const translated = getTranslatedCategoryName(value);
                        return translated.length > 14 ? translated.slice(0, 14) + '...' : translated;
                      }}
                      interval={0}
                    />
                    <Tooltip
                      formatter={(value, name, props) => {
                        const categoryName = props?.payload?.categoryName || name;
                        const translatedName = getTranslatedCategoryName(categoryName);
                        return [formatCurrency(Number(value), selectedCurrency || 'BRL'), translatedName];
                      }}
                      contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.5)', fontSize: '12px' }}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {incomeBreakdown.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.categoryColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card de Despesas com Categorias */}
        <Card className="bg-white/40 backdrop-blur-xl border-white/60 border-l-4 border-l-rose">
          <CardHeader className="pb-2 lg:pb-4">
            <div className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs lg:text-sm font-medium text-slate">
                  {t('common.expense')}
                </CardTitle>
                <div className="text-lg lg:text-2xl font-bold text-rose mt-1">
                  {formatCurrency(summary?.expenses || 0, selectedCurrency || 'BRL')}
                </div>
              </div>
              <TrendingDown className="h-5 w-5 lg:h-6 lg:w-6 text-rose flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="border-t border-white/30 pt-4 mt-2">
              <h4 className="text-xs lg:text-sm font-medium text-ink mb-3">{t('reports.expensesByCategory')}</h4>
              {expenseBreakdown.length === 0 ? (
                <p className="text-slate text-center py-4 lg:py-6 text-xs lg:text-sm">{t('reports.noData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={expenseBreakdown.slice(0, 5)} layout="vertical" margin={{ left: -20, right: 20, top: 5, bottom: 5 }} barSize={24}>
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="categoryName" 
                      width={90}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        const translated = getTranslatedCategoryName(value);
                        return translated.length > 14 ? translated.slice(0, 14) + '...' : translated;
                      }}
                      interval={0}
                    />
                    <Tooltip
                      formatter={(value, name, props) => {
                        const categoryName = props?.payload?.categoryName || name;
                        const translatedName = getTranslatedCategoryName(categoryName);
                        return [formatCurrency(Number(value), selectedCurrency || 'BRL'), translatedName];
                      }}
                      contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.5)', fontSize: '12px' }}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {expenseBreakdown.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.categoryColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Cards de Saldo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <Card hoverable className="bg-white/40 backdrop-blur-xl border-white/60" style={{ borderLeftWidth: '4px', borderLeftColor: monthlyBalance >= 0 ? `rgba(34, 197, 94, ${Math.min(Math.abs(monthlyBalance) / 10000 + 0.3, 1)})` : `rgba(255, 92, 138, ${Math.min(Math.abs(monthlyBalance) / 10000 + 0.3, 1)})` }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 lg:pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-slate truncate">
              {t('reports.monthlyBalance')}
            </CardTitle>
            <Calendar className={`h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0 ${monthlyBalance >= 0 ? 'text-emerald' : 'text-rose'}`} />
          </CardHeader>
          <CardContent className="pt-0">
            <div
              className={`text-base lg:text-xl font-bold truncate ${monthlyBalance >= 0 ? 'text-emerald' : 'text-rose'
                }`}
            >
              {formatCurrency(monthlyBalance, selectedCurrency || 'BRL')}
            </div>
          </CardContent>
        </Card>

        <Card hoverable className="bg-white/40 backdrop-blur-xl border-white/60" style={{ borderLeftWidth: '4px', borderLeftColor: `rgba(141, 153, 174, ${Math.min(Math.abs(totalAccountBalance) / 20000 + 0.3, 1)})` }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 lg:pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-slate truncate">
              {t('reports.totalBalance')}
            </CardTitle>
            <PiggyBank className="h-3 w-3 lg:h-4 lg:w-4 text-slate flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-base lg:text-xl font-bold text-slate truncate">
              {formatCurrency(totalAccountBalance, selectedCurrency || 'BRL')}
            </div>
          </CardContent>
        </Card>

        <Card hoverable className="bg-white/40 backdrop-blur-xl border-white/60" style={{ borderLeftWidth: '4px', borderLeftColor: `rgba(255, 190, 11, ${Math.min(Math.abs(calculatedBalance) / 20000 + 0.3, 1)})` }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 lg:pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-slate truncate">
              {t('reports.calculatedBalance')}
            </CardTitle>
            <Calculator className="h-3 w-3 lg:h-4 lg:w-4 text-amber flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-base lg:text-xl font-bold text-amber truncate">
              {formatCurrency(calculatedBalance, selectedCurrency || 'BRL')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card className="bg-white/40 backdrop-blur-xl border-white/60">
        <CardHeader className="pb-2 lg:pb-4">
          <CardTitle className="text-sm lg:text-base text-ink">{t('reports.monthlyTrend')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-light, #E2E8F0)" />
              <XAxis 
                dataKey="month" 
                stroke="var(--color-slate, #64748B)"
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => {
                  const [year, month] = value.split('-');
                  return `${month}/${year.slice(2)}`;
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="var(--color-slate, #64748B)"
                tick={{ fontSize: 10 }}
                width={50}
                tickFormatter={(value) =>
                  new Intl.NumberFormat('pt-BR', {
                    notation: 'compact',
                    maximumFractionDigits: 0,
                  }).format(value)
                }
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value), selectedCurrency || 'BRL')}
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.5)', fontSize: '12px' }}
                labelStyle={{ fontSize: '12px' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconSize={8}
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10B981"
                name={t('common.income')}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#F43F5E"
                name={t('common.expense')}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="projectedBalance"
                stroke="#F59E0B"
                strokeWidth={2}
                name={t('reports.projectedBalance')}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
