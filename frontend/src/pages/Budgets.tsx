import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { BudgetModal } from '../components/BudgetModal';
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
import { Plus, Edit2, Trash2 } from 'lucide-react';
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
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

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

  const handleSave = async (budgetData: Partial<Budget>) => {
    if (!user) return;

    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, budgetData);
      } else {
        await createBudget(user.uid, budgetData as Omit<Budget, 'id' | 'userId' | 'createdAt'>);
      }
      await loadData();
      handleCloseModal();
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

  const handleOpenModal = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget);
    } else {
      setEditingBudget(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? t(getTranslatedCategoryName(category.name)) : 'Unknown';
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.color || '#999999';
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
        <h1 className="text-2xl font-bold text-gray-900">{t('budgets.title')}</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          {t('budgets.addNew')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgets.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="text-center py-8">
              <p className="text-gray-500">{t('budgets.noBudgets')}</p>
              <Button onClick={() => handleOpenModal()} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                {t('budgets.addNew')}
              </Button>
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
                      onClick={() => handleOpenModal(budget)}
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

      {/* Budget Modal */}
      <BudgetModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        budget={editingBudget}
        categories={categories}
        onSave={handleSave}
        userId={user?.uid || ''}
      />
    </div>
  );
}
