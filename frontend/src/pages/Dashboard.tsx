import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { useUserSetup } from '../hooks/useUserSetup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/Card';
import { Button } from '../components/Button';
import { formatCurrency, formatMonthYear, getCurrentMonth } from '../utils/format';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import { getTransactions } from '../services/transactionService';
import { getAccounts, calculateAccountBalance } from '../services/accountService';
import { getCategories } from '../services/categoryService';
import type { Transaction, Account, Category } from '../types';
import { TrendingUp, TrendingDown, Wallet, Plus, Calendar } from 'lucide-react';
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
  const navigate = useNavigate();
  const [currencySummaries, setCurrencySummaries] = useState<Record<string, CurrencySummary>>({});
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [accountCurrencyMap, setAccountCurrencyMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Access voice context for Hero button modal trigger
  const { shouldOpenModal, clearModalRequest } = useVoice();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // When Hero button is clicked on Dashboard, navigate to /transactions to add
  useEffect(() => {
    if (shouldOpenModal) {
      clearModalRequest();
      navigate('/transactions?action=add');
    }
  }, [shouldOpenModal, clearModalRequest, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { year, month } = getCurrentMonth();
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const [transactions, accountsData, categoriesData] = await Promise.all([
        getTransactions(user!.uid, { startDate, endDate }),
        getAccounts(user!.uid),
        getCategories(user!.uid),
      ]);

      const accountCurrencyMap: Record<string, string> = {};
      accountsData.forEach((account) => {
        accountCurrencyMap[account.id] = account.currency;
      });

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

      Object.keys(summaries).forEach((currency) => {
        summaries[currency].balance = summaries[currency].income - summaries[currency].expenses;
      });

      setCurrencySummaries(summaries);
      setCurrencySummaries(summaries);

      // Enrich transactions with account and category data for display
      const accountsMap = accountsData.reduce((acc, account) => {
        acc[account.id] = account;
        return acc;
      }, {} as Record<string, Account>);

      const categoriesMap = categoriesData.reduce((acc, category) => {
        acc[category.id] = category;
        return acc;
      }, {} as Record<string, Category>);

      const enrichedTransactions = transactions.map(t => ({
        ...t,
        account: t.accountId ? accountsMap[t.accountId] : undefined,
        category: t.categoryId ? categoriesMap[t.categoryId] : undefined,
      }));

      setRecentTransactions(enrichedTransactions.slice(0, 5));
      setAccounts(accountsData);
      setAccountCurrencyMap(accountCurrencyMap);

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
      </div>
    );
  }

  const { year, month } = getCurrentMonth();

  return (
    <div className="flex flex-col sm:gap-6 gap-4 sm:p-6 p-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">{t('dashboard.title')}</h1>
          <div className="flex items-center gap-2 text-slate mt-1">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">{formatMonthYear(year, month)}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
        {/* Income Card */}
        <Card hoverable className="border-l-4 border-l-emerald bg-white/40 backdrop-blur-xl border-white/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate">
              {t('dashboard.totalIncome')}
            </CardTitle>
            <div className="p-2 bg-emerald/10 rounded-xl">
              <TrendingUp className="h-4 w-4 text-emerald" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.keys(currencySummaries).length === 0 ? (
                <div className="text-xl sm:text-2xl font-bold text-emerald tabular-nums">
                  {formatCurrency(0)}
                </div>
              ) : (
                Object.entries(currencySummaries).map(([currency, summary]) => (
                  <div key={currency} className="text-xl sm:text-2xl font-bold text-emerald tabular-nums tracking-tight">
                    {formatCurrency(summary.income, currency)}
                  </div>
                ))
              )}
            </div>
            <CardDescription className="mt-1 text-slate/80">Receita mensal</CardDescription>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card hoverable className="border-l-4 border-l-rose bg-white/40 backdrop-blur-xl border-white/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate">
              {t('dashboard.totalExpenses')}
            </CardTitle>
            <div className="p-2 bg-rose/10 rounded-xl">
              <TrendingDown className="h-4 w-4 text-rose" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.keys(currencySummaries).length === 0 ? (
                <div className="text-xl sm:text-2xl font-bold text-rose tabular-nums">
                  {formatCurrency(0)}
                </div>
              ) : (
                Object.entries(currencySummaries).map(([currency, summary]) => (
                  <div key={currency} className="text-xl sm:text-2xl font-bold text-rose tabular-nums tracking-tight">
                    {formatCurrency(summary.expenses, currency)}
                  </div>
                ))
              )}
            </div>
            <CardDescription className="mt-1 text-slate/80">Despesa mensal</CardDescription>
          </CardContent>
        </Card>

        {/* Balance Card */}
        <Card hoverable className="border-l-4 border-l-blue bg-white/40 backdrop-blur-xl border-white/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate">
              {t('dashboard.currentBalance')}
            </CardTitle>
            <div className="p-2 bg-blue/10 rounded-xl">
              <Wallet className="h-4 w-4 text-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.keys(currencySummaries).length === 0 ? (
                <div className="text-xl sm:text-2xl font-bold text-blue tabular-nums">
                  {formatCurrency(0)}
                </div>
              ) : (
                Object.entries(currencySummaries).map(([currency, summary]) => (
                  <div
                    key={currency}
                    className={`text-xl sm:text-2xl font-bold tabular-nums tracking-tight ${summary.balance >= 0 ? 'text-blue' : 'text-rose'
                      }`}
                  >
                    {formatCurrency(summary.balance, currency)}
                  </div>
                ))
              )}
            </div>
            <CardDescription className="mt-1 text-slate/80">Saldo líquido</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-white/40 backdrop-blur-xl border-white/60 flex-1">
        <CardHeader>
          <CardTitle className="text-lg text-ink">{t('dashboard.recentTransactions')}</CardTitle>
          <CardDescription className="text-slate">Suas últimas atividades</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-white/50 rounded-full flex items-center justify-center mb-4 text-slate">
                <Wallet className="h-6 w-6" />
              </div>
              <p className="text-slate mb-4 font-medium">{t('dashboard.noTransactions')}</p>
              <Link to="/transactions">
                <Button variant="outline" size="sm" className="border-slate/20 text-slate hover:bg-slate/5">
                  {t('transactions.addFirst')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/40 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${transaction.type === 'income'
                      ? 'bg-emerald/10 text-emerald'
                      : 'bg-rose/10 text-rose'
                      }`}>
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink text-base truncate">
                        {transaction.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        <span className="text-slate font-medium">
                          {transaction.category ? t(getTranslatedCategoryName(transaction.category.name)) : t('common.category')}
                        </span>
                        {transaction.account && (
                          <>
                            <span className="text-slate/40">•</span>
                            <span className="font-medium" style={{ color: transaction.account.color }}>{transaction.account.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-bold tabular-nums text-base ${transaction.type === 'income'
                        ? 'text-emerald'
                        : 'text-rose'
                        }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount, accountCurrencyMap[transaction.accountId || ''] || 'BRL')}
                    </p>
                    <p className="text-xs text-slate/80 mt-0.5">
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
