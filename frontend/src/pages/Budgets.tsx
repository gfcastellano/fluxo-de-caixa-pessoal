import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetStatus,
} from '../services/budgetService';
import { getCategories } from '../services/categoryService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import type { Budget, Category, BudgetStatus } from '../types';
import { formatCurrency } from '../utils/format';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { getCurrentMonth } from '../utils/format';

export function Budgets() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetStatuses, setBudgetStatuses] = useState<Map<string, BudgetStatus>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    period: 'monthly' as 'monthly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [budgetsData, categoriesData] = await Promise.all([
        getBudgets(user!.uid),
        getCategories(user!.uid),
      ]);
      setBudgets(budgetsData);
      setCategories(categoriesData);

      // Load budget statuses
      const { year, month } = getCurrentMonth();
      const statusMap = new Map<string, BudgetStatus>();
      for (const budget of budgetsData) {
        const status = await getBudgetStatus(budget, year, month);
        statusMap.set(budget.id, status);
      }
      setBudgetStatuses(statusMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (editingId) {
        await updateBudget(editingId, data);
      } else {
        await createBudget(user.uid, data);
      }
      await loadData();
      resetForm();
    } catch (error) {
      console.error('Error saving budget:', error);
    }
  };

  const handleDelete = async (budgetId: string) => {
    if (!confirm(t('budgets.deleteConfirm'))) return;

    try {
      await deleteBudget(budgetId);
      await loadData();
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  const startEdit = (budget: Budget) => {
    setEditingId(budget.id);
    setFormData({
      categoryId: budget.categoryId,
      amount: budget.amount.toString(),
      period: budget.period,
      startDate: budget.startDate.split('T')[0],
    });
    setIsAdding(true);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      categoryId: '',
      amount: '',
      period: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
    });
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? t(getTranslatedCategoryName(category.name)) : 'Unknown';
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.color || '#999999';
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');

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
        <h1 className="text-2xl font-bold text-gray-900">{t('budgets.title')}</h1>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('budgets.addNew')}
          </Button>
        )}
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? t('budgets.editBudget') : t('budgets.addNew')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('common.category')}
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">{t('budgets.form.selectCategory')}</option>
                    {expenseCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {t(getTranslatedCategoryName(category.name))}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label={t('budgets.form.amount')}
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('budgets.form.period')}
                  </label>
                  <select
                    value={formData.period}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        period: e.target.value as 'monthly' | 'yearly',
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="monthly">{t('budgets.period.monthly')}</option>
                    <option value="yearly">{t('budgets.period.yearly')}</option>
                  </select>
                </div>
                <Input
                  label={t('budgets.form.startDate')}
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgets.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="text-center py-8">
              <p className="text-gray-500">{t('budgets.noBudgets')}</p>
            </CardContent>
          </Card>
        ) : (
          budgets.map((budget) => {
            const status = budgetStatuses.get(budget.id);
            const percentage = status?.percentage || 0;
            const isOverBudget = status?.isOverBudget || false;

            return (
              <Card key={budget.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getCategoryColor(budget.categoryId) }}
                    />
                    <CardTitle className="text-lg">
                      {getCategoryName(budget.categoryId)}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(budget)}
                      className="p-2 text-gray-600 hover:bg-gray-200 rounded-md"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-md"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {t('budgets.spent')}: {formatCurrency(status?.spent || 0)}
                      </span>
                      <span className="text-gray-600">
                        {t('budgets.form.amount')}: {formatCurrency(budget.amount)}
                      </span>
                    </div>
                    <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`absolute top-0 left-0 h-full transition-all ${
                          isOverBudget ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span
                        className={`font-medium ${
                          isOverBudget ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {percentage.toFixed(1)}% {t('budgets.spent').toLowerCase()}
                      </span>
                      <span className="text-gray-600">
                        {t('budgets.remaining')}: {formatCurrency(status?.remaining || 0)}
                      </span>
                    </div>
                    {isOverBudget && (
                      <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {t('budgets.overBudget')} {formatCurrency(Math.abs(status?.remaining || 0))}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
