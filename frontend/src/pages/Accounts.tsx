import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
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
import type { Account } from '../types';
import { Plus, Edit2, Trash2, Star, Wallet } from 'lucide-react';

export function Accounts() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

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
      
      // Calculate balances for all accounts
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
      if (editingAccount) {
        await updateAccount(editingAccount.id, {
          name: accountData.name,
          currency: accountData.currency,
          balance: accountData.balance,
          balanceDate: new Date().toISOString().split('T')[0],
        });
      } else {
        await createAccount({
          userId: user.uid,
          name: accountData.name!,
          currency: accountData.currency!,
          balance: accountData.initialBalance || 0,
          initialBalance: accountData.initialBalance || 0,
          balanceDate: new Date().toISOString().split('T')[0],
          isDefault: accountData.isDefault || false,
        });
      }
      await loadAccounts();
      handleCloseModal();
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

  const handleOpenModal = (account?: Account) => {
    setEditingAccount(account || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-neutral-900">{t('accounts.title')}</h1>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto whitespace-nowrap" leftIcon={<Plus className="h-4 w-4 flex-shrink-0" />}>
          {t('accounts.addNew')}
        </Button>
      </div>

      <AccountModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        account={editingAccount}
        onSave={handleSave}
        userId={user?.uid || ''}
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
            <Card key={account.id} className={account.isDefault ? 'ring-2 ring-primary-500' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Wallet className="h-5 w-5 text-primary-600" />
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
                    onClick={() => handleOpenModal(account)}
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
