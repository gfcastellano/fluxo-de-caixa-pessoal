import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { getCurrentMonth } from '../utils/format';
import { getTransactions } from '../services/transactionService';
import { getFamilyTransactions, repairSharing } from '../services/familyService';
import { getAccounts, calculateAccountBalance } from '../services/accountService';
import { getCategories } from '../services/categoryService';
import { getCreditCards } from '../services/creditCardService';
import { getCreditCardBills } from '../services/creditCardBillService';
import { enrichTransactions } from '../utils/transactionEnrichment';
import { projectMonthNet, projectYearEndImpact } from '../domain/projections';
import type { Transaction, Account, CreditCard, CreditCardBill } from '../types';

export interface CurrencySummary {
  income: number;
  expenses: number;
  balance: number;
}

export interface ProjectionResult {
  value: number;
  explanation: string;
}

export interface HomeSummary {
  monthIncome: number;
  monthExpense: number;
  monthNet: number;
  byCurrency: Record<string, { income: number; expense: number; net: number }>;
  latestTransactions: Transaction[];
  monthProjectionNet?: ProjectionResult;
  yearEndProjection?: ProjectionResult;
}

export interface DashboardData {
  currencySummaries: Record<string, CurrencySummary>;
  familyCurrencySummaries: Record<string, CurrencySummary>;
  recentTransactions: Transaction[];
  accounts: Account[];
  creditCards: CreditCard[];
  creditCardBills: CreditCardBill[];
  accountBalances: Record<string, number>;
  accountCurrencyMap: Record<string, string>;
  loading: boolean;
  homeSummary: HomeSummary;
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const { viewMode, sharedData, activeFamily } = useFamily();

