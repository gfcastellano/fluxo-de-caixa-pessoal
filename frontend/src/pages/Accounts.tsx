import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  setDefaultAccount,
} from '../services/accountService';
import type { Account } from '../types';
import { Plus, Edit2, Trash2, X, Check, Star, Wallet } from 'lucide-react';

const CURRENCIES = [
  { code: 'BRL', name: 'Real Brasileiro' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
];

export function Accounts() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    currency: 'BRL',
    initialBalance: 0,
    isDefault: false,
  });

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
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingId) {
        await updateAccount(editingId, {
          name: formData.name,
          currency: formData.currency,
        });
      } else {
        await createAccount({
          userId: user.uid,
          name: formData.name,
          currency: formData.currency,
          balance: formData.initialBalance,
          initialBalance: formData.initialBalance,
          isDefault: formData.isDefault,
        });
      }
      await loadAccounts();
      resetForm();
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

  const startEdit = (account: Account) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      currency: account.currency,
      initialBalance: account.initialBalance,
      isDefault: account.isDefault,
    });
    setIsAdding(true);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', currency: 'BRL', initialBalance: 0, isDefault: false });
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('accounts.title')}</h1>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('accounts.addNew')}
          </Button>
        )}
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? t('accounts.editAccount') : t('accounts.addNew')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t('accounts.form.name')}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('accounts.form.currency')}
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>
              {!editingId && (
                <Input
                  label={t('accounts.form.initialBalance')}
                  type="number"
                  step="0.01"
                  value={formData.initialBalance}
                  onChange={(e) =>
                    setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700">
                  {t('accounts.form.setAsDefault')}
                </label>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  <Check className="mr-2 h-4 w-4" />
                  {editingId ? t('common.update') : t('common.create')}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  <X className="mr-2 h-4 w-4" />
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Wallet className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-4 text-gray-500">{t('accounts.noAccounts')}</p>
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
                      <CardTitle className="text-base">{account.name}</CardTitle>
                      <p className="text-sm text-gray-500">{account.currency}</p>
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
                  <p className="text-sm text-gray-500">{t('accounts.currentBalance')}</p>
                  <p className={`text-2xl font-bold ${account.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                    {formatCurrency(account.balance, account.currency)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!account.isDefault && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSetDefault(account.id)}
                    >
                      <Star className="mr-1 h-3 w-3" />
                      {t('accounts.setDefault')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(account)}
                  >
                    <Edit2 className="mr-1 h-3 w-3" />
                    {t('common.edit')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(account.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
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
