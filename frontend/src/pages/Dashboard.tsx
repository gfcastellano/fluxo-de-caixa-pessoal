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
import { getCreditCards } from '../services/creditCardService';
import { getCreditCardBills } from '../services/creditCardBillService';
import type { Transaction, Account, Category, CreditCard, CreditCardBill } from '../types';
import { enrichTransactions } from '../utils/transactionEnrichment';
import { CashCurrencyIcon } from '../components/CashCurrencyIcon';
import { TrendingUp, TrendingDown, ArrowRightLeft, Wallet, Plus, Calendar, CreditCard as CreditCardIcon, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageDescription } from '../components/PageDescription';
import { cn } from '../utils/cn';

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
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [creditCardBills, setCreditCardBills] = useState<CreditCardBill[]>([]);
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
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      const [transactions, accountsData, categoriesData, creditCardsData, billsData] = await Promise.all([
        getTransactions(user!.uid, { startDate, endDate }),
        getAccounts(user!.uid),
        getCategories(user!.uid),
        getCreditCards(user!.uid),
        getCreditCardBills(user!.uid),
      ]);

      const accountCurrencyMap: Record<string, string> = {};
      accountsData.forEach((account) => {
        accountCurrencyMap[account.id] = account.currency;
      });

      // Map credit card IDs to currencies
      const cardCurrencyMap: Record<string, string> = {};
      creditCardsData.forEach(card => {
        const linkedAccount = accountsData.find(a => a.id === card.linkedAccountId);
        if (linkedAccount) {
          cardCurrencyMap[card.id] = linkedAccount.currency;
        }
      });

      const summaries: Record<string, CurrencySummary> = {};

      transactions.forEach((transaction) => {
        const currency = transaction.accountId
          ? accountCurrencyMap[transaction.accountId]
          : transaction.creditCardId
            ? cardCurrencyMap[transaction.creditCardId]
            : 'BRL';

        if (!summaries[currency]) {
          summaries[currency] = { income: 0, expenses: 0, balance: 0 };
        }

        if (transaction.type === 'income') {
          summaries[currency].income += transaction.amount;
        } else if (transaction.type === 'expense') {
          summaries[currency].expenses += transaction.amount;
        }
        // transfers are internal movements and don't affect income/expense summaries
      });

      Object.keys(summaries).forEach((currency) => {
        summaries[currency].balance = summaries[currency].income - summaries[currency].expenses;
      });

      setCurrencySummaries(summaries);
      setCurrencySummaries(summaries);

      // Enrich transactions with account and category data for display
      const enrichedTransactions = enrichTransactions(
        transactions,
        accountsData,
        categoriesData,
        creditCardsData
      );

      setRecentTransactions(enrichedTransactions.slice(0, 5));
      setAccounts(accountsData);
      setAccountCurrencyMap(accountCurrencyMap);

      const balances: Record<string, number> = {};
      for (const account of accountsData) {
        const calculatedBalance = await calculateAccountBalance(account.id, user!.uid);
        balances[account.id] = calculatedBalance;
      }
      setAccountBalances(balances);
      setCreditCards(creditCardsData);
      setCreditCardBills(billsData);
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
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg sm:text-2xl font-bold text-ink">{t('dashboard.title')}</h1>
        <PageDescription pageKey="dashboard" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        {/* Income Card */}
        <Card hoverable className="bg-white/40 backdrop-blur-xl border-white/60 min-h-[80px] lg:min-h-[120px]" style={{ borderLeftWidth: '4px', borderLeftColor: `rgba(34, 197, 94, ${Math.min(Object.values(currencySummaries).reduce((sum, s) => sum + s.income, 0) / 20000 + 0.3, 1)})` }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 lg:pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-slate truncate">
              {t('dashboard.totalIncome')}
            </CardTitle>
            <div className="p-1.5 lg:p-2 bg-emerald/10 rounded-xl flex-shrink-0">
              <TrendingUp className="h-3 w-3 lg:h-4 lg:w-4 text-emerald" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0.5 lg:space-y-1">
              {Object.keys(currencySummaries).length === 0 ? (
                <div className="text-base lg:text-xl font-bold text-emerald tabular-nums truncate">
                  {formatCurrency(0)}
                </div>
              ) : (
                Object.entries(currencySummaries).map(([currency, summary]) => (
                  <div key={currency} className="text-base lg:text-xl font-bold text-emerald tabular-nums tracking-tight truncate">
                    {formatCurrency(summary.income, currency)}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card hoverable className="bg-white/40 backdrop-blur-xl border-white/60 min-h-[80px] lg:min-h-[120px]" style={{ borderLeftWidth: '4px', borderLeftColor: `rgba(255, 92, 138, ${Math.min(Object.values(currencySummaries).reduce((sum, s) => sum + s.expenses, 0) / 15000 + 0.3, 1)})` }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 lg:pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-slate truncate">
              {t('dashboard.totalExpenses')}
            </CardTitle>
            <div className="p-1.5 lg:p-2 bg-rose/10 rounded-xl flex-shrink-0">
              <TrendingDown className="h-3 w-3 lg:h-4 lg:w-4 text-rose" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0.5 lg:space-y-1">
              {Object.keys(currencySummaries).length === 0 ? (
                <div className="text-base lg:text-xl font-bold text-rose tabular-nums truncate">
                  {formatCurrency(0)}
                </div>
              ) : (
                Object.entries(currencySummaries).map(([currency, summary]) => (
                  <div key={currency} className="text-base lg:text-xl font-bold text-rose tabular-nums tracking-tight truncate">
                    {formatCurrency(summary.expenses, currency)}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Balance Card */}
        <Card hoverable className="bg-white/40 backdrop-blur-xl border-white/60 min-h-[80px] lg:min-h-[120px] sm:col-span-2 lg:col-span-1" style={{ borderLeftWidth: '4px', borderLeftColor: Object.values(currencySummaries).reduce((sum, s) => sum + s.balance, 0) >= 0 ? `rgba(34, 197, 94, ${Math.min(Object.values(currencySummaries).reduce((sum, s) => sum + s.balance, 0) / 20000 + 0.3, 1)})` : `rgba(255, 92, 138, ${Math.min(Math.abs(Object.values(currencySummaries).reduce((sum, s) => sum + s.balance, 0)) / 20000 + 0.3, 1)})` }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 lg:pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-slate truncate">
              {t('dashboard.currentBalance')}
            </CardTitle>
            <div className={`p-1.5 lg:p-2 rounded-xl flex-shrink-0 ${Object.values(currencySummaries).reduce((sum, s) => sum + s.balance, 0) >= 0 ? 'bg-emerald/10' : 'bg-rose/10'}`}>
              <Wallet className={`h-3 w-3 lg:h-4 lg:w-4 ${Object.values(currencySummaries).reduce((sum, s) => sum + s.balance, 0) >= 0 ? 'text-emerald' : 'text-rose'}`} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0.5 lg:space-y-1">
              {Object.keys(currencySummaries).length === 0 ? (
                <div className="text-base lg:text-xl font-bold text-emerald tabular-nums truncate">
                  {formatCurrency(0)}
                </div>
              ) : (
                Object.entries(currencySummaries).map(([currency, summary]) => (
                  <div
                    key={currency}
                    className={`text-base lg:text-xl font-bold tabular-nums tracking-tight truncate ${summary.balance >= 0 ? 'text-emerald' : 'text-rose'
                      }`}
                  >
                    {formatCurrency(summary.balance, currency)}
                  </div>
                ))
              )}
            </div>
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
                <Landmark className="h-6 w-6" />
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
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/40 transition-colors group gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 ${transaction.type === 'income'
                      ? 'bg-emerald/10 text-emerald'
                      : transaction.type === 'transfer'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-rose/10 text-rose'
                      }`}>
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : transaction.type === 'transfer' ? (
                        <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink text-sm sm:text-base leading-tight">
                        {transaction.description}
                      </p>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs mt-1 flex-wrap">
                        <span className="text-slate font-medium">
                          {transaction.category ? t(getTranslatedCategoryName(transaction.category.name)) : t('common.category')}
                        </span>

                        <span className="text-slate/40 flex-shrink-0">•</span>

                        {transaction.creditCard ? (
                          <div className="flex items-center gap-1">
                            <CreditCardIcon size={12} className="text-slate flex-shrink-0" />
                            <span className="font-medium" style={{ color: transaction.creditCard.color }}>
                              {transaction.creditCard.name}
                            </span>
                            {transaction.creditCard.linkedAccount && (
                              <span className="text-slate/50 text-[10px]">
                                via {transaction.creditCard.linkedAccount.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          transaction.account && (
                            <div className="flex items-center gap-1">
                              {transaction.toAccountId ? (
                                <ArrowRightLeft size={12} className="text-slate flex-shrink-0" />
                              ) : transaction.account.isCash ? (
                                <CashCurrencyIcon currency={transaction.account.currency} className="w-3 h-3 text-slate flex-shrink-0" style={{ color: transaction.account.color }} />
                              ) : (
                                <Landmark size={12} className="text-slate flex-shrink-0" />
                              )}
                              <span className="font-medium" style={{ color: transaction.account.color }}>{transaction.account.name}</span>
                              {transaction.type === 'transfer' && transaction.toAccount && (
                                <>
                                  <span className="text-slate/40 flex-shrink-0">→</span>
                                  <span className="font-medium" style={{ color: transaction.toAccount.color }}>{transaction.toAccount.name}</span>
                                </>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-3">
                    <p
                      className={`font-bold tabular-nums text-sm sm:text-base whitespace-nowrap ${transaction.type === 'income'
                        ? 'text-emerald'
                        : transaction.type === 'transfer'
                          ? 'text-blue-600'
                          : 'text-rose'
                        }`}
                    >
                      {transaction.type === 'income' ? '+' : transaction.type === 'transfer' ? '' : '-'}
                      {formatCurrency(transaction.amount, accountCurrencyMap[transaction.accountId || ''] || 'BRL')}
                    </p>
                    <p className="text-xs text-slate/80 mt-0.5 whitespace-nowrap">
                      {new Date(transaction.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Cards Summary */}
      {creditCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          <Card className="bg-white/40 backdrop-blur-xl border-white/60 sm:col-span-1 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate flex items-center gap-2">
                <CreditCardIcon className="h-4 w-4" />
                {t('creditCards.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {creditCards.map(card => {
                  const currentBill = creditCardBills.find(
                    b => b.creditCardId === card.id && !b.isClosed && !b.isPaid
                  );
                  const usage = currentBill ? (currentBill.totalAmount / card.creditLimit) * 100 : 0;

                  return (
                    <div key={card.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-ink" style={{ color: card.color }}>{card.name}</span>
                        <span className="text-slate">{formatCurrency(currentBill?.totalAmount || 0)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full transition-all duration-500",
                            usage > 90 ? "bg-rose" : usage > 70 ? "bg-amber-500" : "bg-blue"
                          )}
                          style={{ width: `${Math.min(usage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate/60">
                        <span>{t('creditCards.used')} {usage.toFixed(0)}%</span>
                        <span>{t('creditCards.limit')}: {formatCurrency(card.creditLimit)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Bills */}
          <Card className="bg-white/40 backdrop-blur-xl border-white/60 sm:col-span-1 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('creditCardBills.upcoming')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {creditCards.map(card => {
                  const openBill = creditCardBills.find(
                    b => b.creditCardId === card.id && !b.isPaid
                  );
                  if (!openBill) return null;

                  return (
                    <div key={card.id} className="flex items-center justify-between p-2 rounded-xl bg-white/30 border border-white/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/50 flex-shrink-0">
                          <CreditCardIcon className="h-4 w-4" style={{ color: card.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink truncate">{card.name}</p>
                          <p className="text-[10px] text-slate truncate">
                            {t('creditCardBills.dueDate')}: {new Date(openBill.dueDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-xs font-bold text-ink">{formatCurrency(openBill.totalAmount)}</p>
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                          openBill.isClosed ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {openBill.isClosed ? t('creditCardBills.closed') : t('creditCardBills.open')}
                        </span>
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