  const [currencySummaries, setCurrencySummaries] = useState<Record<string, CurrencySummary>>({});
  const [familyCurrencySummaries, setFamilyCurrencySummaries] = useState<Record<string, CurrencySummary>>({});
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [creditCardBills, setCreditCardBills] = useState<CreditCardBill[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [accountCurrencyMap, setAccountCurrencyMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [homeSummary, setHomeSummary] = useState<HomeSummary>({
    monthIncome: 0,
    monthExpense: 0,
    monthNet: 0,
    byCurrency: {},
    latestTransactions: [],
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, viewMode, activeFamily?.id, sharedData]);

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

      let allTransactions = transactions;
      let sharedTransactions: Transaction[] = [];

      // Fetch shared transactions if in family mode
      if (viewMode === 'family' && activeFamily) {
        try {
          let familyResponse = await getFamilyTransactions(activeFamily.id, {
            startDate,
            endDate
          });

          // If we have family members but no transactions, try to repair sharing configs once
          if (familyResponse.success && familyResponse.data && familyResponse.data.length === 0 && activeFamily.members?.length > 1) {
            console.log('[Dashboard] No shared transactions found, triggering sharing repair...');
            await repairSharing(activeFamily.id);
            familyResponse = await getFamilyTransactions(activeFamily.id, { startDate, endDate });
          }

          if (familyResponse.success && familyResponse.data) {
            console.log(`[Dashboard] Fetched ${familyResponse.data.length} shared transactions`);
            const flatSharedAccounts = sharedData.flatMap(m => m.accounts || []);
            const flatSharedCards = sharedData.flatMap(m => m.creditCards || []);

            const enrichedFamilyData = familyResponse.data.map(tx => {
              let account = tx.account;
              let creditCard = tx.creditCard;

              if (!account && tx.accountId) {
                const found = flatSharedAccounts.find(a => a.id === tx.accountId);
                if (found) {
                  account = {
                    id: found.id,
                    name: found.name,
                    color: found.color,
                    currency: found.currency,
                    type: found.type,
                    icon: found.icon || '',
                    balance: found.balance,
                    initialBalance: 0,
                    userId: tx.ownerUserId || ''
                  } as any;
                }
              }
              if (!creditCard && tx.creditCardId) {
                const found = flatSharedCards.find(c => c.id === tx.creditCardId);
                if (found) {
                  creditCard = {
                    id: found.id,
                    name: found.name,
                    color: found.color,
                    creditLimit: found.creditLimit,
                    closingDay: 1,
                    dueDay: 1,
                    userId: tx.ownerUserId || ''
                  } as any;
                }
              }

              return { ...tx, account, creditCard, isShared: true };
            });

            sharedTransactions = enrichedFamilyData;
            allTransactions = [...allTransactions, ...enrichedFamilyData];
            console.log(`[Dashboard] Combined pool: ${allTransactions.length} transactions`);
          }
        } catch (err) {
          console.error('Failed to load family transactions', err);
        }
      }

      const acctCurrencyMap: Record<string, string> = {};
      accountsData.forEach((account) => {
        acctCurrencyMap[account.id] = account.currency;
      });

      const cardCurrencyMap: Record<string, string> = {};
      creditCardsData.forEach(card => {
        const linkedAccount = accountsData.find(a => a.id === card.linkedAccountId);
        if (linkedAccount) {
          cardCurrencyMap[card.id] = linkedAccount.currency;
        }
      });

      // Build shared item currency maps
      const sharedAccountCurrencyMap: Record<string, string> = {};
      const sharedCardCurrencyMap: Record<string, string> = {};

      sharedData.forEach(member => {
        member.accounts?.forEach(acc => {
          sharedAccountCurrencyMap[acc.id] = acc.currency;
        });
        member.creditCards?.forEach(card => {
          const linkedAccount = member.accounts?.find(a => a.id === (card as any).linkedAccountId);
          if (linkedAccount) {
            sharedCardCurrencyMap[card.id] = linkedAccount.currency;
          } else {
            sharedCardCurrencyMap[card.id] = 'BRL';
          }
        });
      });

      const getTransactionCurrency = (tx: any) => {
        if (tx.accountId) {
          return acctCurrencyMap[tx.accountId] || sharedAccountCurrencyMap[tx.accountId] || 'BRL';
        }
        if (tx.creditCardId) {
          return cardCurrencyMap[tx.creditCardId] || sharedCardCurrencyMap[tx.creditCardId] || 'BRL';
        }
        return 'BRL';
      };

      const summaries: Record<string, CurrencySummary> = {};
      transactions.forEach((transaction) => {
        const currency = getTransactionCurrency(transaction);

        if (!summaries[currency]) {
          summaries[currency] = { income: 0, expenses: 0, balance: 0 };
        }

        if (transaction.type === 'income') {
          summaries[currency].income += transaction.amount;
        } else if (transaction.type === 'expense') {
          summaries[currency].expenses += transaction.amount;
        }
      });

      Object.keys(summaries).forEach((currency) => {
        summaries[currency].balance = summaries[currency].income - summaries[currency].expenses;
      });

      setCurrencySummaries(summaries);

      // Calculate family summaries (Combined: Me + Shared)
      const fSummaries: Record<string, CurrencySummary> = {};
      const familyPool = viewMode === 'family' ? allTransactions : transactions;

      familyPool.forEach((transaction) => {
        const currency = getTransactionCurrency(transaction);

        if (!fSummaries[currency]) {
          fSummaries[currency] = { income: 0, expenses: 0, balance: 0 };
        }

        if (transaction.type === 'income') {
          fSummaries[currency].income += transaction.amount;
        } else if (transaction.type === 'expense') {
          fSummaries[currency].expenses += transaction.amount;
        }
      });

      Object.keys(fSummaries).forEach((currency) => {
        fSummaries[currency].balance = fSummaries[currency].income - fSummaries[currency].expenses;
      });

      setFamilyCurrencySummaries(fSummaries);

      // Enrich transactions with account and category data for display
      const flatSharedAccounts = sharedData.flatMap(m => m.accounts || []).map(a => ({
        id: a.id,
        name: a.name,
        color: a.color,
        currency: a.currency,
        type: a.type,
        icon: a.icon || '',
        balance: a.balance,
        initialBalance: 0,
        userId: a.ownerUserId || '',
        ownerName: a.ownerName
      } as any));

      const flatSharedCards = sharedData.flatMap(m => m.creditCards || []).map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        creditLimit: c.creditLimit,
        closingDay: 1,
        dueDay: 1,
        userId: c.ownerUserId || '',
        ownerName: c.ownerName,
        linkedAccountId: (c as any).linkedAccountId
      } as any));

      const enrichedTransactions = enrichTransactions(
        allTransactions,
        [...accountsData, ...flatSharedAccounts],
        categoriesData,
        [...creditCardsData, ...flatSharedCards]
      );

      const top10 = enrichedTransactions.slice(0, 10);
      setRecentTransactions(top10);
      setAccounts(accountsData);
      setAccountCurrencyMap(acctCurrencyMap);

      // Build HomeSummary view-model (not used in UI yet)
      const activeSummaries = viewMode === 'family' ? fSummaries : summaries;
      const byCurrency: Record<string, { income: number; expense: number; net: number }> = {};
      let totalIncome = 0;
      let totalExpense = 0;

      Object.entries(activeSummaries).forEach(([currency, s]) => {
        byCurrency[currency] = { income: s.income, expense: s.expenses, net: s.balance };
        totalIncome += s.income;
        totalExpense += s.expenses;
      });

      const currentNet = totalIncome - totalExpense;

      // Calculate monthly projection
      const today = new Date();
      const daysInMonth = lastDay;
      const currentDay = today.getDate();
      const remainingDays = daysInMonth - currentDay;
      const windowDays = Math.min(7, currentDay); // Use up to 7 days, or however many days have passed

      // Compute net from the last N days of transactions
      const windowStart = new Date(year, month - 1, currentDay - windowDays + 1);
      const activePool = viewMode === 'family' ? allTransactions : transactions;
      let lastNDaysNet = 0;
      activePool.forEach(tx => {
        const txDate = new Date(tx.date);
        if (txDate >= windowStart && txDate <= today) {
          if (tx.type === 'income') lastNDaysNet += tx.amount;
          else if (tx.type === 'expense') lastNDaysNet -= tx.amount;
        }
      });

      const monthProjectionNet = projectMonthNet({
        currentNet,
        lastNDaysNet,
        remainingDays,
        windowDays,
      });

      // Calculate year-end projection (conservative)
      const currentMonth = month; // 1-based
      const monthsRemaining = 12 - currentMonth; // full months after current
      const yearEndProjection = projectYearEndImpact({
        projectedMonthNet: monthProjectionNet.value,
        monthsRemaining,
        // No historical data yet — will be enhanced when we have multi-month fetching
      });

      setHomeSummary({
        monthIncome: totalIncome,
        monthExpense: totalExpense,
        monthNet: currentNet,
        byCurrency,
        latestTransactions: enrichedTransactions.slice(0, 5),
        monthProjectionNet,
        yearEndProjection,
      });

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

  return {
    currencySummaries,
    familyCurrencySummaries,
    recentTransactions,
    accounts,
    creditCards,
    creditCardBills,
    accountBalances,
    accountCurrencyMap,
    loading,
    homeSummary,
  };
}
