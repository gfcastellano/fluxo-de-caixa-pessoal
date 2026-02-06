import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { usePageModal } from '../hooks/usePageModal';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { AccountModal } from '../components/AccountModal';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  setDefaultAccount,
  calculateAccountBalance,
} from '../services/accountService';
import { formatDate } from '../utils/format';
import type { Account } from '../types';
import { Edit2, Trash2, Star, Wallet } from 'lucide-react';
import { cn } from '../utils/cn';

export function Accounts() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  /* New state for highlighting */
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

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
      const data = await getAccounts(user!.uid);
      setAccounts(data);

      const balances: Record<string, number> = {};
      for (const account of data) {
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
          color: accountData.color,
        });

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
    <div className="space-y-6">
      {/* Header - no add button, Hero handles it */}
      <div className="flex items-center">
        <h1 className="text-2xl font-bold text-neutral-900">{t('accounts.title')}</h1>
      </div>

      <AccountModal
        isOpen={modal.isOpen}
        onClose={modal.close}
        account={modal.editingItem}
        onSave={handleSave}
        userId={user?.uid || ''}
        autoStartRecording={modal.autoStartRecording}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Wallet className="mx-auto h-12 w-12 text-neutral-400" />
                  <p className="mt-4 text-neutral-500">{t('accounts.noAccounts')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          accounts.map((account) => (
            <Card
              key={account.id}
              className={cn(
                "transition-all duration-1000",
                account.isDefault ? 'ring-2 ring-primary-500' : '',
                highlightedId === account.id ? "animate-highlight scale-[1.02]" : ""
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        backgroundColor: account.color ? `${account.color}20` : '#EEF2FF',
                      }}
                    >
                      <Wallet
                        className="h-5 w-5"
                        style={{ color: account.color || '#4F46E5' }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base text-neutral-900">{account.name}</CardTitle>
                      <p className="text-sm text-neutral-500">{account.currency}</p>
                    </div>
                  </div>
                  {account.isDefault && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      {t('accounts.default')}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-neutral-500">{t('accounts.currentBalance')}</p>
                  <p className={`text-2xl font-bold ${(accountBalances[account.id] ?? account.balance) >= 0 ? 'text-neutral-900' : 'text-red-600'}`}>
                    {formatCurrency(accountBalances[account.id] ?? account.balance, account.currency)}
                  </p>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-neutral-500">{t('accounts.initialBalanceDate')}</p>
                  <p className="text-sm font-medium text-neutral-700">
                    {account.balanceDate ? formatDate(account.balanceDate) : '-'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!account.isDefault && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSetDefault(account.id)}
                      leftIcon={<Star className="h-3 w-3 flex-shrink-0" />}
                    >
                      {t('accounts.setDefault')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => modal.openEdit(account)}
                    leftIcon={<Edit2 className="h-3 w-3 flex-shrink-0" />}
                  >
                    {t('common.edit')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(account.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    leftIcon={<Trash2 className="h-3 w-3 flex-shrink-0" />}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
