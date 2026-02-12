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
import { getCreditCards } from '../services/creditCardService';
import { getTransactions, getAllTransactionsWithRecurring } from '../services/transactionService';
import { getFamilyTransactions } from '../services/familyService';
import { getCategories } from '../services/categoryService';
import type { MonthlySummary, CategoryBreakdown, Account, CreditCard, Transaction } from '../types';
import { formatCurrency, formatMonthYear, getCurrentMonth } from '../utils/format';
import { getCategoryTranslationKey, getTranslatedCategoryName } from '../utils/categoryTranslations';
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
  ReferenceLine,
} from 'recharts';
import { Download, TrendingUp, TrendingDown, Calendar, PiggyBank, Calculator, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { PageDescription } from '../components/PageDescription';
import { useFamily } from '../context/FamilyContext';
import { Users } from 'lucide-react';
import { cn } from '../utils/cn';

export function Reports() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { viewMode, sharedData, activeFamily } = useFamily();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [familySummary, setFamilySummary] = useState<MonthlySummary | null>(null);
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
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [calculatedBalance, setCalculatedBalance] = useState<number>(0);
  const [totalAccountBalance, setTotalAccountBalance] = useState<number>(0);
  const [monthlyBalance, setMonthlyBalance] = useState<number>(0);
  const [periodTransactions, setPeriodTransactions] = useState<Transaction[]>([]);
  const [categoriesState, setCategoriesState] = useState<any[]>([]);

  // Helper function to translate category name using the context's t function
  const translateCategory = (name: string): string => {
    const key = getCategoryTranslationKey(name);
    return key ? t(key) : name;
  };

  // Custom Tooltip component for the bar charts
  const CategoryTooltip = ({ active, payload, transactions, currency, t }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const categoryId = data.categoryId;
      const isIncomingTransfer = categoryId === 'incoming-transfer';
      const isOutgoingTransfer = categoryId === 'outgoing-transfer';

      // Filter transactions for this category
      const categoryTxs = transactions
        .filter((tx: Transaction) => {
          if (isIncomingTransfer) {
            return tx.type === 'transfer' && tx.toAccountId && filteredAccountIds.includes(tx.toAccountId);
          }
          if (isOutgoingTransfer) {
            return tx.type === 'transfer' && tx.accountId && filteredAccountIds.includes(tx.accountId);
          }
          // For regular categories, ensure ID match and prefer strict category association
          return tx.categoryId === categoryId;
        })
        .sort((a: Transaction, b: Transaction) => b.amount - a.amount)
        .slice(0, 10);

      return (
        <div className="bg-white/95 backdrop-blur-xl p-4 rounded-2xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.1)] min-w-[280px] animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-3 border-b border-slate/10 pb-2">
            <div className="flex flex-col">
              <span className="font-bold text-ink text-sm tracking-tight">{translateCategory(data.categoryName)}</span>
              <span className="text-[10px] text-slate font-medium uppercase tracking-wider">{t('reports.composition')}</span>
            </div>
            <span className="font-black text-ink text-base">
              {formatCurrency(data.amount, currency)}
            </span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {categoryTxs.map((tx: Transaction) => (
              <div key={tx.id} className="flex items-center justify-between text-[11px] gap-4 group">
                <div className="flex flex-col flex-grow truncate">
                  <span className="text-ink font-semibold truncate group-hover:text-blue transition-colors">{tx.description}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate/60 text-[9px] font-medium">{new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                    {tx.type === 'transfer' && (
                      <span className="text-blue/60 text-[8px] border border-blue/20 rounded px-1 scale-90">Transf.</span>
                    )}
                  </div>
                </div>
                <span className={`font-bold whitespace-nowrap tabular-nums ${tx.type === 'income' ? 'text-emerald' : tx.type === 'expense' ? 'text-rose' : 'text-blue'}`}>
                  {formatCurrency(tx.amount, currency)}
                </span>
              </div>
            ))}
            {categoryTxs.length === 0 && (
              <p className="text-[11px] text-slate italic py-2 text-center bg-slate/5 rounded-lg">{t('reports.noData')}</p>
            )}
            {transactions.filter((tx: Transaction) => tx.categoryId === categoryId).length > 10 && (
              <p className="text-[9px] text-slate/50 text-center pt-1 border-t border-slate/5 italic">
                + {transactions.filter((tx: Transaction) => tx.categoryId === categoryId).length - 10} {t('common.more')}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Get unique currencies from accounts and shared data
  const availableCurrencies = useMemo(() => {
    const currencies = new Set(accounts.map(account => account.currency));
    sharedData.forEach(member => {
      member.accounts?.forEach(acc => currencies.add(acc.currency));
    });
    return Array.from(currencies).sort();
  }, [accounts, sharedData]);

  // Get filtered accounts based on selected currency
  const filteredAccounts = useMemo(() => {
    if (!selectedCurrency) return accounts;
    return accounts.filter((account: Account) => account.currency === selectedCurrency);
  }, [accounts, selectedCurrency]);

  // Get account IDs for the selected currency (for API filtering)
  const filteredAccountIds = useMemo(() => {
    return filteredAccounts.map((account: Account) => account.id);
  }, [filteredAccounts]);



  // Chart gradient configuration
  const CHART_GRADIENT_COLORS = {
    positive: {
      start: '#10B981',
      end: '#059669',
    },
    warning: {
      start: '#F59E0B',
      end: '#D97706',
    },
    negative: {
      start: '#DC2626',
      end: '#991B1B',
    },
    zeroLine: '#94A3B8',
  };

  const WARNING_THRESHOLD_PERCENTAGE = 0.1; // 10% of max balance

  // Calculate warning threshold dynamically
  const warningThreshold = useMemo(() => {
    if (trendData.length === 0) return 0;
    const maxBalance = Math.max(...trendData.map(d => d.projectedBalance), 0);
    return maxBalance * WARNING_THRESHOLD_PERCENTAGE;
  }, [trendData]);

  // Custom dot component with conditional coloring
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const value = payload.projectedBalance;

    // Default color (green for positive values above warning threshold)
    let fillColor = '#10B981';
    let strokeColor = '#059669';

    if (value < 0) {
      // Red for negative values
      fillColor = '#EF4444';
      strokeColor = '#DC2626';
    } else if (value < warningThreshold) {
      // Strong orange for warning (approaching zero)
      fillColor = '#F97316';
      strokeColor = '#EA580C';
    }

    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2}
      />
    );
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
  }, [user, year, month, selectedAccountId, selectedCurrency, accounts, viewMode, activeFamily?.id]);

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
      const [accountsData, creditCardsData, categoriesData] = await Promise.all([
        getAccounts(user!.uid),
        getCreditCards(user!.uid),
        getCategories(user!.uid)
      ]);
      setAccounts(accountsData);
      // Wait for creditCardsData to be an array before setting state
      if (Array.isArray(creditCardsData)) {
        setCreditCards(creditCardsData);
      } else {
        setCreditCards([]);
      }
      setCategoriesState(categoriesData);
    } catch (error) {
      console.error('Error loading accounts, credit cards and categories:', error);
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

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      let allPeriodTransactions = await getTransactions(user!.uid, {
        startDate,
        endDate,
        accountId: selectedAccountId || undefined,
      });

      // Fetch shared transactions if in family mode
      if (viewMode === 'family' && activeFamily) {
        try {
          const familyResponse = await getFamilyTransactions(activeFamily.id, {
            startDate,
            endDate
          });

          if (familyResponse.success && familyResponse.data) {
            const familyTxs = familyResponse.data.map((tx: any) => ({
              ...tx,
              categoryId: tx.type === 'expense' ? 'shared-expense' : 'shared-income',
              isShared: true,
              ownerName: sharedData.find(m => m.ownerUserId === tx.ownerUserId)?.ownerDisplayName || 'Unknown'
            }));

            // 1. Merge for list view
            allPeriodTransactions = [...allPeriodTransactions, ...familyTxs];

            // 2. Update Summary
            const sharedIncome = familyTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const sharedExpense = familyTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

            setFamilySummary({
              income: sharedIncome,
              expenses: sharedExpense,
              balance: sharedIncome - sharedExpense,
              month: `${year}-${String(month).padStart(2, '0')}`,
              year: year,
            });

            if (summaryData) {
              summaryData.income += sharedIncome;
              summaryData.expenses += sharedExpense;
              summaryData.balance = summaryData.income - summaryData.expenses;
              setSummary(summaryData); // Update state with modified object
            }

            // 3. Update Breakdowns (Add "Shared" category)
            if (sharedExpense > 0) {
              expenseData.push({
                categoryId: 'shared-expense',
                categoryName: t('family.shared.label') || 'Compartilhado',
                categoryColor: '#8b5cf6',
                amount: sharedExpense,
                percentage: 0
              });
              // Recalculate percentages
              const totalExp = expenseData.reduce((s, c) => s + c.amount, 0);
              expenseData.forEach(c => c.percentage = (c.amount / totalExp) * 100);
            }

            if (sharedIncome > 0) {
              incomeData.push({
                categoryId: 'shared-income',
                categoryName: t('family.shared.label') || 'Compartilhado',
                categoryColor: '#8b5cf6',
                amount: sharedIncome,
                percentage: 0
              });
              // Recalculate percentages
              const totalInc = incomeData.reduce((s, c) => s + c.amount, 0);
              incomeData.forEach(c => c.percentage = (c.amount / totalInc) * 100);
            }
          }
        } catch (err) {
          console.error('Failed to load family transactions for report', err);
        }
      }

      // Filter translations by currency if a currency is selected and no specific account
      if (selectedCurrency && !selectedAccountId) {
        // When currency is selected but no specific account, we need to filter transactions
        // for all accounts with that currency
        const accountIdsInCurrency = new Set(filteredAccounts.map(a => a.id));

        // Add shared accounts that match the currency
        sharedData.forEach(member => {
          member.accounts?.forEach(acc => {
            if (acc.currency === selectedCurrency) {
              accountIdsInCurrency.add(acc.id);
            }
          });
        });

        const creditCardIdsInCurrency = new Set(
          creditCards
            .filter(card => {
              const linkedAccount = accounts.find(a => a.id === card.linkedAccountId);
              return linkedAccount?.currency === selectedCurrency;
            })
            .map(card => card.id)
        );

        // Add shared cards if their linked account matches the currency
        sharedData.forEach(member => {
          member.creditCards?.forEach(card => {
            // Find linked account (local or shared)
            const linkedLocal = accounts.find(a => a.id === (card as any).linkedAccountId);
            if (linkedLocal && linkedLocal.currency === selectedCurrency) {
              creditCardIdsInCurrency.add(card.id);
            } else {
              // Check shared accounts
              const linkedShared = sharedData.flatMap(m => m.accounts || []).find(a => a.id === (card as any).linkedAccountId);
              if (linkedShared && linkedShared.currency === selectedCurrency) {
                creditCardIdsInCurrency.add(card.id);
              }
            }
          });
        });

        const filteredTxs = allPeriodTransactions.filter(t =>
          (t.accountId && accountIdsInCurrency.has(t.accountId)) ||
          (t.creditCardId && creditCardIdsInCurrency.has(t.creditCardId))
        );

        setPeriodTransactions(filteredTxs);

        // Fetch categories for mapping names and colors in breakdown calculation
        const categories = await getCategories(user!.uid);
        const categoryMap = new Map(categories.map(c => [c.id, c]));

        // Calculate expense breakdown from filtered transactions (expenses + outgoing transfers)
        const expenseTransactions = filteredTxs.filter(t => t.type === 'expense' || t.type === 'transfer');
        const expenseCategoryTotals = new Map<string, number>();
        expenseTransactions.forEach(t => {
          const current = expenseCategoryTotals.get(t.categoryId) || 0;
          expenseCategoryTotals.set(t.categoryId, current + t.amount);
        });
        const totalExpenses = Array.from(expenseCategoryTotals.values()).reduce((sum, amount) => sum + amount, 0);
        const filteredExpenseBreakdown: CategoryBreakdown[] = Array.from(expenseCategoryTotals.entries())
          .map(([categoryId, amount]) => {
            const category = categoryMap.get(categoryId);
            const firstTx = expenseTransactions.find(t => t.categoryId === categoryId);
            return {
              categoryId,
              categoryName: category?.name || firstTx?.category?.name || 'Unknown',
              categoryColor: category?.color || firstTx?.category?.color || '#999999',
              amount,
              percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
            };
          })
          .sort((a, b) => b.amount - a.amount);

        // Calculate income breakdown from filtered transactions (income + incoming transfers)
        const incomeTransactions = filteredTxs.filter(t => t.type === 'income');
        const incomeCategoryTotals = new Map<string, number>();
        incomeTransactions.forEach(t => {
          const current = incomeCategoryTotals.get(t.categoryId) || 0;
          incomeCategoryTotals.set(t.categoryId, current + t.amount);
        });

        // For incoming transfers, we need to look at ALL transactions to find transfers TO these accounts
        const allUserTransactionsForPeriod = await getTransactions(user!.uid, { startDate, endDate });
        const incomingTransfersToTheseAccounts = allUserTransactionsForPeriod.filter(
          t => t.type === 'transfer' && t.toAccountId && accountIdsInCurrency.has(t.toAccountId)
        );

        // Add incoming transfers to income breakdown
        incomingTransfersToTheseAccounts.forEach(t => {
          const transferCategoryId = 'incoming-transfer';
          const current = incomeCategoryTotals.get(transferCategoryId) || 0;
          incomeCategoryTotals.set(transferCategoryId, current + t.amount);
        });

        const totalIncome = Array.from(incomeCategoryTotals.values()).reduce((sum, amount) => sum + amount, 0);
        const filteredIncomeBreakdown: CategoryBreakdown[] = Array.from(incomeCategoryTotals.entries())
          .map(([categoryId, amount]) => {
            const category = categoryMap.get(categoryId);
            const isTransferCategory = categoryId === 'incoming-transfer';
            const firstTx = incomeTransactions.find(t => t.categoryId === categoryId);
            return {
              categoryId,
              categoryName: isTransferCategory ? 'Transferências Recebidas' : (category?.name || firstTx?.category?.name || 'Unknown'),
              categoryColor: isTransferCategory ? '#10B981' : (category?.color || firstTx?.category?.color || '#999999'),
              amount,
              percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
            };
          })
          .sort((a, b) => b.amount - a.amount);

        setExpenseBreakdown(filteredExpenseBreakdown);
        setIncomeBreakdown(filteredIncomeBreakdown);

        // Calculate summary from filtered transactions for the selected currency
        const filteredIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0)
          + incomingTransfersToTheseAccounts.reduce((sum, t) => sum + t.amount, 0);
        const filteredExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

        const filteredSummary: MonthlySummary = {
          income: filteredIncome,
          expenses: filteredExpenses,
          balance: filteredIncome - filteredExpenses,
          month: `${year}-${String(month).padStart(2, '0')}`,
          year: year,
        };
        setSummary(filteredSummary);

        // Also update period transactions to include incoming transfers for the list view
        // Deduplicate transactions (transfers between accounts of same currency appear twice)
        const combinedTxs = [...filteredTxs, ...incomingTransfersToTheseAccounts];
        const uniqueTxs = Array.from(new Map(combinedTxs.map(tx => [tx.id, tx])).values());
        setPeriodTransactions(uniqueTxs);
      } else {
        setExpenseBreakdown(expenseData);
        setIncomeBreakdown(incomeData);
        setSummary(summaryData);

        if (selectedAccountId) {
          const allUserTransactionsForPeriod = await getTransactions(user!.uid, { startDate, endDate });
          const incomingTransfersToThisAccount = allUserTransactionsForPeriod.filter(
            t => t.type === 'transfer' && t.toAccountId === selectedAccountId
          );

          const combinedTxs = [...allPeriodTransactions, ...incomingTransfersToThisAccount];
          const uniqueTxs = Array.from(new Map(combinedTxs.map(tx => [tx.id, tx])).values());
          setPeriodTransactions(uniqueTxs);
        } else {
          setPeriodTransactions(allPeriodTransactions);
        }
      }

      // Fetch trend data - handle currency filtering by aggregating multiple account trends
      let trend: { month: string; income: number; expenses: number }[] = [];

      if (selectedCurrency && !selectedAccountId) {
        // When currency is selected but no specific account, fetch trend for each account with that currency
        // and aggregate the results, including incoming transfers and credit card transactions
        const accountsWithCurrency = accounts.filter(a => a.currency === selectedCurrency);
        const accountIdsInCurrency = new Set(accountsWithCurrency.map(a => a.id));
        const creditCardsWithCurrency = creditCards.filter(card => {
          const linkedAccount = accounts.find(a => a.id === card.linkedAccountId);
          return linkedAccount?.currency === selectedCurrency;
        });
        const creditCardIdsInCurrency = new Set(creditCardsWithCurrency.map(card => card.id));

        if (accountsWithCurrency.length > 0 || creditCardsWithCurrency.length > 0) {
          // Fetch trend data for each account and each credit card
          const trendPromises = [
            ...accountsWithCurrency.map(account =>
              getTrendData(user!.uid, year, 1, year, 12, account.id)
            ),
            ...creditCardsWithCurrency.map(card =>
              // Trend data for credit cards needs to be calculated monthly since getTrendData expects an accountId
              Promise.all(
                Array.from({ length: 12 }, (_, i) => i + 1).map(async (m) => {
                  const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
                  const endDate = `${year}-${String(m).padStart(2, '0')}-31`;
                  const txs = await getTransactions(user!.uid, { startDate, endDate });
                  const ccTxs = txs.filter(t => t.creditCardId === card.id);
                  const income = ccTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                  const expenses = ccTxs.filter(t => t.type === 'expense' || t.type === 'transfer').reduce((sum, t) => sum + t.amount, 0);
                  return {
                    month: `${year}-${String(m).padStart(2, '0')}`,
                    income,
                    expenses
                  };
                })
              )
            )
          ];

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

          // Fetch all user transactions for the year to calculate incoming transfers per month
          const startDate = `${year}-01-01`;
          const endDate = `${year}-12-31`;
          const allUserTransactions = await getTransactions(user!.uid, { startDate, endDate });
          const incomingTransfers = allUserTransactions.filter(
            t => t.type === 'transfer' && t.toAccountId && accountIdsInCurrency.has(t.toAccountId)
          );

          // Add incoming transfers to the appropriate months
          incomingTransfers.forEach(transfer => {
            const transferDate = new Date(transfer.date);
            const monthKey = `${transferDate.getFullYear()}-${String(transferDate.getMonth() + 1).padStart(2, '0')}`;
            const existing = monthlyData.get(monthKey) || { income: 0, expenses: 0 };
            monthlyData.set(monthKey, {
              income: existing.income + transfer.amount,
              expenses: existing.expenses,
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
      }

      // Load base trend data if not already loaded (when no currency filter is active)
      if (trend.length === 0) {
        try {
          trend = await getTrendData(
            user!.uid,
            year,
            1,
            year,
            12,
            selectedAccountId || undefined
          );
        } catch (error) {
          console.error('Error loading base trend data:', error);
        }
      }

      // Add family trend data if in family mode
      if (viewMode === 'family' && activeFamily) {
        try {
          const startDate = `${year}-01-01`;
          const endDate = `${year}-12-31`;
          const familyRes = await getFamilyTransactions(activeFamily.id, { startDate, endDate });

          if (familyRes.success && familyRes.data) {
            const familyMonthlyData = new Map<string, { income: number; expenses: number }>();

            familyRes.data.forEach((tx: any) => {
              const txDate = new Date(tx.date);
              const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
              const existing = familyMonthlyData.get(monthKey) || { income: 0, expenses: 0 };

              if (tx.type === 'income') {
                familyMonthlyData.set(monthKey, { ...existing, income: existing.income + tx.amount });
              } else if (tx.type === 'expense' || tx.type === 'transfer') {
                familyMonthlyData.set(monthKey, { ...existing, expenses: existing.expenses + tx.amount });
              }
            });

            // Merge with existing trend data
            const trendMap = new Map(trend.map(d => [d.month, d]));
            familyMonthlyData.forEach((data, monthKey) => {
              const existing = trendMap.get(monthKey) || { month: monthKey, income: 0, expenses: 0 };
              trendMap.set(monthKey, {
                month: monthKey,
                income: existing.income + data.income,
                expenses: existing.expenses + data.expenses
              });
            });

            // Ensure all months of the year are present if not already
            for (let m = 1; m <= 12; m++) {
              const monthKey = `${year}-${String(m).padStart(2, '0')}`;
              if (!trendMap.has(monthKey)) {
                trendMap.set(monthKey, { month: monthKey, income: 0, expenses: 0 });
              }
            }

            trend = Array.from(trendMap.values()).sort((a, b) => a.month.localeCompare(b.month));
          }
        } catch (e) {
          console.error("Failed to load family trend data", e);
        }
      }

      // Calculate projected balance for each month
      // Get stored balance for the filtered accounts
      let accountsToCalculate = [...accounts] as any[];
      if (viewMode === 'family') {
        const sharedAccs = sharedData.flatMap(m => m.accounts || []);
        accountsToCalculate = [...accountsToCalculate, ...sharedAccs];
      }

      if (selectedAccountId) {
        accountsToCalculate = accountsToCalculate.filter(a => a.id === selectedAccountId);
      } else if (selectedCurrency) {
        accountsToCalculate = accountsToCalculate.filter(a => a.currency === selectedCurrency);
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
      let accountsToCalculate = [...accounts] as any[];
      if (viewMode === 'family') {
        const sharedAccs = sharedData.flatMap(m => m.accounts || []);
        accountsToCalculate = [...accountsToCalculate, ...sharedAccs];
      }

      if (selectedAccountId) {
        accountsToCalculate = accountsToCalculate.filter(a => a.id === selectedAccountId);
      } else if (selectedCurrency) {
        accountsToCalculate = accountsToCalculate.filter(a => a.currency === selectedCurrency);
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

      // If currency filter is applied (but not specific account), filter by account and credit card IDs
      let filteredTransactions = transactions;
      if (selectedCurrency && !selectedAccountId) {
        const accountIdsInCurrency = new Set(accountsToCalculate.map(a => a.id));
        const creditCardIdsInCurrency = new Set(
          creditCards
            .filter(card => {
              const linkedAccount = accounts.find(a => a.id === card.linkedAccountId);
              return linkedAccount?.currency === selectedCurrency;
            })
            .map(card => card.id)
        );
        filteredTransactions = transactions.filter(t =>
          (t.accountId && accountIdsInCurrency.has(t.accountId)) ||
          (t.creditCardId && creditCardIdsInCurrency.has(t.creditCardId))
        );
      }

      // Fetch all user transactions to find incoming transfers to these accounts
      const allUserTransactions = await getTransactions(user.uid, {
        startDate: earliestBalanceDate,
        endDate: currentMonthEndDate,
      });

      const accountIdsSet = new Set(accountsToCalculate.map(a => a.id));
      let incomingTransfers = allUserTransactions.filter(
        t => t.type === 'transfer' && t.toAccountId && accountIdsSet.has(t.toAccountId)
      );

      // Add shared transactions if in family mode
      if (viewMode === 'family' && activeFamily) {
        try {
          const familyRes = await getFamilyTransactions(activeFamily.id, {
            startDate: earliestBalanceDate,
            endDate: currentMonthEndDate
          });
          if (familyRes.success && familyRes.data) {
            filteredTransactions = [...filteredTransactions, ...familyRes.data];
            // Identify incoming transfers in family data if any
            const familyTransfers = familyRes.data.filter((t: any) => t.type === 'transfer' && t.toAccountId && accountIdsSet.has(t.toAccountId));
            incomingTransfers = [...incomingTransfers, ...familyTransfers];
          }
        } catch (e) {
          console.error("Failed to load historical family transactions for balance calculation", e);
        }
      }

      // Group transactions by month and calculate net balance for each month
      // Income includes: income transactions + incoming transfers
      // Expenses include: expenses + outgoing transfers
      const monthlyNetBalances = new Map<string, number>();

      filteredTransactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;

        const currentBalance = monthlyNetBalances.get(monthKey) || 0;
        let transactionAmount = 0;
        if (transaction.type === 'income') {
          transactionAmount = transaction.amount;
        } else if (transaction.type === 'expense') {
          transactionAmount = -transaction.amount;
        } else if (transaction.type === 'transfer') {
          // Outgoing transfer: money leaves this account
          transactionAmount = -transaction.amount;
        }
        monthlyNetBalances.set(monthKey, currentBalance + transactionAmount);
      });

      // Add incoming transfers (money entering these accounts)
      incomingTransfers.forEach(transfer => {
        const transferDate = new Date(transfer.date);
        const monthKey = `${transferDate.getFullYear()}-${String(transferDate.getMonth() + 1).padStart(2, '0')}`;

        const currentBalance = monthlyNetBalances.get(monthKey) || 0;
        monthlyNetBalances.set(monthKey, currentBalance + transfer.amount);
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
      let accountsToCalculate = [...accounts] as any[];
      if (viewMode === 'family') {
        const sharedAccs = sharedData.flatMap(m => m.accounts || []);
        accountsToCalculate = [...accountsToCalculate, ...sharedAccs];
      }

      if (selectedAccountId) {
        accountsToCalculate = accountsToCalculate.filter(a => a.id === selectedAccountId);
      } else if (selectedCurrency) {
        accountsToCalculate = accountsToCalculate.filter(a => a.currency === selectedCurrency);
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

      // If currency filter is applied (but not specific account), filter by account and credit card IDs
      let filteredTransactions = transactions;
      if (selectedCurrency && !selectedAccountId) {
        const accountIdsInCurrency = new Set(accountsToCalculate.map(a => a.id));
        const creditCardIdsInCurrency = new Set(
          creditCards
            .filter(card => {
              const linkedAccount = accounts.find(a => a.id === card.linkedAccountId);
              return linkedAccount?.currency === selectedCurrency;
            })
            .map(card => card.id)
        );
        filteredTransactions = transactions.filter(t =>
          (t.accountId && accountIdsInCurrency.has(t.accountId)) ||
          (t.creditCardId && creditCardIdsInCurrency.has(t.creditCardId))
        );
      }

      // Fetch all user transactions to find incoming transfers to these accounts
      const allUserTransactions = await getTransactions(user.uid, {
        startDate: earliestBalanceDate,
        endDate: previousMonthEndDate,
      });

      const accountIdsSet = new Set(accountsToCalculate.map(a => a.id));
      let incomingTransfers = allUserTransactions.filter(
        t => t.type === 'transfer' && t.toAccountId && accountIdsSet.has(t.toAccountId)
      );

      // Add shared transactions if in family mode
      if (viewMode === 'family' && activeFamily) {
        try {
          const familyRes = await getFamilyTransactions(activeFamily.id, {
            startDate: earliestBalanceDate,
            endDate: previousMonthEndDate
          });
          if (familyRes.success && familyRes.data) {
            filteredTransactions = [...filteredTransactions, ...familyRes.data];
            // Identify incoming transfers in family data if any
            const familyTransfers = familyRes.data.filter((t: any) => t.type === 'transfer' && t.toAccountId && accountIdsSet.has(t.toAccountId));
            incomingTransfers = [...incomingTransfers, ...familyTransfers];
          }
        } catch (e) {
          console.error("Failed to load historical family transactions for total balance calculation", e);
        }
      }

      // Calculate total net balance from all transactions up to end of previous month
      // Income includes: income transactions + incoming transfers
      // Expenses include: expenses + outgoing transfers
      const totalNetBalance = filteredTransactions.reduce((sum, transaction) => {
        if (transaction.type === 'income') {
          return sum + transaction.amount;
        }
        if (transaction.type === 'expense') {
          return sum - transaction.amount;
        }
        if (transaction.type === 'transfer') {
          // Outgoing transfer: money leaves this account
          return sum - transaction.amount;
        }
        return sum;
      }, 0);

      // Add incoming transfers (money entering these accounts)
      const totalIncomingTransfers = incomingTransfers.reduce((sum, transfer) => {
        return sum + transfer.amount;
      }, 0);

      // Calculate: stored balance + sum of all net balances + incoming transfers up to previous month
      // This gives us the balance at the START of the current month
      const monthStartBalance = storedBalance + totalNetBalance + totalIncomingTransfers;

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
      <div className="flex items-center justify-between gap-3 lg:gap-4">
        <h1 className="text-lg sm:text-2xl font-bold text-ink">{t('reports.title')}</h1>
        <PageDescription pageKey="reports" />
      </div>
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

      {/* Family Summary Info Bar */}
      {viewMode === 'family' && sharedData.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50/60 border border-violet-200/40 backdrop-blur">
          <Users size={16} className="text-violet-600 flex-shrink-0" />
          <div className="text-xs text-violet-700">
            <span className="font-medium">{t('family.toggle.family')}</span>
            {' · '}
            {sharedData.length} {sharedData.length === 1 ? 'member' : 'members'}
            {sharedData.some(m => m.accounts && m.accounts.length > 0) && (
              <span> · {sharedData.reduce((sum, m) => sum + (m.accounts?.length || 0), 0)} {t('family.shared.accounts').toLowerCase()}</span>
            )}
            {sharedData.some(m => m.creditCards && m.creditCards.length > 0) && (
              <span> · {sharedData.reduce((sum, m) => sum + (m.creditCards?.length || 0), 0)} {t('family.shared.creditCards').toLowerCase()}</span>
            )}
          </div>
        </div>
      )}

      {/* Linha 1: Cards de Receita e Despesa com gráficos internos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Card de Receita com Composição */}
        <Card className="bg-white/40 backdrop-blur-xl border-white/60 border-l-4 border-l-emerald">
          <CardHeader className="pb-2 lg:pb-4">
            <div className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs lg:text-sm font-medium text-slate">
                  {t('common.income')} {viewMode === 'family' && '(Família)'}
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
                        const translated = t(getTranslatedCategoryName(value));
                        return translated.length > 14 ? translated.slice(0, 14) + '...' : translated;
                      }}
                      interval={0}
                    />
                    <Tooltip
                      content={<CategoryTooltip transactions={periodTransactions} currency={selectedCurrency || 'BRL'} t={t} />}
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
                  {t('common.expense')} {viewMode === 'family' && '(Família)'}
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
                        const translated = t(getTranslatedCategoryName(value));
                        return translated.length > 14 ? translated.slice(0, 14) + '...' : translated;
                      }}
                      interval={0}
                    />
                    <Tooltip
                      content={<CategoryTooltip transactions={periodTransactions} currency={selectedCurrency || 'BRL'} t={t} />}
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
              {t('reports.monthlyBalance')} {viewMode === 'family' && '(Família)'}
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
              {t('reports.totalBalance')} {viewMode === 'family' && '(Família)'}
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
              {t('reports.calculatedBalance')} {viewMode === 'family' && '(Família)'}
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

              {/* Zero reference line */}
              <ReferenceLine
                y={0}
                stroke={CHART_GRADIENT_COLORS.zeroLine}
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{
                  value: t('reports.zeroLine'),
                  position: 'insideTopRight',
                  fill: '#64748B',
                  fontSize: 10
                }}
              />

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
                formatter={(value, name) => {
                  const numValue = Number(value);
                  const formattedValue = formatCurrency(numValue, selectedCurrency || 'BRL');

                  if (name === t('reports.projectedBalance')) {
                    const isNegative = numValue < 0;
                    const isWarning = numValue > 0 && numValue < warningThreshold;

                    const status = isNegative
                      ? ` (${t('reports.balanceIsNegative')})`
                      : isWarning
                        ? ` (${t('reports.balanceApproachingZero')})`
                        : '';

                    return [formattedValue + status, name];
                  }

                  return [formattedValue, name];
                }}
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.5)',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
                labelStyle={{ fontSize: '12px', fontWeight: 600 }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconSize={8}
              />

              {/* Income line */}
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10B981"
                name={t('common.income')}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />

              {/* Expenses line */}
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#F43F5E"
                name={t('common.expense')}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />

              {/* Projected balance line with custom dots */}
              <Line
                type="monotone"
                dataKey="projectedBalance"
                stroke="#F59E0B"
                strokeWidth={2}
                name={t('reports.projectedBalance')}
                dot={<CustomDot />}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
