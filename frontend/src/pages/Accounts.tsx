import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { usePageModal } from '../hooks/usePageModal';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { AccountModal } from '../components/AccountModal';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  setDefaultAccount,
  calculateAccountBalance,
} from '../services/accountService';
import { getCreditCards } from '../services/creditCardService';
import { formatDate } from '../utils/format';
import { getCreditCardBills } from '../services/creditCardBillService';
import type { Account, CreditCard, CreditCardBill } from '../types';
import { Edit2, Trash2, Star, Wallet, Banknote, DollarSign, Euro, PoundSterling, JapaneseYen, SwissFranc, ChevronDown, ChevronUp, CreditCard as CreditCardIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { PageDescription } from '../components/PageDescription';

import { CashCurrencyIcon } from '../components/CashCurrencyIcon';
import { useFamily } from '../context/FamilyContext';
import { SharedDataBadge } from '../components/SharedDataBadge';

export function Accounts() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { viewMode, sharedData, getMemberPhoto } = useFamily();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [cardBillAmounts, setCardBillAmounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  /* New state for highlighting */
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Collapsible state for cash accounts on mobile
  const [isCashExpanded, setIsCashExpanded] = useState(false);

  // Use the new consolidated page modal hook
  const modal = usePageModal<Account>();

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const [accountsData, creditCardsData, billsData] = await Promise.all([
        getAccounts(user!.uid),
        getCreditCards(user!.uid),
        getCreditCardBills(user!.uid)
      ]);
      // Cash accounts are auto-created by backend POST /accounts

      const sortedData = accountsData.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
      setAccounts(sortedData);
      setCreditCards(creditCardsData);

      // Map card bill amounts (current open bills)
      const billAmounts: Record<string, number> = {};
      billsData.forEach(bill => {
        if (!bill.isClosed && !bill.isPaid) {
          billAmounts[bill.creditCardId] = (billAmounts[bill.creditCardId] || 0) + bill.totalAmount;
        }
      });
      setCardBillAmounts(billAmounts);

      const balances: Record<string, number> = {};
      for (const account of accountsData) {
        const calculatedBalance = await calculateAccountBalance(account.id, user!.uid);
        balances[account.id] = calculatedBalance;
      }
      setAccountBalances(balances);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (accountData: Partial<Account>) => {
    if (!user) return;

    try {
      if (modal.editingItem) {
        await updateAccount(modal.editingItem.id, {
          name: accountData.name,
          currency: accountData.currency,
          balance: accountData.balance,
          balanceDate: new Date().toISOString().split('T')[0],
          color: accountData.color,
        });
      } else {
        const newAccount = await createAccount({
          userId: user.uid,
          name: accountData.name!,
          currency: accountData.currency!,
          balance: accountData.initialBalance || 0,
          initialBalance: accountData.initialBalance || 0,
          balanceDate: new Date().toISOString().split('T')[0],
          isDefault: accountData.isDefault || false,
          isCash: false,
          color: accountData.color,
        });
        // Cash account is auto-created by backend POST /accounts

        // Highlight logic
        setHighlightedId(newAccount.id);
        setTimeout(() => setHighlightedId(null), 5000);
      }
      await loadAccounts();
      modal.close();
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm(t('accounts.deleteConfirm'))) return;

    try {
      await deleteAccount(accountId);
      await loadAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const handleSetDefault = async (accountId: string) => {
    if (!user) return;

    try {
      await setDefaultAccount(accountId, user.uid);
      await loadAccounts();
    } catch (error) {
      console.error('Error setting default account:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height)-var(--dock-height))] sm:h-auto sm:min-h-0 sm:gap-6 gap-4 sm:p-6 p-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg sm:text-2xl font-bold text-ink">{t('accounts.title')}</h1>
        <PageDescription pageKey="accounts" />
      </div>

      <AccountModal
        isOpen={modal.isOpen}
        onClose={modal.close}
        account={modal.editingItem}
        onSave={handleSave}
        userId={user?.uid || ''}
        autoStartRecording={modal.autoStartRecording}
      />

      {accounts.length === 0 ? (
        <Card className="bg-white/40 backdrop-blur-xl border-white/60">
          <CardContent className="py-8 sm:py-12">
            <div className="text-center">
              <Wallet className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-neutral-400" />
              <p className="mt-2 sm:mt-4 text-sm sm:text-base text-neutral-500">{t('accounts.noAccounts')}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-4 sm:gap-5 px-1 py-1 -mx-1 -my-1">
          {/* Cash accounts - collapsible on mobile, always visible on lg+ */}
          <div className="w-full">
            <button
              onClick={() => setIsCashExpanded(!isCashExpanded)}
              className="lg:hidden flex items-center justify-between w-full gap-2 mb-2.5 p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-600" />
                <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{t('accounts.cashBadge')}</h2>
              </div>
              {isCashExpanded ? (
                <ChevronUp className="h-4 w-4 text-neutral-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              )}
            </button>
            <div className="hidden lg:flex items-center gap-2 mb-2.5">
              <Banknote className="h-4 w-4 text-green-600" />
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{t('accounts.cashBadge')}</h2>
            </div>
            <div className={cn(
              "grid grid-cols-1 sm:grid-cols-3 gap-2 lg:grid",
              isCashExpanded ? "grid" : "hidden lg:grid"
            )}>
              {accounts.filter(a => a.isCash).map((account) => (
                <Card
                  key={account.id}
                  className={cn(
                    "transition-all duration-1000 bg-gradient-to-r from-green-50/80 to-emerald-50/60 backdrop-blur-xl border-green-200/60",
                    highlightedId === account.id ? "animate-highlight scale-[1.02]" : ""
                  )}
                >
                  <div className="p-3 sm:p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${account.color || '#16a34a'}18` }}
                        >
                          <CashCurrencyIcon
                            currency={account.currency}
                            className="h-4 w-4"
                            style={{ color: account.color || '#16a34a' }}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-neutral-600">{account.currency}</p>
                          <p className={`text-sm font-bold ${(accountBalances[account.id] ?? account.balance) >= 0 ? 'text-neutral-900' : 'text-red-600'}`}>
                            {formatCurrency(accountBalances[account.id] ?? account.balance, account.currency)}
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            {t('accounts.form.initialBalance')}: {formatCurrency(account.initialBalance ?? 0, account.currency)}
                            {account.balanceDate ? ` · ${formatDate(account.balanceDate)}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => modal.openEdit(account)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-white/60 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Digital/Bank accounts */}
          <div className="w-full min-h-0 overflow-y-auto sm:overflow-visible px-1 py-1 -mx-1 -my-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 pb-4 sm:pb-0">
              {accounts.filter(a => !a.isCash).map((account) => (
                <Card
                  key={account.id}
                  className={cn(
                    "transition-all duration-1000 bg-white/40 backdrop-blur-xl border-white/60",
                    account.isDefault ? 'ring-2 ring-primary-500' : '',
                    highlightedId === account.id ? "animate-highlight scale-[1.02]" : ""
                  )}
                >
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="p-1.5 rounded-lg flex-shrink-0"
                          style={{
                            backgroundColor: account.color ? `${account.color}20` : '#EEF2FF',
                          }}
                        >
                          <Wallet
                            className="h-4 w-4"
                            style={{ color: account.color || '#4F46E5' }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate">{account.name}</p>
                          <p className="text-[11px] text-neutral-400">{account.currency}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {account.isDefault && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary-100 text-primary-800">
                            <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                            {t('accounts.default')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-2">
                      <p className={`text-lg sm:text-xl font-bold truncate ${(accountBalances[account.id] ?? account.balance) >= 0 ? 'text-neutral-900' : 'text-red-600'}`}>
                        {formatCurrency(accountBalances[account.id] ?? account.balance, account.currency)}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-[10px] text-neutral-400">
                          {t('accounts.form.initialBalance')}: {formatCurrency(account.initialBalance ?? account.balance, account.currency)}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {account.balanceDate ? formatDate(account.balanceDate) : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 pt-1 border-t border-neutral-100">
                      {!account.isDefault && (
                        <button
                          onClick={() => handleSetDefault(account.id)}
                          className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-primary-600 px-1.5 py-1 rounded hover:bg-primary-50 transition-colors"
                        >
                          <Star className="h-3 w-3" />
                          {t('accounts.setDefault')}
                        </button>
                      )}
                      <button
                        onClick={() => modal.openEdit(account)}
                        className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-700 px-1.5 py-1 rounded hover:bg-neutral-100 transition-colors"
                      >
                        <Edit2 className="h-3 w-3" />
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 px-1.5 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t('common.delete')}
                      </button>
                    </div>

                    {/* Credit Cards - Mini Cards Style */}
                    {creditCards.filter(card => card.linkedAccountId === account.id).length > 0 && (
                      <div className="mt-3 flex flex-col items-end gap-2">
                        {creditCards
                          .filter(card => card.linkedAccountId === account.id)
                          .map(card => (
                            <div
                              key={card.id}
                              className="relative w-36 h-20 rounded-xl p-3 shadow-sm flex flex-col justify-between overflow-hidden transition-transform hover:scale-105"
                              style={{ backgroundColor: card.color || '#3b82f6' }}
                            >
                              {/* Decorator */}
                              <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
                              <div className="absolute bottom-0 left-0 w-12 h-12 bg-black/10 rounded-full -ml-6 -mb-6 blur-lg"></div>

                              <div className="relative z-10 flex justify-between items-start">
                                <CreditCardIcon className="text-white/80 w-3.5 h-3.5" />
                              </div>

                              <div className="relative z-10 text-right">
                                <p className="text-white font-semibold text-[10px] truncate mb-0.5">{card.name}</p>
                                <div className="space-y-0.5">
                                  <p className="text-white/90 text-[9px] font-medium tracking-wide">
                                    {t('creditCards.bill')}: {formatCurrency(cardBillAmounts[card.id] || 0, account.currency)}
                                  </p>
                                  <p className="text-white/70 text-[8px] font-medium tracking-wide uppercase">
                                    {t('creditCards.limit')}: {formatCurrency(card.creditLimit, account.currency)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Family Shared Accounts */}
      {viewMode === 'family' && sharedData.some(m => m.accounts && m.accounts.length > 0) && (
        <div className="mt-4">
          <Card className="bg-violet-50/40 backdrop-blur-xl border-violet-200/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-violet-700 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                {t('family.shared.accounts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {sharedData.map(member =>
                  member.accounts?.map(acc => (
                    <div key={`${member.ownerUserId}-${acc.id}`} className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-violet-100/50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <Wallet size={16} className="text-violet-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{acc.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-slate">{acc.currency}</span>
                            <SharedDataBadge ownerName={(acc.ownerName || '').split(' ')[0]} photoURL={getMemberPhoto(acc.ownerUserId)} />
                          </div>
                        </div>
                      </div>
                      {acc.balance !== undefined && (
                        <p className={`text-base font-bold tabular-nums ${acc.balance >= 0 ? 'text-ink' : 'text-red-600'}`}>
                          {formatCurrency(acc.balance, acc.currency)}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
